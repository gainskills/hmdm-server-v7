import {
  Component,
  effect,
  inject,
  input,
  InputSignal,
  OnInit,
  signal,
  ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BaseControlValueAccessor, TOption } from '../../../public-api';
import { ErrorMessage } from '../error-message/error-message';
import { HelpTooltip } from '../help-tooltip/help-tooltip.component';

@Component({
  selector: 'hmdm-select-search',
  templateUrl: './select-search.html',
  styleUrl: './select-search.scss',
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatFormFieldModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    ErrorMessage,
    MatInputModule,
    HelpTooltip,
    TranslatePipe
  ],
})
export class SelectSearch extends BaseControlValueAccessor<unknown> implements OnInit {
  options: InputSignal<TOption<unknown>[]> = input.required();
  private readonly translate = inject(TranslateService);

  private searchTerm: string = '';

  filteredOptions: WritableSignal<TOption<unknown>[]> = signal([]);
  searchControl: FormControl<TOption<unknown> | string> = new FormControl('', {
    nonNullable: true,
  });

  constructor() {
    super();

    effect(() => {
      const options = this.options();

      if (options.length > 0) {
        const filtered = this.getFilteredOptions();
        this.filteredOptions.set(filtered);

        const currentValue = this.formControl.value;
        if (currentValue !== null && currentValue !== undefined) {
          const selectedOption = options.find((option) => option.value === currentValue);
          if (selectedOption) {
            this.searchControl.setValue(this.getDisplayValue(selectedOption.viewValue), { emitEvent: false });
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(this.untilDestroyed()).subscribe(() => {
      const option = this.searchControl.value;

      // A picked entry first: entries whose values are text (e.g. time zone names) would
      // otherwise be taken for typed search text and never reach the form control
      const selectedOption = this.options().find((opt) => opt.value === option);
      if (selectedOption) {
        this.searchControl.setValue(this.getDisplayValue(selectedOption.viewValue), { emitEvent: false });
        this.formControl.setValue(selectedOption.value);
        return;
      }

      if (typeof option === 'string') {
        this.searchTerm = option.toLowerCase();
        this.filteredOptions.set(this.getFilteredOptions());
      }
    });
  }

  override writeValue(value: unknown): void {
    super.writeValue(value);

    const option = this.options().find((opt) => opt.value === value);

    if (!option) {
      return;
    }

    this.searchControl.setValue(this.getDisplayValue(option.viewValue), { emitEvent: false });
  }

  private getFilteredOptions(): TOption<unknown>[] {
    if (!this.searchTerm) {
      return this.options().map((option) => ({ value: option.value, viewValue: option.viewValue }));
    }

    return this.options()
      .filter((option) => this.getDisplayValue(option.viewValue).toLowerCase().includes(this.searchTerm))
      .map((option) => ({ value: option.value, viewValue: option.viewValue }));
  }

  private getDisplayValue(viewValue: string): string {
    return this.translate.instant(viewValue);
  }
}
