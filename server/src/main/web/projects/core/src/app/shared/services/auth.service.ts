import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import {catchError, EMPTY, filter, from, map, Observable, of, switchMap, take, tap} from 'rxjs';
import { TUserDTO } from '../../entity/user/types/user-dto.type';
import { TAuthConfig } from '../types/auth-config.type';
import { THttpResponse } from '../types/http-response.type';
import { TSignInRequest } from '../types/sign-in-request.type';
import { extractData } from '../utils/extract-data';
import { AuthStateService } from './auth-state.service';
import { Router } from '@angular/router';
import { SnackBarService } from './snack-bar.service';
import { UserStateService } from './user-state.service';
import {TAuthFlow} from '../../auth/types/auth-flow.type';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly authStateService: AuthStateService = inject(AuthStateService);
  private readonly router: Router = inject(Router);
  private readonly snackbarService = inject(SnackBarService);
  private readonly userStateService = inject(UserStateService);

  private _authOptions: WritableSignal<TAuthConfig | null> = signal(null);
  private _currentUser: WritableSignal<TUserDTO | null> = signal(null);

  authOptions = this._authOptions.asReadonly();
  currentUser = this._currentUser.asReadonly();

  pendingUserId = signal<number | null>(null);
  private isTwoFactorPending = signal<boolean>(false);

  init(): Observable<void> {
    this.authStateService.isAuthenticated.next(true);

    return this.getOptions().pipe(
      map((options) => {
        this._authOptions.set(options);
      }),
    );
  }

  loadAuthOptions(): Observable<void> {
    return this.getOptions().pipe(
      map((options) => {
        this._authOptions.set(options);
      }),
    );
  }

  getCurrentUser(): Observable<TUserDTO> {
    return this.http.get<THttpResponse<TUserDTO>>('rest/private/users/current').pipe(
      map((response) => response.data),
      tap((user) => {
        this._currentUser.set(user);
        this.userStateService.setCurrentUser(user);
      }),
    );
  }

  signIn(credentials: TSignInRequest): Observable<TAuthFlow> {
    return this.preparePassword(credentials.password).pipe(
      switchMap((hashedPassword) => {
        const preparedCredentials = { ...credentials, password: hashedPassword };
        return this.http.post<THttpResponse<TUserDTO | null>>(
          'rest/public/auth/login',
          preparedCredentials,
        );
      }),
      tap((response) => {
        if (response.status === 'ERROR') {
          this.snackbarService.error('login.password.incorrect');
        }
      }),
      filter((response) => response.status === 'OK'),
      switchMap((response) => {
        const user = response.data;

        if (user?.passwordReset && user?.passwordResetToken) {
          this.authStateService.pendingPasswordReset.next({ token: user.passwordResetToken });
          this.router.navigate(['/auth/reset-password'], { queryParams: { token: user.passwordResetToken } });
          return EMPTY;
        }

        if (user?.twoFactor) {
          return this.http.get<THttpResponse<{ valid: boolean }>>('rest/private/plugin-twofactor/license').pipe(
            map((licenseResp) => {
              if (licenseResp?.data?.valid) {
                this.pendingUserId.set(user.id);

                this.isTwoFactorPending.set(true);

                return user.twoFactorAccepted
                  ? { flow: 'VERIFY' as const, customerId: user.customerId }
                  : { flow: 'SETUP' as const, customerId: user.customerId };
              }
              return { flow: 'DIRECT' as const };
            }),
            catchError(() => of({ flow: 'DIRECT' as const }))
          );
        }

        return of({ flow: 'DIRECT' as const });
      }),
      switchMap((res) => {
        if (res.flow === 'DIRECT') {
          this.isTwoFactorPending.set(false);
          return this.init().pipe(
            switchMap(() => this.getCurrentUser()),
            map(() => res)
          );
        }
        return of(res);
      }),
      take(1)
    );
  }

  verifyTwoFactorCode(code: string) {
    const userId = this.pendingUserId() || this.currentUser()?.id;

    return this.http.get<THttpResponse<any>>(
      `rest/private/plugin-twofactor/verify/${userId}/${code}`
    ).pipe(
      take(1),
      switchMap((response) => {
        if (response.status === 'OK') {
          this.isTwoFactorPending.set(false);
          this.pendingUserId.set(null);
          return this.init().pipe(
            switchMap(() => this.getCurrentUser()),
            map(() => response)
          );
        }
        return of(response);
      })
    );
  }

  getIs2FAPending(): boolean {
    return this.isTwoFactorPending();
  }

  recoverPassword(login: string): Observable<void> {
    return this.http
      .get<THttpResponse<void>>(`rest/public/passwordReset/recover/${encodeURIComponent(login)}`)
      .pipe(
        take(1),
        tap((response) => {
          if (response.status === 'ERROR') {
            this.snackbarService.error(response.message ?? 'error.internal.server');
          }
        }),
        filter((response) => response.status === 'OK'),
        map(() => void 0),
      );
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.preparePassword(newPassword).pipe(
      switchMap((hashedPassword) =>
        this.http.post<THttpResponse<TUserDTO>>('rest/public/passwordReset/reset', {
          passwordResetToken: token,
          newPassword: hashedPassword,
        }),
      ),
      take(1),
      tap((response) => {
        if (response.status === 'ERROR') {
          this.snackbarService.error('login.password.reset.error');
        }
      }),
      filter((response) => response.status === 'OK'),
      tap((response) => {
        this._currentUser.set(response.data);
        this.authStateService.pendingPasswordReset.next(null);
      }),
      switchMap(() => this.init()),
      switchMap(() => this.getCurrentUser()),
      tap(() => {
        this.router.navigate(['/home']);
      }),
      map(() => void 0),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('rest/public/auth/logout', {}).pipe(
      take(1),
      tap(() => {
        this.authStateService.isAuthenticated.next(false);
        this._currentUser.set(null);
        this.userStateService.setCurrentUser(null);

        document.cookie = 'hsid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        this.authStateService.isAuthenticated.next(false);
        this.router.navigate(['/auth/sign-in']);
      }),
    );
  }

  preparePassword(password: string): Observable<string> {
    const authConfig = this._authOptions();

    if (!authConfig?.publicKey) {
      // Use MD5 hash when no public key is available
      return from(import('md5')).pipe(
        map((module) => module.default || module),
        map((md5) => md5(password).toUpperCase()),
      );
    } else {
      // Encrypt with public key when available
      return from(import('jsencrypt')).pipe(
        map((module) => module.default),
        map((JSEncrypt) => {
          const encrypt = new JSEncrypt();
          encrypt.setPublicKey(authConfig.publicKey!);
          return encrypt.encrypt(password) || '';
        }),
      );
    }
  }

  hasPermission(permission: string): boolean {
    const user = this._currentUser();

    if (!user) {
      return false;
    }

    if (user.superAdmin || user.userRole.permissions.find((p) => p.name === permission)) {
      return true;
    }

    return false;
  }

  private getOptions(): Observable<TAuthConfig> {
    return this.http
      .get<THttpResponse<TAuthConfig>>('rest/public/auth/options')
      .pipe(extractData());
  }
}
