import { Injectable } from '@angular/core';
import { TTableConfig } from 'hmdm-ui-kit';
import { TApplicationDTO } from '../../entity/application/types/application-dto.type';
import { AppsVersionCell } from '../components/apps-version-cell/apps-version-cell';
import { AppsActionCell } from '../components/apps-action-cell/apps-action-cell';
import { AppsNameCell } from '../components/apps-name-cell/apps-name-cell';
import { AppsIconCell } from '../components/apps-icon-cell/apps-icon-cell';
import { AppsMoreCell } from '../components/apps-more-cell/apps-more-cell';
import { AppsOrderCell } from '../components/apps-order-cell/apps-order-cell';

@Injectable({
  providedIn: 'root',
})
export class ConfigurationAppsTableConfig {
  getConfig(): TTableConfig<TApplicationDTO> {
    return {
      trackBy(index, item) {
        return `${item.id}-${item.version}`;
      },
      columns: [
        {
          field: 'name',
          title: 'table.heading.application.name',
          sortable: true,
          cellRenderer: AppsNameCell,
        },
        {
          field: 'version',
          title: 'table.heading.application.version',
          cellRenderer: AppsVersionCell,
        },
        {
          field: 'action',
          title: 'table.heading.application.actions',
          cellRenderer: AppsActionCell,
        },
        {
          field: 'icon',
          title: 'table.heading.application.label',
          cellRenderer: AppsIconCell,
        },
        {
          field: 'order',
          title: 'table.heading.application.order',
          cellRenderer: AppsOrderCell,
        },
        {
          field: 'actions',
          title: '',
          cellRenderer: AppsMoreCell,
          width: '120px',
          stickyEnd: true,
        },
      ],
    };
  }
}
