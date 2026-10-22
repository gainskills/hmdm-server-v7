import { Component, inject, OnInit } from '@angular/core';
import { DialogBase, DialogTemplate, MatButtonModule, TranslatePipe } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../../entity/application/types/application-dto.type';
import { ApplicationDialogService } from '../../../applications/services/application-dialog.service';
import { ConfigurationAppFormConfig } from '../../configs/configuration-app-form.config';
import { ConfigurationAppForm } from '../configuration-app-form/configuration-app-form';
import { HasPermissionDirective } from '../../../shared/directives/has-permission.directive';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { ConfigurationAppsFacadeService } from '../../services/configuration-applications-facade.service';

@Component({
  selector: 'core-configuration-apps-dialog',
  templateUrl: './configuration-apps-dialog.html',
  styleUrl: './configuration-apps-dialog.scss',
  imports: [
    DialogTemplate,
    ConfigurationAppForm,
    TranslatePipe,
    MatButtonModule,
    HasPermissionDirective,
  ],
})
export class ConfigurationAppsDialog extends DialogBase implements OnInit {
  private readonly configurationAppFormConfig = inject(ConfigurationAppFormConfig);
  private readonly appDialogService = inject(ApplicationDialogService);
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);
  private readonly snackBarService = inject(SnackBarService);

  formGroup = this.configurationAppFormConfig.getFormGroup();
  app: TApplicationDTO | null = null;

  ngOnInit(): void {}

  override onSave(): void {
    // Already in the configuration: say so and keep the dialog open to pick another app
    if (this.app && this.configurationAppsFacadeService.isInConfiguration(this.app.id)) {
      this.snackBarService.info('error.configuration.app.already.added');
      return;
    }

    this.dialogRef.close(this.app);
  }

  onFormChange(app: TApplicationDTO): void {
    this.app = app;
  }

  onCreateNewApp(): void {
    this.appDialogService.openAddApplicationDialog();
  }
}
