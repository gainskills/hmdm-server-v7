import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthStateService } from '../services/auth-state.service';

export const responseInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authStateService = inject(AuthStateService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 403) {
        console.log('responseInterceptor: 403 Forbidden - redirecting to sign-in');

        // Remove hsid cookie
        document.cookie = 'hsid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        authStateService.isAuthenticated.next(false);

        // Don't redirect if already on an auth page (e.g. reset-password, sign-in)
        // The path inside the app: without the panel's path on the server (e.g. /hmdm)
        const basePath = new URL(document.baseURI).pathname;
        const pathname = globalThis.location.pathname.startsWith(basePath)
          ? '/' + globalThis.location.pathname.substring(basePath.length)
          : globalThis.location.pathname;
        console.log(pathname);

        if (!pathname.startsWith('/auth/')) {
          console.log('responseInterceptor: Not on an auth page, redirecting to sign-in');

          const returnUrl = pathname + globalThis.location.search;
          router.navigate(['/auth/sign-in'], { queryParams: { returnUrl } });
        }
      }

      return throwError(() => error);
    }),
  );
};
