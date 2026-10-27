import { Component, computed, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  Checkbox,
  DialogBase,
  DialogCommonButtons,
  DialogTemplate,
  FileInputComponent,
  MAT_DIALOG_DATA,
  MatButtonModule,
  SelectSearch,
  TextInputComponent,
  TranslatePipe,
} from 'hmdm-ui-kit';
import { filter, finalize, Subject, switchMap, take, takeUntil, tap } from 'rxjs';
import { TFileUploadResult } from '../../../entity/application/types/file-upload-result.type';
import { TConfigurationFileDTO } from '../../../entity/configuration/types/configuration-file-dto.type';
import { FileService } from '../../../entity/file/services/file.service';
import { TFileDTO } from '../../../entity/file/types/file-dto.type';
import { TFilesFormValue } from '../../../files/types/files-form.type';
import { FilesOptionsService } from '../../../shared/services/files-options.service';
import { SettingsFacadeService } from '../../../shared/services/settings-facade.service';
import { SnackBarService } from '../../../shared/services/snack-bar.service';

@Component({
  selector: 'core-configuration-file-dialog',
  templateUrl: './configuration-file-dialog.html',
  styleUrl: './configuration-file-dialog.scss',
  imports: [
    DialogTemplate,
    TranslatePipe,
    MatButtonModule,
    ReactiveFormsModule,
    SelectSearch,
    TextInputComponent,
    Checkbox,
    FileInputComponent,
    MatProgressBarModule,
    DialogCommonButtons,
  ],
})
export class ConfigurationFileDialog extends DialogBase implements OnInit {
  private readonly data = inject(MAT_DIALOG_DATA);
  private readonly filesOptionsService = inject(FilesOptionsService);
  private readonly fileService = inject(FileService);
  private readonly settingsFacadeService = inject(SettingsFacadeService);
  private readonly snackBarService = inject(SnackBarService);
  private readonly fb = inject(NonNullableFormBuilder);

  // Form controls
  fileIdControl = new FormControl<number | null>(null);
  uploadNewFileControl = this.fb.control(false);
  descriptionControl = this.fb.control('');
  externalControl = this.fb.control(false);
  externalUrlControl = this.fb.control('');
  fileControl = new FormControl<File | null>(null);
  filePathControl = this.fb.control('');
  devicePathControl = this.fb.control('');
  replaceVariablesControl = this.fb.control(false);
  overridePathControl = this.fb.control(false);
  remove = this.fb.control(false);

  // State
  isUploadMode: WritableSignal<boolean> = signal(false);
  isExternal: WritableSignal<boolean> = signal(false);
  isLoading = signal(false);
  uploadProgress = signal<number | null>(null);
  isEditMode = !!this.data?.configFile;

  filesOptions = this.filesOptionsService.filesOptions;

  availableSpaceWarning = computed(() => {
    const limit = this.settingsFacadeService.storageLimit();
    const settings = this.settingsFacadeService.settings();
    if (!limit || !settings || settings.sizeLimit <= 0) return null;
    const available = Math.max(0, limit.sizeLimit - limit.sizeUsed);
    return available < 100 ? available : null;
  });

  private readonly abort$ = new Subject<void>();

  ngOnInit(): void {
    this.settingsFacadeService.fetchStorageLimit().subscribe();
    this.disableUploadFields();
    if (this.isEditMode) {
      this.initEditMode();
    }
    this.initListeners();
  }

  private initEditMode(): void {
    const configFile: TConfigurationFileDTO = this.data.configFile;
    this.filePathControl.setValue(configFile.filePath ?? '');
    this.devicePathControl.setValue(configFile.path);
    this.descriptionControl.setValue(configFile.description ?? '');
    this.overridePathControl.setValue(configFile.overridePath ?? false, { emitEvent: false });
    this.remove.setValue(configFile.remove, { emitEvent: false });
    if (configFile.overridePath) {
      this.devicePathControl.enable();
    }
  }

  private initListeners(): void {
    this.fileIdControl.valueChanges.pipe(this.untilDestroyed()).subscribe((id) => {
      if (!id) return;
      const file = this.filesOptionsService.getFileById(id);
      if (!file) return;
      this.descriptionControl.setValue(file.description);
      this.filePathControl.setValue(file.filePath ?? '');
      this.devicePathControl.setValue(file.devicePath);
    });

    this.uploadNewFileControl.valueChanges.pipe(this.untilDestroyed()).subscribe((uploadMode) => {
      this.isUploadMode.set(uploadMode);
      if (uploadMode) {
        this.fileIdControl.reset(null);
        this.overridePathControl.reset(false);
        this.enableUploadFields();
      } else {
        this.disableUploadFields();
        this.descriptionControl.reset('');
        this.filePathControl.reset('');
        this.devicePathControl.reset('');
      }
    });

    this.overridePathControl.valueChanges.pipe(this.untilDestroyed()).subscribe((override) => {
      if (this.isUploadMode()) return;
      if (override) {
        this.devicePathControl.enable();
      } else {
        this.devicePathControl.disable();
        if (this.isEditMode) {
          this.devicePathControl.setValue(this.data.configFile.path);
        } else {
          const id = this.fileIdControl.value;
          if (id) {
            const file = this.filesOptionsService.getFileById(id);
            if (file) this.devicePathControl.setValue(file.devicePath);
          }
        }
      }
    });

    this.externalControl.valueChanges.pipe(this.untilDestroyed()).subscribe((external) => {
      this.isExternal.set(external);
      if (external) {
        this.fileControl.reset(null);
        this.fileControl.disable();
        this.filePathControl.reset('');
        this.filePathControl.disable();
        this.externalUrlControl.enable();
      } else {
        this.fileControl.enable();
        this.filePathControl.enable();
        this.externalUrlControl.reset('');
        this.externalUrlControl.disable();
      }
    });

    this.fileControl.valueChanges.pipe(this.untilDestroyed()).subscribe((file) => {
      const name = file?.name ?? '';
      this.filePathControl.setValue(name);
      this.devicePathControl.setValue(name ? `/Download/${name}` : '');
    });
  }

  private enableUploadFields(): void {
    this.descriptionControl.enable();
    this.externalControl.enable();
    this.devicePathControl.enable();
    this.replaceVariablesControl.enable();
    if (this.externalControl.value) {
      this.externalUrlControl.enable();
    } else {
      this.fileControl.enable();
      this.filePathControl.enable();
    }
  }

  private disableUploadFields(): void {
    this.descriptionControl.disable();
    this.externalControl.disable();
    this.externalUrlControl.disable();
    this.fileControl.disable();
    this.filePathControl.disable();
    this.devicePathControl.disable();
    this.replaceVariablesControl.disable();
    this.isExternal.set(false);
    this.externalControl.reset(false);
  }

  override onSave(): void {
    if (this.isEditMode) {
      this.saveEdit();
    } else if (this.isUploadMode()) {
      this.saveUpload();
    } else {
      this.saveSelect();
    }
  }

  private saveEdit(): void {
    const configFile: TConfigurationFileDTO = this.data.configFile;
    const overridePath = this.overridePathControl.value;
    this.dialogRef.close({
      ...configFile,
      path: overridePath ? this.devicePathControl.getRawValue() : configFile.path,
      overridePath: overridePath,
      remove: this.remove.value,
    });
  }

  private saveSelect(): void {
    const fileId = this.fileIdControl.value;
    if (!fileId) return;
    const file = this.filesOptionsService.getFileById(fileId);
    if (!file) return;
    const overridePath = this.overridePathControl.value;
    this.dialogRef.close(this.buildConfigFileDTO(file, overridePath));
  }

  private saveUpload(): void {
    this.isLoading.set(true);
    const formValue = this.getUploadFormValue();

    if (!formValue.external && formValue.file) {
      this.uploadProgress.set(0);
      this.fileService
        .uploadFileWithProgress(formValue.file)
        .pipe(
          this.untilDestroyed(),
          takeUntil(this.abort$),
          tap((event) => {
            if (typeof event === 'number') this.uploadProgress.set(event);
          }),
          filter((event): event is TFileUploadResult => typeof event !== 'number'),
          switchMap((uploadResult) =>
            this.fileService.createFileFromUpload(formValue, uploadResult),
          ),
          finalize(() => {
            this.isLoading.set(false);
            this.uploadProgress.set(null);
          }),
        )
        .subscribe({
          next: (newFile) => {
            this.filesOptionsService.searchFiles();
            this.dialogRef.close(this.buildConfigFileDTO(newFile, false));
          },
          error: (err) => {
            this.snackBarService.error(err?.message || 'error.size.limit.exceeded');
          },
        });
    } else {
      this.fileService
        .createFile(formValue)
        .pipe(
          take(1),
          takeUntil(this.abort$),
          finalize(() => this.isLoading.set(false)),
        )
        .subscribe({
          next: (newFile) => {
            this.filesOptionsService.searchFiles();
            this.dialogRef.close(this.buildConfigFileDTO(newFile, false));
          },
          error: () => {},
        });
    }
  }

  private getUploadFormValue(): TFilesFormValue {
    return {
      description: this.descriptionControl.getRawValue(),
      external: this.externalControl.getRawValue(),
      externalUrl: this.externalUrlControl.getRawValue(),
      file: this.fileControl.value ?? undefined,
      filePath: this.filePathControl.getRawValue(),
      devicePath: this.devicePathControl.getRawValue(),
      replaceVariables: this.replaceVariablesControl.getRawValue(),
    };
  }

  private buildConfigFileDTO(file: TFileDTO, overridePath: boolean): TConfigurationFileDTO {
    return {
      lastUpdate: Date.now(),
      description: file.description,
      externalUrl: file.external ? file.url : null,
      filePath: file.filePath,
      checksum: null,
      remove: false,
      fileId: file.id,
      url: file.url,
      replaceVariables: file.replaceVariables,
      path: file.devicePath,
      overridePath: overridePath,
    };
  }

  override onCancel(): void {
    this.abort$.next();
    super.onCancel();
  }

  isSaveDisabled(): boolean {
    if (this.isLoading()) return true;
    if (this.isEditMode) return false;
    if (!this.isUploadMode()) {
      return !this.fileIdControl.value;
    }
    if (this.externalControl.getRawValue()) {
      return !this.externalUrlControl.getRawValue();
    }
    return !this.fileControl.value;
  }
}
