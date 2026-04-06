import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ticker, TickerSchema } from './schemas/ticker.schema';
import {
  HistoricalPrice,
  HistoricalPriceSchema,
} from './schemas/historical-price.schema';
import { TickerService } from './ticker.service';
import { TickerController } from './ticker.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticker.name, schema: TickerSchema },
      { name: HistoricalPrice.name, schema: HistoricalPriceSchema },
    ]),
  ],
  controllers: [TickerController],
  providers: [TickerService],
  exports: [TickerService],
})
export class TickerModule {}
