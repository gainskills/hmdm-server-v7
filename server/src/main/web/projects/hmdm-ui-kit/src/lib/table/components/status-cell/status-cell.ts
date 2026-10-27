import { NgClass } from '@angular/common';
import { Component, computed, Signal } from '@angular/core';
import { BaseCellRenderer } from '../../base/base-cell-renderer';
import { TStatusCellParams } from '../../types/status-cell-params.type';
import { TStatus } from '../../types/status.type';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'mhdh-status-cell',
  templateUrl: './status-cell.html',
  styleUrls: ['./status-cell.scss'],
  imports: [NgClass, MatTooltipModule],
})
export class StatusCellRenderer<T, P> extends BaseCellRenderer<T, TStatusCellParams<T>> {
  // Worked out from the current row on every update: the table keeps a row's cell between
  // refreshes, so a value set once in ngOnInit would keep the first colour until F5
  status: Signal<TStatus> = computed(
    () => this.params().provided.status(this.params().data) || { color: 'gray' },
  );
}
