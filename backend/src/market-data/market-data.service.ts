import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TickerService } from '../ticker/ticker.service';
import { AppEvents } from '../common/enums/socket-events.enum';
import { nextPrice, PriceTick } from './price-generator';

interface TickerState {
  symbol: string;
  basePrice: number;
  volatility: number;
  price: number;
  /**
   * The price the simulator first observed for this symbol when it
   * booted. Used as the reference for the session-relative `change` and
   * `changePct` carried in every tick payload — so the dashboard's
   * "+2.34%" badge stays meaningful instead of flipping sign every
   * second from the per-tick noise.
   */
  sessionOpen: number;
}

const FLUSH_EVERY_N_TICKS = 10;

/**
 * Mild mean-reversion: each tick pulls the price ~0.5% of the
 * normalized distance toward base_price. Without this, a pure
 * random walk drifts unbounded over a long-running session.
 */
const MEAN_REVERSION_STRENGTH = 0.005;

@Injectable()
export class MarketDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MarketDataService');
  private intervalHandle: NodeJS.Timeout | null = null;
  private state = new Map<string, TickerState>();
  private buffer: { symbol: string; price: number; timestamp: Date }[] = [];
  private tickCount = 0;

  constructor(
    private readonly tickerService: TickerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.loadInitialState();
    const intervalMs = this.configService.get<number>('tickIntervalMs') ?? 1000;
    this.intervalHandle = setInterval(() => this.tick(), intervalMs);
    this.logger.log(
      `🚀 Market simulator running (${this.state.size} tickers, every ${intervalMs}ms)`,
    );
  }

  async onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    await this.flushBuffer();
    this.logger.log('Market simulator stopped');
  }

  private async loadInitialState() {
    const tickers = await this.tickerService.getActiveTickers();
    for (const t of tickers) {
      // Seed in-memory state from the latest persisted price (or base_price)
      const snapshot = await this.tickerService.getBySymbol(t.symbol);
      this.state.set(t.symbol, {
        symbol: t.symbol,
        basePrice: t.base_price,
        volatility: t.volatility,
        price: snapshot.lastPrice,
        sessionOpen: snapshot.lastPrice,
      });
    }
  }

  private tick() {
    const now = new Date();
    const ts = now.getTime();

    for (const [symbol, s] of this.state) {
      const prev = s.price;
      const drift = ((s.basePrice - prev) / prev) * MEAN_REVERSION_STRENGTH;
      const next = Number(nextPrice(prev, s.volatility, drift).toFixed(2));
      // Session-relative — vs the price the simulator first saw for this
      // symbol. This makes the percent stable enough to display in a
      // ticker row without flipping sign on every tick from per-tick noise.
      const change = Number((next - s.sessionOpen).toFixed(2));
      const changePct = Number(((change / s.sessionOpen) * 100).toFixed(4));

      s.price = next;

      const payload: PriceTick = {
        symbol,
        price: next,
        change,
        changePct,
        timestamp: ts,
      };
      this.eventEmitter.emit(AppEvents.PRICE_TICK, payload);
      this.buffer.push({ symbol, price: next, timestamp: now });
    }

    this.tickCount++;
    if (this.tickCount % FLUSH_EVERY_N_TICKS === 0) {
      void this.flushBuffer();
    }
  }

  private async flushBuffer() {
    if (this.buffer.length === 0) return;
    const docs = this.buffer.splice(0);
    try {
      await this.tickerService.appendHistory(docs);
    } catch (err) {
      this.logger.error(
        `Failed to flush history buffer: ${(err as Error).message}`,
      );
    }
  }

  /** Used by Step 7's Socket.IO gateway to ack subscriptions with a snapshot */
  getLastPrice(symbol: string): number | undefined {
    return this.state.get(symbol.toUpperCase())?.price;
  }

  getAllLastPrices(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [symbol, s] of this.state) {
      result[symbol] = s.price;
    }
    return result;
  }
}
