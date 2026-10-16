import { computed, effect, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { finalize, take } from 'rxjs';
import { TOption, TTableSortState } from '../../../../../hmdm-ui-kit/src/public-api';
import { ApplicationService } from '../../entity/application/services/application.service';
import { TApplicationDTO } from '../../entity/application/types/application-dto.type';
import { ConfigurationService } from '../../entity/configuration/services/configuration.service';
import { APP_ACTION } from '../const/app-action.const';
import { ConfigurationDetailsFacadeService } from './configuration-details-facade.service';
import { TConfigurationAppDetailsFormValue } from '../types/configuration-app-details-form.type';

function toKeyCode(value: string): number | null {
  const parsed = Number(value);

  return value === '' || Number.isNaN(parsed) ? null : parsed;
}

@Injectable({
  providedIn: 'root',
})
export class ConfigurationAppsFacadeService {
  private configurationService = inject(ConfigurationService);
  private configurationDetailsFacadeService = inject(ConfigurationDetailsFacadeService);
  private applicationService = inject(ApplicationService);
  private searchTerm: WritableSignal<string> = signal('');

  private readonly showSystemApps: WritableSignal<boolean> = signal(false);
  private readonly _sortState: WritableSignal<TTableSortState | null> = signal(null);
  private readonly _applications: WritableSignal<TApplicationDTO[]> = signal([]);
  private readonly _allApplications: WritableSignal<TApplicationDTO[]> = signal([]);

  applications = this._applications.asReadonly();
  isLoadingApplications: WritableSignal<boolean> = signal(false);
  tableData = computed(() => {
    const apps = this._applications().filter((app) => {
      return (
        (app.action !== APP_ACTION.BLOCK || app.actionChanged) &&
        (this.showSystemApps() || !app.system)
      );
    });

    if (this._sortState()) {
      const { sortBy, sortDir } = this._sortState()!;

      apps.sort((a, b) => {
        const aValue = a[sortBy as keyof TApplicationDTO];
        const bValue = b[sortBy as keyof TApplicationDTO];

        if (aValue === bValue) {
          return 0;
        }

        const comparison = aValue! > bValue! ? 1 : -1;
        return sortDir === 'asc' ? comparison : -comparison;
      });
    }

    return this.searchTerm()
      ? apps.filter((app) => app.name.toLowerCase().includes(this.searchTerm().toLowerCase()))
      : apps;
  });
  applicationsOptions = computed(() =>
    this._allApplications().map((app) => ({
      viewValue: app.name,
      value: app,
    })),
  );
  applicationsIdOptions = computed(() =>
    this._allApplications().map((app) => ({
      viewValue: app.pkg ? `${app.name} (${app.pkg})` : app.name,
      value: app.id,
    })),
  );
  applicationsVersionIdOptions = computed(() => {
    // Prefer the version used in the current configuration over the latest one.
    // An app may appear several times, but only one entry carries usedVersionId,
    // so skip the null entries to keep them from overwriting it in the map
    const configVersions = new Map(
      this._applications()
        .filter((app) => app.usedVersionId != null)
        .map((app) => [app.id, app.usedVersionId]),
    );

    return this._allApplications().map((app) => ({
      viewValue: app.pkg ? `${app.name} (${app.pkg})` : app.name,
      value: configVersions.get(app.id) ?? app.usedVersionId,
    }));
  });

  constructor() {
    effect(() => {
      const id = this.configurationDetailsFacadeService.configurationId();
      this.configurationDetailsFacadeService.reloadTrigger();

      if (id) {
        this.loadApplications(id);
      } else {
        this._applications.set([]);
      }
    });

    this.loadAllApplications();
  }

  setTableSearch(value: string): void {
    this.searchTerm.set(value);
  }

  loadApplications(configurationId: number): void {
    this.isLoadingApplications.set(true);

    this.configurationService
      .getConfigurationApps(configurationId)
      .pipe(
        take(1),
        finalize(() => this.isLoadingApplications.set(false)),
      )
      .subscribe((apps) => {
        this._applications.set(apps);
      });
  }

  getActionOptions(app: TApplicationDTO): TOption<number>[] {
    const options: TOption<number>[] = [];

    if (this.isInstallOptionAvailable(app)) {
      options.push({
        value: APP_ACTION.ALLOW,
        viewValue: 'form.configuration.apps.action.install',
      });
      options.push({
        value: APP_ACTION.BLOCK,
        viewValue: 'form.configuration.apps.action.not.install',
      });
    } else {
      options.push({
        value: APP_ACTION.ALLOW,
        viewValue: 'form.configuration.apps.action.permit',
      });
      options.push({
        value: APP_ACTION.BLOCK,
        viewValue: 'form.configuration.apps.action.prohibit',
      });
    }

    if (this.isUninstallOptionAvailable(app)) {
      options.push({
        value: APP_ACTION.DELETE,
        viewValue: 'form.configuration.apps.action.delete',
      });
    }

    return options;
  }

  addApplication(app: TApplicationDTO): void {
    this.configurationDetailsFacadeService.markUnsavedChanges();

    const currentApps = this._applications();
    this._applications.set([...currentApps, { ...app, actionChanged: true }]);
  }

  getApplicationById(id: number): TApplicationDTO | null {
    const app = this._allApplications().find((app) => app.id === id);
    return app || null;
  }

  setAppAction(app: TApplicationDTO, value: number): void {
    this.configurationDetailsFacadeService.markUnsavedChanges();

    this._applications.update((apps) =>
      apps.map((a) =>
        a.id === app.id && a.version === app.version
          ? { ...a, action: value, actionChanged: true }
          : a,
      ),
    );
  }

  setAppIcon(app: TApplicationDTO, value: boolean): void {
    this.configurationDetailsFacadeService.markUnsavedChanges();

    this._applications.update((apps) =>
      apps.map((a) =>
        a.id === app.id && a.version === app.version ? { ...a, showIcon: value } : a,
      ),
    );
  }

  setAppOrder(app: TApplicationDTO, value: number | null): void {
    this.configurationDetailsFacadeService.markUnsavedChanges();

    this._applications.update((apps) =>
      apps.map((a) =>
        a.id === app.id && a.version === app.version ? { ...a, screenOrder: value } : a,
      ),
    );
  }

  updateAppDetails(app: TApplicationDTO, value: TConfigurationAppDetailsFormValue): void {
    this.configurationDetailsFacadeService.markUnsavedChanges();

    this._applications.update((apps) =>
      apps.map((a) =>
        a.id === app.id && a.version === app.version
          ? {
              ...a,
              keyCode: toKeyCode(value.keyCode),
              bottom: value.bottom,
              longTap: value.longTap,
            }
          : a,
      ),
    );
  }

  setShowSystemApps(value: boolean): void {
    this.showSystemApps.set(value);
  }

  setSortState(state: TTableSortState | null): void {
    this._sortState.set(state);
  }

  private isInstallOptionAvailable(app: TApplicationDTO): boolean {
    return !app.system && app.type === 'app' && !!(app.url || app.urlArm64 || app.urlArmeabi);
  }

  private isUninstallOptionAvailable(app: TApplicationDTO): boolean {
    return !app.system && app.type === 'app';
  }

  private loadAllApplications(): void {
    this.applicationService
      .search('')
      .pipe(take(1))
      .subscribe((apps) => {
        this._allApplications.set(apps);
      });
  }
}
