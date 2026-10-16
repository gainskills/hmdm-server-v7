import { Component, computed, HostListener, inject, OnInit, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { BaseComponent } from 'hmdm-ui-kit';
import { ConfigurationDetailsFacadeService } from '../../services/configuration-details-facade.service';
import { ConfigurationAppSettings } from '../configuration-app-settings/configuration-app-settings';
import { ConfigurationApp } from '../configuration-app/configuration-app';
import { ConfigurationCommon } from '../configuration-common/configuration-common';
import { ConfigurationDesign } from '../configuration-design/configuration-design';
import { ConfigurationFiles } from '../configuration-files/configuration-files';
import { ConfigurationMdm } from '../configuration-mdm/configuration-mdm';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfigurationAppsFacadeService } from '../../services/configuration-applications-facade.service';
import { APP_ACTION } from '../../const/app-action.const';

@Component({
  selector: 'core-configuration-details',
  templateUrl: './configuration-details.html',
  styleUrl: './configuration-details.scss',
  imports: [
    MatTabsModule,
    TranslatePipe,
    ConfigurationCommon,
    ConfigurationDesign,
    ConfigurationApp,
    ConfigurationMdm,
    ConfigurationAppSettings,
    ConfigurationFiles,
    MatButtonModule,
    RouterLink,
  ],
})
export class ConfigurationDetails extends BaseComponent implements OnInit {
  private readonly router: Router = inject(Router);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly configurationDetailsFacadeService = inject(ConfigurationDetailsFacadeService);
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);

  configurationName: Signal<string> = computed(
    () => this.configurationDetailsFacadeService.currentConfiguration()?.name ?? '',
  );

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.configurationDetailsFacadeService.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  ngOnInit(): void {
    const id = Number.parseInt(this.route.snapshot.paramMap.get('configurationId') ?? '', 10);

    this.configurationDetailsFacadeService.setCurrentConfigurationId(id ?? null);
  }

  onSave(): void {
    // Applications with action 0 ("do not install" / "block") are not linked to the configuration
    const applications = this.configurationAppsFacadeService
      .applications()
      .filter((app) => app.action !== APP_ACTION.BLOCK);

    if (this.configurationDetailsFacadeService.configurationId()) {
      const config = this.configurationDetailsFacadeService.getUpdatedConfiguration();

      if (!config) {
        return;
      }

      this.configurationDetailsFacadeService.saveConfiguration({ ...config, applications });
    } else {
      const config = this.configurationDetailsFacadeService.getNewConfiguration();

      if (!config) {
        return;
      }

      this.configurationDetailsFacadeService.saveConfiguration({ ...config, applications });
    }
  }

  onCancel(): void {
    this.router.navigate(['home', 'configurations']);
  }
}
