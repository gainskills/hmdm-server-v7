import { Component, computed, effect, inject, Signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { BaseCellRenderer, Selector, TOption, TranslatePipe } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../../entity/application/types/application-dto.type';
import { ConfigurationAppsFacadeService } from '../../services/configuration-applications-facade.service';

@Component({
  selector: 'core-apps-action-cell',
  templateUrl: './apps-action-cell.html',
  styleUrl: './apps-action-cell.scss',
  imports: [Selector, ReactiveFormsModule, MatTooltip, TranslatePipe],
})
export class AppsActionCell extends BaseCellRenderer<TApplicationDTO> {
  private readonly configurationAppsFacadeService = inject(ConfigurationAppsFacadeService);

  app: Signal<TApplicationDTO> = computed(() => this.params().data);
  actionOptions: Signal<TOption<number>[]> = computed(() =>
    this.configurationAppsFacadeService.getActionOptions(this.app()),
  );
  // The configuration's main (MDM) and content apps can't be uninstalled: their action can't be
  // changed. Holds the message key shown on hover, or null for other apps
  lockMessage: Signal<string | null> = computed(() =>
    this.configurationAppsFacadeService.getUninstallLockMessage(this.app()),
  );
  formControl: FormControl<number> = new FormControl(1, { nonNullable: true });

  private readonly syncControlValue = effect(() => {
    this.formControl.setValue(this.app().action, { emitEvent: false });

    if (this.lockMessage()) {
      this.formControl.disable({ emitEvent: false });
    } else {
      this.formControl.enable({ emitEvent: false });
    }
  });

  constructor() {
    super();

    this.formControl.valueChanges.pipe(this.untilDestroyed()).subscribe((value) => {
      this.configurationAppsFacadeService.setAppAction(this.app(), value);
    });
  }
}
