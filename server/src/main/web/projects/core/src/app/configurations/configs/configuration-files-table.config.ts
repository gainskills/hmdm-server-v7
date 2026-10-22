import { Injectable } from '@angular/core';
import { BooleanCell, TTableConfig } from 'hmdm-ui-kit';
import { ConfigurationFileActionCell } from '../components/configuration-file-action-cell/configuration-file-action-cell';
import { ConfigurationFileRemoveCell } from '../components/configuration-file-remove-cell/configuration-file-remove-cell';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationFilesTableConfig {
  getConfig(): TTableConfig {
    return {
      trackBy(index, item) {
        return `file-${item.id}-${item.url}-${item.path}-${item.replaceVariables}-${item.remove}`;
      },
      columns: [
        {
          field: 'url',
          title: 'table.heading.file.url',
        },
        {
          field: 'description',
          title: 'table.heading.file.description',
        },
        {
          field: 'path',
          title: 'table.heading.file.devicepath',
        },
        {
          field: 'replaceVariables',
          title: 'table.heading.file.variable',
          cellRenderer: BooleanCell,
        },
        {
          title: 'table.heading.file.remove',
          cellRenderer: ConfigurationFileRemoveCell,
        },
        {
          field: 'actions',
          title: '',
          cellRenderer: ConfigurationFileActionCell,
          stickyEnd: true,
          width: '120px',
        },
      ],
    };
  }
}
