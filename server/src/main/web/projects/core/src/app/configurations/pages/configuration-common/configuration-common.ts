import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Checkbox,
  Radio,
  Selector,
  TextAreaInputComponent,
  TextInputComponent,
  TranslatePipe,
  Slider,
  Timepicker,
  BaseComponent,
} from 'hmdm-ui-kit';
import { BOOLEAN_RADIO_OPTIONS } from '../../../shared/const/boolean-radio-options.const';
import { ConfigurationCommonFormConfig } from '../../configs/configuration-common-form.config';
import { BRIGHTNESS_RADIO_OPTIONS } from '../../const/brightness-radio.const';
import { TRACKING_OPTIONS } from '../../const/tracking-options.const';
import { PERMISSIONS_OPTIONS } from '../../const/permissions-options.const';
import { NOTIFICATIONS_OPTIONS } from '../../const/notifications-options.const';
import { KEEPALIVE_OPTIONS } from '../../const/keepalive-options.const';
import {
  AUTO_TIME_ZONE,
  MANAGE_TIMEZONE_OPTIONS,
  TIME_ZONE_MODE,
} from '../../const/manage-timezone-options.const';
import { PASSWORD_OPTIONS } from '../../const/password-options.const';
import { DOWNLOAD_OPTIONS } from '../../const/download-options.const';
import { TConfigurationCommonFormValue } from '../../types/configuration-common-form.type';
import { SYSTEM_RADIO_OPTIONS } from '../../const/system-radio.const';
import { ConfigurationDetailsFacadeService } from '../../services/configuration-details-facade.service';

function getTimeZoneMode(timeZone: string | null | undefined): string {
  if (!timeZone) {
    return TIME_ZONE_MODE.DEFAULT;
  }

  return timeZone === AUTO_TIME_ZONE ? TIME_ZONE_MODE.AUTO : TIME_ZONE_MODE.MANUAL;
}

@Component({
  selector: 'core-configuration-common',
  templateUrl: './configuration-common.html',
  styleUrl: './configuration-common.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TextInputComponent,
    TranslatePipe,
    TextAreaInputComponent,
    Selector,
    Checkbox,
    Radio,
    Slider,
    Timepicker,
  ],
})
export class ConfigurationCommon extends BaseComponent implements OnInit {
  private readonly configurationCommonFormConfig = inject(ConfigurationCommonFormConfig);
  private readonly configurationDetailsFacadeService = inject(ConfigurationDetailsFacadeService);

  formGroup = this.configurationCommonFormConfig.getFormGroup();
  commonRadioOptions = BOOLEAN_RADIO_OPTIONS;
  brightnessRadioOptions = BRIGHTNESS_RADIO_OPTIONS;
  systemRadioOptions = SYSTEM_RADIO_OPTIONS;
  trackingOptions = TRACKING_OPTIONS;
  permissionsOptions = PERMISSIONS_OPTIONS;
  notificationOptions = NOTIFICATIONS_OPTIONS;
  keepaliveOptions = KEEPALIVE_OPTIONS;
  manageTimezoneOptions = MANAGE_TIMEZONE_OPTIONS;
  passwordOptions = PASSWORD_OPTIONS;
  downloadOptions = DOWNLOAD_OPTIONS;

  private derivedForConfigurationId: number | null | undefined = undefined;

  get formValue(): TConfigurationCommonFormValue {
    return this.formGroup.getRawValue();
  }

  constructor() {
    super();

    effect(() => {
      const currentConfig = this.configurationDetailsFacadeService.currentConfiguration();
      const configurationId = this.configurationDetailsFacadeService.configurationId();

      if (currentConfig) {
        this.formGroup.patchValue(
          {
            ...currentConfig,
            usbStorage: currentConfig.usbStorage ?? false,
            passwordMode: currentConfig.passwordMode ?? '',
            runDefaultLauncher: currentConfig.runDefaultLauncher ?? false,
          },
          { emitEvent: false },
        );

        if (this.derivedForConfigurationId !== configurationId) {
          this.derivedForConfigurationId = configurationId;

          this.formGroup.controls.timeZoneMode.setValue(getTimeZoneMode(currentConfig.timeZone), {
            emitEvent: false,
          });
        }

        this.syncAppUpdateValidators();
        this.syncTimeZoneValidator();
      }
    });
  }

  ngOnInit(): void {
    this.formGroup.valueChanges.pipe(this.untilDestroyed()).subscribe(() => {
      this.configurationDetailsFacadeService.setConfigurationCommon(this.formValue);
    });

    this.formGroup.controls.scheduleAppUpdate.valueChanges
      .pipe(this.untilDestroyed())
      .subscribe(() => this.syncAppUpdateValidators());

    this.formGroup.controls.timeZoneMode.valueChanges
      .pipe(this.untilDestroyed())
      .subscribe((mode) => this.applyTimeZoneMode(mode));

    this.syncAppUpdateValidators();
    this.syncTimeZoneValidator();
  }

  private applyTimeZoneMode(mode: string): void {
    const timeZone = this.formGroup.controls.timeZone;

    if (mode === TIME_ZONE_MODE.AUTO) {
      timeZone.setValue(AUTO_TIME_ZONE, { emitEvent: false });
    } else if (mode !== TIME_ZONE_MODE.MANUAL || timeZone.value === AUTO_TIME_ZONE) {
      timeZone.setValue(null, { emitEvent: false });
    }

    this.syncTimeZoneValidator();
  }

  private syncTimeZoneValidator(): void {
    const { timeZoneMode, timeZone } = this.formGroup.controls;

    this.setRequired(timeZone, timeZoneMode.value === TIME_ZONE_MODE.MANUAL);
  }

  private syncAppUpdateValidators(): void {
    const { scheduleAppUpdate, appUpdateFrom, appUpdateTo } = this.formGroup.controls;
    const required = scheduleAppUpdate.value;

    this.setRequired(appUpdateFrom, required);
    this.setRequired(appUpdateTo, required);
  }

  private setRequired(control: AbstractControl, required: boolean): void {
    if (required) {
      control.addValidators(Validators.required);
    } else {
      control.removeValidators(Validators.required);
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  getPushMessageHelpText(formValue: TConfigurationCommonFormValue): string {
    if (formValue.pushOptions === 'mqttAlarm') {
      return 'form.configuration.settings.push.options.mqtt.alarm.hint';
    } else if (formValue.pushOptions === 'polling') {
      return 'form.configuration.settings.push.options.polling.hint';
    }

    return '';
  }
}
