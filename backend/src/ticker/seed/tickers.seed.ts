import { AssetType } from '../schemas/ticker.schema';

export interface SeedTicker {
  symbol: string;
  name: string;
  asset_type: AssetType;
  base_price: number;
  volatility: number;
  currency: string;
}

export const SEED_TICKERS: SeedTicker[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    asset_type: 'stock',
    base_price: 187.42,
    volatility: 0.015,
    currency: 'USD',
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    asset_type: 'stock',
    base_price: 242.84,
    volatility: 0.025,
    currency: 'USD',
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    asset_type: 'stock',
    base_price: 156.3,
    volatility: 0.018,
    currency: 'USD',
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    asset_type: 'stock',
    base_price: 182.5,
    volatility: 0.02,
    currency: 'USD',
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    asset_type: 'crypto',
    base_price: 67450,
    volatility: 0.03,
    currency: 'USD',
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    asset_type: 'crypto',
    base_price: 3520,
    volatility: 0.035,
    currency: 'USD',
  },
];
