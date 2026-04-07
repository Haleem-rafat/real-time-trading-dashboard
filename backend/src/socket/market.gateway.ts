import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { MarketDataService } from '../market-data/market-data.service';
import { AppEvents, SocketEvents } from '../common/enums/socket-events.enum';
import type { PriceTick } from '../market-data/price-generator';
import type { AuthSocket } from './interfaces/auth-socket.interface';
import type { AlertTriggeredEvent } from '../alert/alert.service';
import { createWSAuthMiddleware } from './ws-auth.middleware';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class MarketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger('MarketGateway');

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly marketData: MarketDataService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    const allowAnon = this.configService.get<boolean>('allowAnonWs') ?? true;
    const middleware = createWSAuthMiddleware(this.jwtService, allowAnon);
    server.use(middleware as Parameters<Server['use']>[0]);
    this.logger.log(
      `🔌 Socket.IO gateway initialized (allowAnonymous=${allowAnon})`,
    );
  }

  handleConnection(client: AuthSocket) {
    const user = client.data?.user;
    this.logger.log(
      `Client connected: ${client.id}${
        user ? ` (user=${user.email})` : ' (anonymous)'
      }`,
    );
    client.emit(SocketEvents.CONNECTION_READY, {
      userId: user?.sub,
      serverTime: Date.now(),
    });
    if (user?.sub) {
      void client.join(`user:${user.sub}`);
    }
  }

  handleDisconnect(client: AuthSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.SUBSCRIBE_TICKER)
  async handleSubscribeTicker(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { symbol?: string },
  ) {
    const symbol = body?.symbol?.toUpperCase();
    if (!symbol) return { ok: false, error: 'symbol is required' };
    await client.join(`ticker:${symbol}`);
    return {
      ok: true,
      lastPrice: this.marketData.getLastPrice(symbol) ?? null,
    };
  }

  @SubscribeMessage(SocketEvents.UNSUBSCRIBE_TICKER)
  async handleUnsubscribeTicker(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { symbol?: string },
  ) {
    const symbol = body?.symbol?.toUpperCase();
    if (!symbol) return { ok: false };
    await client.leave(`ticker:${symbol}`);
    return { ok: true };
  }

  @SubscribeMessage(SocketEvents.SUBSCRIBE_TICKERS)
  async handleSubscribeTickers(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() body: { symbols?: string[] },
  ) {
    const symbols = (body?.symbols ?? []).map((s) => s.toUpperCase());
    if (symbols.length === 0) {
      return { ok: false, error: 'symbols required' };
    }
    for (const sym of symbols) {
      await client.join(`ticker:${sym}`);
    }
    const snapshot: Record<string, number> = {};
    for (const sym of symbols) {
      const p = this.marketData.getLastPrice(sym);
      if (p !== undefined) snapshot[sym] = p;
    }
    return { ok: true, snapshot };
  }

  @OnEvent(AppEvents.PRICE_TICK)
  handlePriceTick(tick: PriceTick) {
    this.server
      .to(`ticker:${tick.symbol}`)
      .emit(SocketEvents.PRICE_UPDATE, tick);
  }

  @OnEvent(AppEvents.ALERT_TRIGGERED)
  handleAlertTriggered(evt: AlertTriggeredEvent) {
    // Each authenticated client joins `user:<sub>` on connect, so this
    // delivers the alert to every device the user has open.
    this.server
      .to(`user:${evt.userId}`)
      .emit(SocketEvents.ALERT_TRIGGERED, evt);
  }
}
