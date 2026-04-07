import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectModel } from '@nestjs/mongoose';
import type { Cache } from 'cache-manager';
import { Model, Types } from 'mongoose';
import { Ticker, TickerDocument } from './schemas/ticker.schema';
import {
  HistoricalPrice,
  HistoricalPriceDocument,
} from './schemas/historical-price.schema';
import {
  HistoryInterval,
  HistoryQueryDto,
  HistoryRange,
} from './dto/history-query.dto';
import { nextPrice } from '../market-data/price-generator';
import { SEED_TICKERS } from './seed/tickers.seed';

const TICKERS_CACHE_KEY = 'tickers:list';
const TICKERS_CACHE_TTL_MS = 60_000;
const HISTORY_CACHE_TTL_MS = 30_000;

@Injectable()
export class TickerService implements OnModuleInit {
  private readonly logger = new Logger('TickerService');

  constructor(
    @InjectModel(Ticker.name)
    private readonly tickerModel: Model<TickerDocument>,
    @InjectModel(HistoricalPrice.name)
    private readonly historyModel: Model<HistoricalPriceDocument>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async onModuleInit() {
    await this.seedTickers();
    await this.backfillHistoryIfEmpty();
  }

  private async seedTickers() {
    // Step 1: heal any existing duplicates first. This is defensive — if two
    // machines booted simultaneously against a fresh DB before the unique
    // index on `symbol` was built, both ran insertMany() and we ended up
    // with 2× rows per symbol. This step removes the extras every boot.
    await this.dedupeTickers();

    // Step 2: idempotent upsert keyed on `symbol`. Safe under concurrent
    // boots because each updateOne is atomic at the document level — even
    // if 10 machines run this in parallel they all converge on the same
    // 6-row state. $setOnInsert ensures we don't overwrite live mutations
    // (e.g. is_active toggles) on existing rows.
    const ops = SEED_TICKERS.map((t) => ({
      updateOne: {
        filter: { symbol: t.symbol },
        update: { $setOnInsert: t },
        upsert: true,
      },
    }));
    const result = await this.tickerModel.bulkWrite(ops);
    const inserted = result.upsertedCount ?? 0;
    if (inserted > 0) {
      this.logger.log(
        `✅ Seeded ${inserted} new tickers (${SEED_TICKERS.length - inserted} already present)`,
      );
    } else {
      this.logger.log(
        `Tickers already seeded (${SEED_TICKERS.length} present)`,
      );
    }
  }

  private async dedupeTickers() {
    const dupes = await this.tickerModel.aggregate<{
      _id: string;
      ids: Types.ObjectId[];
      count: number;
    }>([
      {
        $group: { _id: '$symbol', ids: { $push: '$_id' }, count: { $sum: 1 } },
      },
      { $match: { count: { $gt: 1 } } },
    ]);
    if (dupes.length === 0) return;

    let totalRemoved = 0;
    for (const group of dupes) {
      // Keep the first id (insertion order), delete the rest.
      const toDelete = group.ids.slice(1);
      const r = await this.tickerModel.deleteMany({ _id: { $in: toDelete } });
      totalRemoved += r.deletedCount ?? 0;
    }
    this.logger.warn(
      `🧹 Removed ${totalRemoved} duplicate ticker rows across ${dupes.length} symbols`,
    );
    // Invalidate any cached /tickers response so the next request reflects
    // the cleaned state immediately.
    await this.cache.del(TICKERS_CACHE_KEY);
  }

  private async backfillHistoryIfEmpty() {
    const count = await this.historyModel.countDocuments();
    if (count > 0) {
      this.logger.log(`History already backfilled (${count} points present)`);
      return;
    }

    const tickers = await this.tickerModel.find().lean();
    const now = Date.now();
    const stepMs = 60_000; // 1-minute granularity
    const points = 24 * 60; // 24h of data

    const docs: { symbol: string; price: number; timestamp: Date }[] = [];
    for (const ticker of tickers) {
      let price = ticker.base_price;
      for (let i = points; i >= 0; i--) {
        price = nextPrice(price, ticker.volatility);
        docs.push({
          symbol: ticker.symbol,
          price: Number(price.toFixed(2)),
          timestamp: new Date(now - i * stepMs),
        });
      }
    }
    await this.historyModel.insertMany(docs);
    this.logger.log(
      `✅ Backfilled ${docs.length} historical price points (${tickers.length} tickers × ${points + 1} steps)`,
    );
  }

  async getAll() {
    const cached = await this.cache.get<unknown>(TICKERS_CACHE_KEY);
    if (cached) return cached;

    const tickers = await this.tickerModel
      .find({ is_active: true })
      .sort({ symbol: 1 });
    const result = tickers.map((t) => t.toJSON());
    await this.cache.set(TICKERS_CACHE_KEY, result, TICKERS_CACHE_TTL_MS);
    return result;
  }

  async getBySymbol(symbol: string) {
    const upper = symbol.toUpperCase();
    const ticker = await this.tickerModel.findOne({ symbol: upper });
    if (!ticker) {
      throw new NotFoundException(`Ticker ${upper} not found`);
    }
    const last = await this.historyModel
      .findOne({ symbol: upper })
      .sort({ timestamp: -1 })
      .lean();

    return {
      ticker: ticker.toJSON(),
      lastPrice: last?.price ?? ticker.base_price,
      lastTimestamp: last?.timestamp ?? new Date(),
    };
  }

  async getHistory(symbol: string, query: HistoryQueryDto) {
    const upper = symbol.toUpperCase();
    const range = query.range ?? '1h';
    const interval = query.interval ?? '1m';

    const cacheKey = `history:${upper}:${range}:${interval}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) return cached;

    const exists = await this.tickerModel.exists({ symbol: upper });
    if (!exists) throw new NotFoundException(`Ticker ${upper} not found`);

    const rangeMs = this.parseRangeMs(range);
    const intervalMs = this.parseIntervalMs(interval);
    const since = new Date(Date.now() - rangeMs);

    const raw = await this.historyModel
      .find({ symbol: upper, timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .lean();

    // Bucket raw points into the requested interval (avg per bucket)
    const buckets = new Map<
      number,
      { sum: number; count: number; ts: number }
    >();
    for (const point of raw) {
      const bucketTs =
        Math.floor(point.timestamp.getTime() / intervalMs) * intervalMs;
      const existing = buckets.get(bucketTs);
      if (existing) {
        existing.sum += point.price;
        existing.count += 1;
      } else {
        buckets.set(bucketTs, { sum: point.price, count: 1, ts: bucketTs });
      }
    }

    const result = Array.from(buckets.values())
      .sort((a, b) => a.ts - b.ts)
      .map((b) => ({
        timestamp: new Date(b.ts).toISOString(),
        price: Number((b.sum / b.count).toFixed(2)),
      }));

    await this.cache.set(cacheKey, result, HISTORY_CACHE_TTL_MS);
    return result;
  }

  /** Used by Step 6 simulator to seed in-memory state */
  async getActiveTickers() {
    return this.tickerModel.find({ is_active: true }).lean();
  }

  /** Cheap existence check used by AlertService when validating user input */
  async tickerExists(symbol: string): Promise<boolean> {
    const upper = symbol.toUpperCase();
    const found = await this.tickerModel.exists({ symbol: upper });
    return Boolean(found);
  }

  /** Used by Step 6 simulator to persist live ticks in batches */
  async appendHistory(
    docs: { symbol: string; price: number; timestamp: Date }[],
  ) {
    if (docs.length === 0) return;
    await this.historyModel.insertMany(docs);
  }

  private parseRangeMs(range: HistoryRange): number {
    switch (range) {
      case '1h':
        return 60 * 60 * 1000;
      case '1d':
        return 24 * 60 * 60 * 1000;
      case '1w':
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private parseIntervalMs(interval: HistoryInterval): number {
    switch (interval) {
      case '1m':
        return 60 * 1000;
      case '5m':
        return 5 * 60 * 1000;
      case '1h':
        return 60 * 60 * 1000;
    }
  }
}
