import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { THttpResponse } from 'hmdm-ui-kit';
import { map, Observable, tap } from 'rxjs';
import { TConfigurationCopyFormValue } from '../../../configurations/types/configuration-copy-form.type';
import { SnackBarService } from '../../../shared/services/snack-bar.service';
import { TApplicationDTO } from '../../application/types/application-dto.type';
import { TAppConfigurationDTO } from '../types/app-configuration-dto.type';
import { TConfigurationDTO } from '../types/configuration-dto.type';
export interface TLinkConfigurationsToAppRequest {
  applicationId: number;
  configurations: TAppConfigurationDTO[];
}

export interface TLinkConfigurationsToAppVersionRequest {
  applicationVersionId: number;
  configurations: TAppConfigurationDTO[];
}

@Injectable({
  providedIn: 'root',
})
export class ConfigurationService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly snackBarService = inject(SnackBarService);

  // Switches the configuration's app to its most recent uploaded version (saved on the server at once)
  upgradeConfigurationApplication(
    configurationId: number,
    applicationId: number,
  ): Observable<THttpResponse<TConfigurationDTO>> {
    return this.http.put<THttpResponse<TConfigurationDTO>>(
      'rest/private/configurations/application/upgrade',
      { configurationId, applicationId },
    );
  }

  getConfigurationsById(id: number): Observable<TConfigurationDTO> {
    return this.http
      .get<THttpResponse<TConfigurationDTO>>(`rest/private/configurations/${id}`)
      .pipe(map((response) => response.data));
  }

  getConfigurationsPerApp(applicationId: number): Observable<TAppConfigurationDTO[]> {
    return this.http
      .get<
        THttpResponse<TAppConfigurationDTO[]>
      >(`rest/private/applications/configurations/${applicationId}`)
      .pipe(map((response) => response.data));
  }

  getConfigurationsPerVersion(versionId: number): Observable<TAppConfigurationDTO[]> {
    return this.http
      .get<
        THttpResponse<TAppConfigurationDTO[]>
      >(`rest/private/applications/version/${versionId}/configurations`)
      .pipe(map((response) => response.data));
  }

  updateApplicationConfigurations(request: TLinkConfigurationsToAppRequest): Observable<void> {
    return this.http
      .post<THttpResponse<void>>('rest/private/applications/configurations', request)
      .pipe(map(() => void 0));
  }

  updateApplicationVersionConfigurations(
    request: TLinkConfigurationsToAppVersionRequest,
  ): Observable<void> {
    return this.http
      .post<THttpResponse<void>>('rest/private/applications/version/configurations', request)
      .pipe(map(() => void 0));
  }

  searchConfigurations(term: string): Observable<TConfigurationDTO[]> {
    const url = term
      ? `rest/private/configurations/search/${term}`
      : 'rest/private/configurations/search';

    return this.http
      .get<THttpResponse<TConfigurationDTO[]>>(url)
      .pipe(map((response) => response.data));
  }

  getConfigurationApps(configurationId: number): Observable<TApplicationDTO[]> {
    return this.http
      .get<
        THttpResponse<TApplicationDTO[]>
      >(`rest/private/configurations/applications/${configurationId}`)
      .pipe(map((response) => response.data));
  }

  deleteConfiguration(id: number): Observable<void> {
    return this.http
      .delete<THttpResponse<void>>(`rest/private/configurations/${id}`)
      .pipe(map(() => void 0));
  }

  copyConfiguration(id: number, value: TConfigurationCopyFormValue): Observable<void> {
    return this.http
      .put<THttpResponse<void>>(`rest/private/configurations/copy`, { id, ...value })
      .pipe(map(() => void 0));
  }

  updateConfiguration(configuration: TConfigurationDTO): Observable<TConfigurationDTO | null> {
    return this.http
      .put<THttpResponse<TConfigurationDTO>>(`rest/private/configurations`, configuration)
      .pipe(
        map((response) => (response.status === 'OK' ? response.data : null)),
        tap((saved) => {
          if (saved) {
            this.snackBarService.success('success.configuration.saved');
          }
        }),
      );
  }
}
