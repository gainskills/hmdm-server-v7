import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SwUpdate } from '@angular/service-worker';
import { ConfirmDialog } from 'hmdm-ui-kit';
import { interval, Observable } from 'rxjs';
import { filter, map, switchMap, take, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { THttpResponse } from '../types/http-response.type';

const VERSION_CHECK_INTERVAL: number = 90000; // 1.5 min;

@Injectable({
  providedIn: 'root',
})
export class VersionCheckerService {
  private version: string = environment.version;
  private dialog: MatDialog = inject(MatDialog);
  private userPreventedReload: boolean = false;

  constructor(
    private http: HttpClient,
    private swUpdate: SwUpdate,
  ) {}

  triggerFirstCheck(): void {
    this.checkVersion()
      .pipe(
        tap((res: { version: string }) => {
          console.log('Checked version:', res.version, 'Current version:', this.version);
          if (res?.version && this.version !== res?.version && !this.userPreventedReload) {
            this.version = res.version;
            this.clearCache();
            this.showPopup();
          }
        }),
        take(1),
      )
      .subscribe();
  }

  public startChecking(): void {
    this.triggerFirstCheck();
    interval(VERSION_CHECK_INTERVAL)
      .pipe(
        switchMap(() => this.checkVersion()),
        tap((res: { version: string }) => {
          console.log('Checked version:', res.version, 'Current version:', this.version);

          if (res?.version && this.version !== res?.version && !this.userPreventedReload) {
            this.version = res.version;
            this.clearCache();
            sessionStorage.clear();
            this.showPopup();
          }
        }),
      )
      .subscribe();
  }

  public showPopup(): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          message: 'cache.messageOutdated',
          confirmButtonText: 'cache.reload',
        },
      })
      .afterClosed()
      .pipe(
        take(1),
        tap((res) => {
          if (!res) {
            this.userPreventedReload = true;
          }
        }),
        filter(Boolean),
      )
      .subscribe(() => {
        window.location.href = location.href;
        window.location.reload();
      });
  }

  private checkVersion(): Observable<any> {
    return this.http
      .get<THttpResponse<{ version: string }>>('rest/public/about')
      .pipe(map((res: THttpResponse<{ version: string }>) => res.data));
  }

  private clearCache(): void {
    if (!this.swUpdate.isEnabled) {
      return;
    }
    this.swUpdate.checkForUpdate().then(() => {
      if ('caches' in window) {
        caches.keys().then((cacheNames: string[]) => {
          cacheNames.forEach((cacheName: string) => {
            caches.delete(cacheName);
          });
        });
      }
    });
  }
}
