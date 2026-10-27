import { Component, computed, inject, Signal } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { BaseCellRenderer, MatButtonModule, MatIconModule, TranslatePipe } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../../entity/application/types/application-dto.type';
import { APP_ACTION } from '../../const/app-action.const';
import { ConfigurationApplicationDialogService } from '../../services/configuration-application-dialog.service';
import { ConfigurationAppsFacadeService } from '../../services/configuration-applications-facade.service';

@Component({
  selector: 'core-apps-more-cell',
  templateUrl: './apps-more-cell.html',
  styleUrl: './apps-more-cell.scss',
  imports: [MatButtonModule, MatIconModule, MatTooltip, TranslatePipe],
})
export class AppsMoreCell extends BaseCellRenderer<TApplicationDTO> {
  private readonly configurationApplicationDialogService = inject(
    ConfigurationApplicationDialogService,
  );
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);

  isDisplayed: Signal<boolean> = computed(() => this.params().data?.action === APP_ACTION.ALLOW);

  // Trash button: removes this one entry from the configuration's list (stored on Save).
  // Disabled for the configuration's main and content apps; holds the message key shown on hover
  lockMessage: Signal<string | null> = computed(() =>
    this.configurationAppsFacadeService.getUninstallLockMessage(this.params().data),
  );

  openApplicationDialog(): void {
    const app = this.params().data;
    this.configurationApplicationDialogService.openEditDialog(app);
  }

  removeApplication(): void {
    this.configurationApplicationDialogService.openDeleteDialog(this.params().data);
  }
}
