import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Alert, AlertSchema } from './schemas/alert.schema';
import { AlertService } from './alert.service';
import { AlertController } from './alert.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { TickerModule } from '../ticker/ticker.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Alert.name, schema: AlertSchema }]),
    MarketDataModule,
    TickerModule,
  ],
  controllers: [AlertController],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
