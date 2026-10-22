/*
 *
 * Headwind MDM: Open Source Android MDM Software
 * https://h-mdm.com
 *
 * Copyright (C) 2019 Headwind Solutions LLC (http://h-sms.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

package com.hmdm.rest.resource;

import com.google.inject.Inject;
import com.google.inject.Singleton;
import jakarta.inject.Named;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.net.URLDecoder;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.hmdm.notification.rest.NotificationResource;
import com.hmdm.persistence.ApplicationDAO;
import com.hmdm.rest.filter.PublicIPFilter;
import com.hmdm.rest.json.Response;
import com.hmdm.util.CryptoUtil;
import org.apache.poi.util.IOUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class DownloadFilesServlet extends HttpServlet {
    private final ApplicationDAO applicationDAO;
    private final String filesDirectory;
    private final File baseDirectory;
    private final PublicIPFilter publicIPFilter;

    private boolean secureEnrollment;
    private String hashSecret;

    private static final String HEADER_ENROLLMENT_SIGNATURE = "X-Request-Signature";
    private static final String CONTENT_TYPE_APK = "application/vnd.android.package-archive";

    private static final Logger log = LoggerFactory.getLogger(DownloadFilesServlet.class);

    @Inject
    public DownloadFilesServlet(ApplicationDAO applicationDAO,
                                PublicIPFilter publicIPFilter,
                                @Named("files.directory") String filesDirectory,
                                @Named("secure.enrollment") boolean secureEnrollment,
                                @Named("hash.secret") String hashSecret) {
        this.applicationDAO = applicationDAO;
        this.filesDirectory = filesDirectory;
        this.baseDirectory = new File(filesDirectory);
        this.publicIPFilter = publicIPFilter;
        this.secureEnrollment = secureEnrollment;
        this.hashSecret = hashSecret;
        if (!this.baseDirectory.exists()) {
            this.baseDirectory.mkdirs();
        }

    }

    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String path = URLDecoder.decode(req.getRequestURI(), "UTF8");
        int index = path.indexOf("/files/", 0) + "/files/".length();
        path = path.substring(index);

        if (!publicIPFilter.match(req)) {
            log.warn("Request blocked by IP: " + req.getRemoteAddr());
            resp.sendError(403);
            return;
        }

        if (secureEnrollment && !applicationDAO.isMainApp("%" + path)) {
            String signature = req.getHeader(HEADER_ENROLLMENT_SIGNATURE);
            if (signature == null) {
                log.warn("No signature for file request " + req.getRequestURL().toString());
                resp.sendError(403);
                return;
            }
            try {
                String goodSignature = CryptoUtil.getSHA1String(hashSecret + path);
                if (!signature.equalsIgnoreCase(goodSignature)) {
                    log.warn("Wrong signature for file request " + path + ": " + signature + " Should be: " + goodSignature);
                    resp.sendError(403);
                    return;
                }
            } catch (Exception e) {
            }
        }

        File file = new File(String.format("%s/%s", this.filesDirectory, path));
        if (file.exists()) {

            long modifiedSince = req.getDateHeader("If-Modified-Since");
            if (modifiedSince != -1 && modifiedSince > file.lastModified()) {
                // Client can use cached images
                resp.setStatus(304);
                return;
            }

            // Cross XSS vulnerability fix: prevent opening a potentially malicious file having the Headwind MDM domain
            // (set before the Range check so partial responses carry it too)
            resp.addHeader("Content-Disposition", "attachment; filename=\"" + file.getName() + "\"");

            String range = req.getHeader("Range");
            if (range != null && range.startsWith("bytes=") && sendPartialContent(range.substring(6), file, resp)) {
                return;
            }

            try (InputStream input = new FileInputStream(file);
                 ServletOutputStream outputStream = resp.getOutputStream()) {
                long length = file.length();
                if (length <= 2147483647L) {
                    resp.setContentLength((int)length);
                } else {
                    resp.addHeader("Content-Length", Long.toString(length));
                }
                if (file.getAbsolutePath().endsWith(".apk")) {
                    resp.setContentType(CONTENT_TYPE_APK);
                }

                IOUtils.copy(input, outputStream);
                outputStream.flush();
            } catch (Exception e) {
                e.printStackTrace();
            }
        } else {
            System.out.println("Not found: " + file.getAbsolutePath());
            resp.sendError(404);
        }

    }

    /**
     * Sends a single byte range ("first-last", "first-" or "-suffixLength"; positions are inclusive).
     *
     * @return false if the range can't be parsed or lists several ranges: the caller then sends the
     * whole file, which HTTP allows. True if a response has been sent (206, or 416 for a range
     * outside the file).
     */
    private boolean sendPartialContent(String rangeStr, File file, HttpServletResponse resp) {
        long length = file.length();
        long start;
        long end;
        try {
            if (rangeStr.contains(",")) {
                return false;
            }
            int dash = rangeStr.indexOf('-');
            if (dash < 0) {
                return false;
            }
            String first = rangeStr.substring(0, dash).trim();
            String last = rangeStr.substring(dash + 1).trim();
            if (first.isEmpty()) {
                // Suffix range: the last N bytes of the file
                long suffixLength = Long.parseLong(last);
                if (suffixLength <= 0) {
                    return sendRangeNotSatisfiable(length, resp);
                }
                start = Math.max(0, length - suffixLength);
                end = length - 1;
            } else {
                start = Long.parseLong(first);
                long lastPos = last.isEmpty() ? Long.MAX_VALUE : Long.parseLong(last);
                if (start < 0 || lastPos < start) {
                    // Not a valid range ("5-4"): ignored, like an unparsable one
                    return false;
                }
                end = Math.min(lastPos, length - 1);
            }
        } catch (NumberFormatException e) {
            return false;
        }

        if (start >= length) {
            return sendRangeNotSatisfiable(length, resp);
        }

        long contentLength = end - start + 1;
        resp.setStatus(206);
        resp.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + length);
        resp.setContentLengthLong(contentLength);
        if (file.getAbsolutePath().endsWith(".apk")) {
            resp.setContentType(CONTENT_TYPE_APK);
        }

        try (RandomAccessFile input = new RandomAccessFile(file, "r")) {
            input.seek(start);
            ServletOutputStream outputStream = resp.getOutputStream();
            byte[] buffer = new byte[65536];
            long remaining = contentLength;
            while (remaining > 0) {
                int read = input.read(buffer, 0, (int) Math.min(buffer.length, remaining));
                if (read < 0) {
                    break;
                }
                outputStream.write(buffer, 0, read);
                remaining -= read;
            }
            outputStream.flush();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return true;
    }

    private boolean sendRangeNotSatisfiable(long length, HttpServletResponse resp) {
        resp.setStatus(416);
        resp.setHeader("Content-Range", "bytes */" + length);
        resp.setContentLength(0);
        return true;
    }
}
