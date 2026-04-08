import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { ELocalStorageKeys } from '@constants/keys';
import type { IUser } from '../../app/api/types/auth.types';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
}

function loadUser(): IUser | null {
  try {
    const raw = localStorage.getItem(ELocalStorageKeys.USER);
    return raw ? (JSON.parse(raw) as IUser) : null;
  } catch {
    return null;
  }
}

// Synthetic read-only user we surface in the UI for guest sessions.
// Not persisted as a real user; `isGuest` is what gates auth-only features.
const GUEST_USER: IUser = {
  id: 'guest',
  email: 'guest@tradingterm.local',
  first_name: 'Guest',
  last_name: '',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

const initialToken = localStorage.getItem(ELocalStorageKeys.TOKEN);
const initialUser = loadUser();
const initialIsGuest = localStorage.getItem(ELocalStorageKeys.GUEST) === '1';

const initialState: AuthState = {
  user: initialIsGuest ? GUEST_USER : initialUser,
  token: initialIsGuest ? null : initialToken,
  isAuthenticated: initialIsGuest || Boolean(initialToken && initialUser),
  isGuest: initialIsGuest,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: IUser; token: string }>,
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isGuest = false;
      localStorage.setItem(ELocalStorageKeys.TOKEN, action.payload.token);
      localStorage.setItem(
        ELocalStorageKeys.USER,
        JSON.stringify(action.payload.user),
      );
      localStorage.removeItem(ELocalStorageKeys.GUEST);
    },
    enterGuestMode(state) {
      state.user = GUEST_USER;
      state.token = null;
      state.isAuthenticated = true;
      state.isGuest = true;
      localStorage.setItem(ELocalStorageKeys.GUEST, '1');
      localStorage.removeItem(ELocalStorageKeys.TOKEN);
      localStorage.removeItem(ELocalStorageKeys.USER);
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isGuest = false;
      localStorage.removeItem(ELocalStorageKeys.TOKEN);
      localStorage.removeItem(ELocalStorageKeys.USER);
      localStorage.removeItem(ELocalStorageKeys.GUEST);
    },
  },
});

export const { setCredentials, enterGuestMode, logout } = authSlice.actions;
export default authSlice.reducer;
