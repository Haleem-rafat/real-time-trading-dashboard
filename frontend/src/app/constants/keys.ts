export const ELocalStorageKeys = {
  TOKEN: 'trading_token',
  USER: 'trading_user',
} as const;

export type ELocalStorageKeys =
  (typeof ELocalStorageKeys)[keyof typeof ELocalStorageKeys];

export const SWR_KEYS = {
  TICKERS: 'tickers',
  TICKER_HISTORY: (symbol: string, range: string, interval: string) =>
    ['ticker-history', symbol, range, interval] as const,
  ALERTS: 'alerts',
} as const;
