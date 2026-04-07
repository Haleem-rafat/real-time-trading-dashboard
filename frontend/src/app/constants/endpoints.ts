export const EAPI = {
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/me',
  TICKERS: '/tickers',
  ALERTS: '/alerts',
} as const;

export type EAPI = (typeof EAPI)[keyof typeof EAPI];
