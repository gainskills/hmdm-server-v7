/*
 * Headwind MDM: Open Source Android MDM Software
 * https://h-mdm.com
 *
 * Copyright (C) 2019 Headwind Solutions LLC (http://h-sms.com)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.hmdm.rest.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * <p>Hides the web panel from addresses that are not listed in ui.allowed.address.</p>
 *
 * <p>PrivateIPFilter only guards the panel's API after login (/rest/private/*). This filter covers
 * what is left visible to everyone:</p>
 * <ul>
 *     <li>the panel's pages and static files, the plugin screens and the alerts websocket (/ws/) -
 *     a blocked address gets an empty HTML page instead;</li>
 *     <li>the panel-only public endpoints (login, JWT login, password recovery, signup) - a blocked
 *     address gets an empty 403.</li>
 * </ul>
 *
 * <p>Device traffic is never touched: everything else under /rest/ (sync, push, long polling, plugin
 * endpoints used by the agent) and /files/ (APK and file downloads) passes through unchanged and
 * stays under device.allowed.address as before.</p>
 *
 * <p>Registered in web.xml ahead of SpaFilter, which forwards the panel's page addresses to index.html
 * before the Guice filters run. The settings are read from the same context parameters ConfigureModule
 * uses. When ui.allowed.address is empty, this filter does nothing.</p>
 */
public class PanelUIIPFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(PanelUIIPFilter.class);

    private static final byte[] EMPTY_PAGE =
            "<!DOCTYPE html><html><head></head><body></body></html>".getBytes(StandardCharsets.UTF_8);

    // Paths used by devices; passed through unless listed in PANEL_ONLY_REST_PATHS
    private static final String[] DEVICE_PATHS = {
            "/rest/",
            "/files/"
    };

    // Panel-only endpoints under /rest/public/ (otherwise reachable from any address)
    private static final String[] PANEL_ONLY_REST_PATHS = {
            "/rest/public/auth/",
            "/rest/public/jwt/",
            "/rest/public/passwordReset/",
            "/rest/public/signup/"
    };

    private BaseIPFilter filter;

    public void init(FilterConfig filterConfig) throws ServletException {
        ServletContext context = filterConfig.getServletContext();
        String whitelist = getParameter(context, "ui.allowed.address");
        if (!whitelist.equals("")) {
            filter = new BaseIPFilter(whitelist,
                    getParameter(context, "proxy.addresses"),
                    getParameter(context, "proxy.ip.header"));
        }
    }

    public void destroy() {
    }

    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        if (filter == null) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        String path = getPath(request);

        boolean panelOnlyRest = startsWithAny(path, PANEL_ONLY_REST_PATHS);
        if (!panelOnlyRest && startsWithAny(path, DEVICE_PATHS)) {
            // Device traffic: not our business
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        if (filter.match(request)) {
            filterChain.doFilter(servletRequest, servletResponse);
            return;
        }

        logger.info("Web panel request blocked by IP: " + filter.getRemoteAddr(request) + " " + path);
        response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        response.setHeader("Pragma", "no-cache");
        response.setDateHeader("Expires", 0);
        if (panelOnlyRest) {
            // setStatus() rather than sendError() so the container's error page isn't shown
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentLength(0);
        } else {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("text/html;charset=UTF-8");
            response.setContentLength(EMPTY_PAGE.length);
            if (!"HEAD".equalsIgnoreCase(request.getMethod())) {
                response.getOutputStream().write(EMPTY_PAGE);
            }
        }
    }

    private static String getParameter(ServletContext context, String name) {
        String value = context.getInitParameter(name);
        return value != null ? value : "";
    }

    // The path inside the web application, as decoded and normalized by the container
    // (so tricks like /rest/%2e%2e/index.html resolve to /index.html before they are checked).
    // getRequestURI() is deliberately not used: it is the raw, undecoded URI.
    private static String getPath(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        String pathInfo = request.getPathInfo();
        String path = (servletPath != null ? servletPath : "") + (pathInfo != null ? pathInfo : "");
        return path.isEmpty() ? "/" : path;
    }

    private static boolean startsWithAny(String path, String[] prefixes) {
        for (String prefix : prefixes) {
            if (path.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }
}
