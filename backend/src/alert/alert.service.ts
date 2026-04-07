import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Alert, AlertDocument } from './schemas/alert.schema';
import { CreateAlertDto } from './dto/create-alert.dto';
import { MarketDataService } from '../market-data/market-data.service';
import { TickerService } from '../ticker/ticker.service';
import { AppEvents } from '../common/enums/socket-events.enum';
import type { PriceTick } from '../market-data/price-generator';

export interface AlertTriggeredEvent {
  userId: string;
  alertId: string;
  symbol: string;
  direction: 'above' | 'below';
  threshold: number;
  triggeredPrice: number;
  triggeredAt: number;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger('AlertService');

  constructor(
    @InjectModel(Alert.name)
    private readonly alertModel: Model<AlertDocument>,
    private readonly marketData: MarketDataService,
    private readonly tickerService: TickerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ───────────────────────── CRUD ─────────────────────────

  async create(userId: string, dto: CreateAlertDto) {
    const symbol = dto.symbol.toUpperCase();

    // Reject unknown symbols early so the user gets a clear error.
    const exists = await this.tickerService.tickerExists(symbol);
    if (!exists) {
      throw new NotFoundException(`Ticker ${symbol} not found`);
    }

    // Reference price: prefer the live in-memory price, fall back to the
    // last persisted price. This anchors the "crossing" check.
    const reference =
      this.marketData.getLastPrice(symbol) ??
      (await this.tickerService.getBySymbol(symbol)).lastPrice;

    const alert = await this.alertModel.create({
      user: new Types.ObjectId(userId),
      symbol,
      direction: dto.direction,
      price: dto.price,
      reference_price: reference,
      triggered_at: null,
      triggered_price: null,
      is_active: true,
    });

    return alert.toJSON();
  }

  async list(userId: string) {
    const docs = await this.alertModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
    return docs.map((d) => d.toJSON());
  }

  async remove(userId: string, alertId: string) {
    if (!Types.ObjectId.isValid(alertId)) {
      throw new NotFoundException('Alert not found');
    }
    const alert = await this.alertModel.findById(alertId);
    if (!alert) throw new NotFoundException('Alert not found');
    if (String(alert.user) !== userId) {
      throw new ForbiddenException('Not your alert');
    }
    await alert.deleteOne();
    return { id: alertId };
  }

  // ───────────────────────── Triggering ─────────────────────────

  /**
   * Pure function — exported for unit tests. Returns true iff the price has
   * crossed the threshold *since the alert was created*. We require the
   * reference price to be on the opposite side of the threshold so we don't
   * fire immediately just because the user happened to set an alert that
   * was already past the line at creation time.
   */
  static shouldFire(
    direction: 'above' | 'below',
    threshold: number,
    referencePrice: number,
    currentPrice: number,
  ): boolean {
    if (direction === 'above') {
      return referencePrice <= threshold && currentPrice >= threshold;
    }
    return referencePrice >= threshold && currentPrice <= threshold;
  }

  /**
   * Called on every price tick from the market simulator. Loads any active
   * alerts for the symbol, evaluates each one, and fires the ones that
   * crossed. Database writes are kept off the hot path with a single
   * `updateMany` per matched batch (Mongo round-trip is the expensive part).
   */
  @OnEvent(AppEvents.PRICE_TICK)
  async evaluateOnTick(tick: PriceTick) {
    // Cheap pre-check using a covered query on the compound index.
    const candidates = await this.alertModel
      .find({ symbol: tick.symbol, is_active: true })
      .lean();

    if (candidates.length === 0) return;

    const fired: AlertTriggeredEvent[] = [];
    const firedIds: Types.ObjectId[] = [];
    const triggeredAt = new Date(tick.timestamp);

    for (const a of candidates) {
      if (
        AlertService.shouldFire(
          a.direction,
          a.price,
          a.reference_price,
          tick.price,
        )
      ) {
        firedIds.push(a._id);
        fired.push({
          userId: String(a.user),
          alertId: String(a._id),
          symbol: a.symbol,
          direction: a.direction,
          threshold: a.price,
          triggeredPrice: tick.price,
          triggeredAt: tick.timestamp,
        });
      }
    }

    if (fired.length === 0) return;

    // Single bulk update — flips them all to inactive + records the trigger.
    await this.alertModel.updateMany(
      { _id: { $in: firedIds } },
      {
        $set: {
          is_active: false,
          triggered_at: triggeredAt,
          triggered_price: tick.price,
        },
      },
    );

    // Hand each fired alert off to the gateway via the event bus. The
    // gateway is the only thing that holds the Socket.IO server, so this
    // keeps the service free of WS concerns.
    for (const evt of fired) {
      this.eventEmitter.emit(AppEvents.ALERT_TRIGGERED, evt);
    }

    this.logger.log(
      `🔔 Fired ${fired.length} alert(s) for ${tick.symbol} @ $${tick.price}`,
    );
  }
}
