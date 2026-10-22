import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from 'hmdm-ui-kit';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { THttpResponse } from '../types/http-response.type';
import { QrDialog } from '../components/qr-dialog/qr-dialog';
import { QrJsonDialog } from '../components/qr-json-dialog/qr-json-dialog';
import { environment } from '../../../environments/environment';
import { QrHelpDialog } from '../components/qr-help-dialog/qr-help-dialog';
import { QrService } from '../../entity/qr/services/qr.service';

export type TBuildQrCodeUrlParams = {
  qrCodeKey: string;
  deviceId?: string | null;
  params?: TQrCodeParams;
};

export type TQrCodeParams = {
  deviceId?: string;
  useId?: string;
  create?: boolean;
  groups?: number[];
};

export interface QrCodeData {
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class QrFacadeService {
  private readonly qrService = inject(QrService);
  private readonly dialog: MatDialog = inject(MatDialog);

  openQrCodeDialog(data: TBuildQrCodeUrlParams): void {
    this.dialog.open(QrDialog, {
      data,
    });
  }

  openHelpDialog(): void {
    this.dialog.open(QrHelpDialog);
  }

  openQrJsonDialog(data: TQrCodeParams & { qrCodeKey: string }): void {
    this.dialog.open(QrJsonDialog, { data, minWidth: '500px' });
  }

  calculateOptimalSize(): number {
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const smallestDimension = Math.floor(Math.min(windowWidth, windowHeight));
    const minSizeByHeight = windowHeight - 400;
    const minSizeByWidth = windowWidth < 816 ? smallestDimension - 420 : smallestDimension - 220;
    const optimalSize = Math.min(550, minSizeByHeight, minSizeByWidth);

    return Math.max(256, optimalSize);
  }

  fetchQrCodeJson(qrCodeKey: string, params?: TQrCodeParams): Observable<QrCodeData> {
    const urlParams = this.buildUrlParams(params || {});
    const url = `rest/public/qr/json/${qrCodeKey}?${urlParams}`;

    return this.qrService.fetchQrCodeParams(url);
  }

  buildQrCodeUrl(opts: {
    qrCodeKey: string;
    deviceId: string | null;
    params: TQrCodeParams;
  }): string {
    console.log(opts);

    const baseApiUrl = environment.baseApiUrl;
    const size = this.calculateOptimalSize();
    let url = `rest/public/qr/${opts.qrCodeKey}?size=${size}`;

    if (opts.deviceId) {
      url += `&deviceId=${opts.deviceId}`;
    }

    url += this.buildUrlParams(opts.params);

    // A new address every time: browsers reuse an image already loaded at the same address
    // while the page is open, whatever the cache headers say, and would show an outdated QR code
    url += `&t=${Date.now()}`;

    return `${baseApiUrl}${url}`;
  }

  private buildUrlParams(params: TQrCodeParams): string {
    let urlParams = '';

    if (params.deviceId) {
      urlParams += `&deviceId=${params.deviceId}`;
    }

    if (params.useId) {
      urlParams += `&useId=${params.useId}`;
    }

    if (params.create) {
      urlParams += '&create=1';

      if (params.groups && params.groups.length > 0) {
        params.groups.forEach((groupId) => {
          urlParams += `&group=${encodeURIComponent(groupId)}`;
        });
      }
    }

    return urlParams;
  }
}
