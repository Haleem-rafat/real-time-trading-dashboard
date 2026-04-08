import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  enterGuestMode,
  logout,
  setCredentials,
} from '@store/slices/authSlice';
import authService from '@services/auth.service';
import type {
  ILoginPayload,
  IRegisterPayload,
} from '../app/api/types/auth.types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isGuest } = useAppSelector(
    (s) => s.auth,
  );

  const login = async (payload: ILoginPayload) => {
    const result = await authService.login(payload);
    dispatch(setCredentials({ user: result.user, token: result.access_token }));
    return result;
  };

  const register = async (payload: IRegisterPayload) => {
    const result = await authService.register(payload);
    dispatch(setCredentials({ user: result.user, token: result.access_token }));
    return result;
  };

  const continueAsGuest = () => {
    dispatch(enterGuestMode());
  };

  const signOut = () => {
    dispatch(logout());
  };

  return {
    user,
    token,
    isAuthenticated,
    isGuest,
    login,
    register,
    continueAsGuest,
    signOut,
  };
}
