import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  APP_INITIALIZER,
  ApplicationConfig,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  ConfigurationsOptionsService,
  FileDownloadService,
  GlobalLoadingService,
  GroupsOptionsService,
  RebrandingService,
} from 'hmdm-ui-kit';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { baseUrlInterceptor } from './shared/interceptors/base-url.interceptor';
import { credentialsInterceptor } from './shared/interceptors/credentials.interceptor';
import { responseAlertInterceptor } from './shared/interceptors/response-alert.interceptor';
import { responseInterceptor } from './shared/interceptors/response.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        baseUrlInterceptor,
        credentialsInterceptor,
        responseInterceptor,
        responseAlertInterceptor,
      ]),
    ),
    provideNativeDateAdapter(),
    provideEnvironmentNgxMask(),
    provideCharts(withDefaultRegisterables()),
    provideTranslateService({
      lang: 'en_US',
      fallbackLang: 'en_US',
      extend: true,
      loader: provideTranslateHttpLoader({
        prefix: environment.i18nUrl,
        suffix: '.json',
      }),
    }),
    provideServiceWorker('ngsw-worker.js', {
      // The service worker's file list (ngsw.json) is built for the server root,
      // so it is only used when the panel runs there
      enabled: !isDevMode() && new URL(document.baseURI).pathname === '/',
      registrationStrategy: 'registerWhenStable:30000',
    }),
    ConfigurationsOptionsService,
    GroupsOptionsService,
    FileDownloadService,
    GlobalLoadingService,
    RebrandingService,
  ],
};
