/** Mirrors backend/src/common/enums/socket-events.enum.ts */
export const ESocketEvents = {
  // Server → Client
  CONNECTION_READY: 'connection:ready',
  PRICE_UPDATE: 'price:update',
  ALERT_TRIGGERED: 'alert:triggered',
  ERROR: 'error',

  // Client → Server
  SUBSCRIBE_TICKER: 'subscribe:ticker',
  UNSUBSCRIBE_TICKER: 'unsubscribe:ticker',
  SUBSCRIBE_TICKERS: 'subscribe:tickers',
} as const;

export type ESocketEvents = (typeof ESocketEvents)[keyof typeof ESocketEvents];
