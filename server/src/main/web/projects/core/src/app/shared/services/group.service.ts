import { HttpClient } from '@angular/common/http';
import {
  computed,
  effect,
  inject,
  Injectable,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { take } from 'rxjs';
import { TOption } from 'hmdm-ui-kit';
import { TGroup } from '../types/group.type';
import { THttpResponse } from '../types/http-response.type';
import { UserStateService } from './user-state.service';

@Injectable({
  providedIn: 'root',
})
export class GroupService {
  private readonly http: HttpClient = inject(HttpClient);
  private readonly userStateService = inject(UserStateService);

  private _allGroups: WritableSignal<TGroup[]> = signal([]);
  allGroups = this._allGroups.asReadonly();
  groupsOptions: Signal<TOption<number>[]> = computed(() =>
    this._allGroups().map((group) => ({
      viewValue: group.name,
      value: group.id,
    })),
  );

  constructor() {
    // Reload on user change (login / impersonate), the data is customer-specific
    effect(() => {
      const userId = this.userStateService.currentUser()?.id;
      untracked(() => {
        if (userId) {
          this.fetchAll();
        } else {
          this._allGroups.set([]);
        }
      });
    });
  }

  fetchAll(): void {
    this.http
      .get<THttpResponse<TGroup[]>>(`rest/private/groups/search`)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this._allGroups.set(response.data || []);
        },
        error: (error) => {
          console.error('Error fetching groups:', error);
          this._allGroups.set([]);
        },
      });
  }
}
