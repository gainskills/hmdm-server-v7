import {Component, inject, OnInit} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { RebrandingService } from 'hmdm-ui-kit';
import { environment } from '../../../../environments/environment';
import { CookieNotice } from '../../../shared/components/cookie-notice/cookie-notice';
import {LicenseService} from '../../services/license.service';
import {Router, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'core-auth-container',
  templateUrl: './auth-container.html',
  styleUrl: './auth-container.scss',
  imports: [TranslatePipe, RouterLink, CookieNotice, MatButton],
})
export class AuthContainer implements OnInit {
  private readonly rebrandingService = inject(RebrandingService);
  private readonly licenseService = inject(LicenseService);
  private readonly router = inject(Router);

  pluginLicenseKey = this.licenseService.pluginLicenseKeyData;
  readonly rebranding = this.rebrandingService.rebranding;
  readonly currentYear = new Date().getFullYear();
  readonly logoUrl = `${environment.baseApiUrl}rest/public/brand/logo`;

  ngOnInit() {
    this.licenseService.getPluginLicenseKey().subscribe({
      next: (value) => {
        this.pluginLicenseKey.set(value);
        if ((value.valid && value.expiryDays != -1 && value.expiryDays <= 7) || !value.valid) {
          this.router.navigate(['/auth/missing-license']);
        }
      },
      error: (err) => {
        this.pluginLicenseKey.set(null);
      }
    });
  }
}
