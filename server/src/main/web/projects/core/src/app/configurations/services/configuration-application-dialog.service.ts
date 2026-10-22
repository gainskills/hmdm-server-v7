import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { filter, take } from 'rxjs';
import { ConfirmDialog } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../entity/application/types/application-dto.type';
import { ConfigurationAppDetailsDialog } from '../components/configuration-app-details-dialog/configuration-app-details-dialog';
import { ConfigurationAppsDialog } from '../components/configuration-apps-dialog/configuration-apps-dialog';
import { ConfigurationAppsFacadeService } from './configuration-applications-facade.service';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationApplicationDialogService {
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);
  private readonly dialog: MatDialog = inject(MatDialog);

  openAddDialog(): void {
    this.dialog
      .open(ConfigurationAppsDialog, {
        autoFocus: false,
      })
      .afterClosed()
      .pipe(take(1), filter(Boolean))
      .subscribe((app: TApplicationDTO) => {
        this.configurationAppsFacadeService.addApplication(app);
      });
  }

  openEditDialog(app: TApplicationDTO): void {
    this.dialog.open(ConfigurationAppDetailsDialog, {
      data: { app },
    });
  }

  openDeleteDialog(app: TApplicationDTO): void {
    this.dialog
      .open(ConfirmDialog, {
        data: {
          message: 'form.configuration.apps.delete.prompt',
          title: '',
          confirmButtonText: 'button.delete',
          cancelButtonText: 'button.cancel',
        },
      })
      .afterClosed()
      .pipe(take(1), filter(Boolean))
      .subscribe(() => {
        this.configurationAppsFacadeService.removeApplication(app);
      });
  }
}
