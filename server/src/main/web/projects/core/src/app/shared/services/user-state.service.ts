import { inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { TUserDTO } from '../../entity/user/types/user-dto.type';
import { UserService } from '../../entity/user/services/user.service';
import { take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserStateService {
  private readonly _currentUser: WritableSignal<TUserDTO | null> = signal(null);
  private readonly userService = inject(UserService);

  currentUser: Signal<TUserDTO | null> = this._currentUser.asReadonly();

  constructor() {
    this.userService
      .getCurrentUser()
      .pipe(take(1))
      .subscribe((user) => {
        this._currentUser.set(user);
      });
  }

  setCurrentUser(user: TUserDTO | null): void {
    this._currentUser.set(user);
  }
}
