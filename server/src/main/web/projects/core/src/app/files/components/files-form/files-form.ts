import {
  Component,
  computed,
  inject,
  input,
  InputSignal,
  OnInit,
  output,
  OutputEmitterRef,
  signal,
  WritableSignal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import {
  BaseComponent,
  Checkbox,
  FileInputComponent,
  TextInputComponent,
  TranslatePipe,
} from 'hmdm-ui-kit';
import { FilesFormConfig } from '../../configuration/files-form.config';
import { TFilesFormValue } from '../../types/files-form.type';
import { TFileDTO } from '../../../entity/file/types/file-dto.type';
import { SettingsFacadeService } from '../../../shared/services/settings-facade.service';

@Component({
  selector: 'core-files-form',
  templateUrl: './files-form.html',
  styleUrl: './files-form.scss',
  imports: [ReactiveFormsModule, TextInputComponent, Checkbox, FileInputComponent, TranslatePipe],
})
export class FilesForm extends BaseComponent implements OnInit {
  initialData: InputSignal<TFileDTO | null> = input<TFileDTO | null>(null);

  formChange: OutputEmitterRef<TFilesFormValue | null> = output();

  private readonly filesFormConfig = inject(FilesFormConfig);
  private readonly settingsFacadeService = inject(SettingsFacadeService);

  formGroup = this.filesFormConfig.getFormGroup();
  isExternal: WritableSignal<boolean> = signal(false);
  isEdit: WritableSignal<boolean> = signal(false);

  availableSpaceWarning = computed(() => {
    const limit = this.settingsFacadeService.storageLimit();
    const settings = this.settingsFacadeService.settings();
    if (!limit || !settings || settings.sizeLimit <= 0) return null;
    const available = Math.max(0, limit.sizeLimit - limit.sizeUsed);
    return available < 100 ? available : null;
  });

  ngOnInit(): void {
    const data = this.initialData();

    if (data) {
      this.formGroup.patchValue({ ...data, externalUrl: data.url, filePath: data.filePath ?? '' });
      // The listener that sets isExternal is not subscribed yet at this point
      this.isExternal.set(!!data.external);
      this.isEdit.set(true);
      this.formGroup.controls.external.disable();
    }

    this.initFormListeners();
  }

  private initFormListeners(): void {
    this.formGroup.valueChanges.pipe(this.untilDestroyed()).subscribe(() => {
      const value = this.formGroup.valid ? this.formGroup.getRawValue() : null;
      this.formChange.emit(value);
    });

    this.formGroup
      .get('external')
      ?.valueChanges.pipe(this.untilDestroyed())
      .subscribe(() => {
        this.isExternal.set(this.formGroup.controls.external.value);
      });

    this.formGroup.controls.file?.valueChanges.pipe(this.untilDestroyed()).subscribe(() => {
      const fileName = this.formGroup.controls?.file?.value?.name || '';

      this.formGroup.controls.filePath?.setValue(fileName);
      this.formGroup.controls.filePath?.markAsDirty();
      this.formGroup.controls.filePath?.markAsTouched();
      this.formGroup.controls.filePath?.updateValueAndValidity();

      this.formGroup.controls.devicePath?.setValue(fileName ? `/Download/${fileName}` : '');
      this.formGroup.controls.devicePath?.markAsDirty();
      this.formGroup.controls.devicePath?.markAsTouched();
      this.formGroup.controls.devicePath?.updateValueAndValidity();
    });
  }
}
