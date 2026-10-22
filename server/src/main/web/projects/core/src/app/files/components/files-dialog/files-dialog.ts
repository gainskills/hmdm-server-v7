import { Component, inject, OnInit, signal } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DialogBase, DialogCommonButtons, DialogTemplate, MAT_DIALOG_DATA } from 'hmdm-ui-kit';
import { filter, finalize, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { TFileUploadResult } from '../../../entity/application/types/file-upload-result.type';
import { FileService } from '../../../entity/file/services/file.service';
import { TFileDTO } from '../../../entity/file/types/file-dto.type';
import { SettingsFacadeService } from '../../../shared/services/settings-facade.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { TFilesFormValue } from '../../types/files-form.type';
import { FilesForm } from '../files-form/files-form';

@Component({
  selector: 'core-files-dialog',
  templateUrl: './files-dialog.html',
  styleUrl: './files-dialog.scss',
  imports: [DialogTemplate, DialogCommonButtons, FilesForm, MatProgressBarModule],
})
export class FilesDialog extends DialogBase implements OnInit {
  private data = inject(MAT_DIALOG_DATA);
  private fileService = inject(FileService);
  private readonly settingsFacadeService = inject(SettingsFacadeService);
  private readonly snackBarService = inject(SnackBarService);

  formData: TFilesFormValue | null = null;
  initialData: TFileDTO | null = this.data?.file || null;
  isLoading = signal(false);
  uploadProgress = signal<number | null>(null);

  private readonly abort$ = new Subject<void>();

  ngOnInit(): void {
    this.settingsFacadeService.fetchStorageLimit().subscribe();
  }

  override onSave(): void {
    if (!this.formData) return;

    this.isLoading.set(true);

    if (!this.initialData && this.formData.file) {
      const formData = this.formData;
      this.uploadProgress.set(0);

      this.fileService
        .uploadFileWithProgress(formData.file!)
        .pipe(
          this.untilDestroyed(),
          takeUntil(this.abort$),
          tap((event) => {
            if (typeof event === 'number') {
              this.uploadProgress.set(event);
            }
          }),
          filter((event): event is TFileUploadResult => typeof event !== 'number'),
          switchMap((uploadResult) =>
            this.fileService.createFileFromUpload(formData, uploadResult),
          ),
          finalize(() => {
            this.isLoading.set(false);
            this.uploadProgress.set(null);
          }),
        )
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            this.snackBarService.error(err?.message || 'error.size.limit.exceeded');
          },
        });
    } else {
      const request$ = this.initialData
        ? this.fileService.updateFile(this.buildUpdateRequest(this.initialData, this.formData))
        : this.fileService.createFile(this.formData);

      request$
        .pipe(
          take(1),
          takeUntil(this.abort$),
          finalize(() => {
            this.isLoading.set(false);
          }),
        )
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: () => {},
        });
    }
  }

  override onCancel(): void {
    this.abort$.next();
    super.onCancel();
  }

  onFormChange($event: TFilesFormValue | null) {
    this.formData = $event;
  }

  isSaveDisabled(): boolean {
    return this.formData === null || this.isLoading();
  }

  private buildUpdateRequest(file: TFileDTO, data: TFilesFormValue): TFileDTO {
    if (data.external) {
      return {
        ...file,
        description: data.description,
        devicePath: data.devicePath,
        replaceVariables: data.replaceVariables,
        url: data.externalUrl ?? '',
        // The server stores the external URL from this field; without it the URL is erased
        externalUrl: data.externalUrl ?? '',
      };
    } else {
      return {
        ...file,
        description: data.description,
        devicePath: data.devicePath,
        filePath: data.filePath ?? '',
        replaceVariables: data.replaceVariables,
      };
    }
  }
}
