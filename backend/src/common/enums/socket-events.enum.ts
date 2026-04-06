export enum SocketEvents {
  // Server → Client
  CONNECTION_READY = 'connection:ready',
  PRICE_UPDATE = 'price:update',
  ERROR = 'error',

  // Client → Server
  SUBSCRIBE_TICKER = 'subscribe:ticker',
  UNSUBSCRIBE_TICKER = 'unsubscribe:ticker',
  SUBSCRIBE_TICKERS = 'subscribe:tickers',
}

export enum AppEvents {
  PRICE_TICK = 'price.tick',
}
