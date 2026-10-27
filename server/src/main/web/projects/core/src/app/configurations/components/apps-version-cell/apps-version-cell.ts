import { Component, computed, inject, Signal } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseCellRenderer, TranslatePipe } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../../entity/application/types/application-dto.type';
import { APP_ACTION } from '../../const/app-action.const';
import { ConfigurationAppsFacadeService } from '../../services/configuration-applications-facade.service';

// Version of an app in the configuration's list, with an "Upgrade" link (as in v5) when a newer
// version has been uploaded and the app is set to be installed
@Component({
  selector: 'core-apps-version-cell',
  templateUrl: './apps-version-cell.html',
  styleUrl: './apps-version-cell.scss',
  imports: [MatTooltipModule, TranslatePipe],
})
export class AppsVersionCell extends BaseCellRenderer<TApplicationDTO> {
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);

  canUpgrade: Signal<boolean> = computed(() => {
    const app = this.params().data;
    return !!app?.outdated && app.action === APP_ACTION.ALLOW;
  });

  onUpgradeClick(): void {
    this.configurationAppsFacadeService.upgradeApplication(this.params().data);
  }
}
