import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type HistoricalPriceDocument = HydratedDocument<HistoricalPrice>;

@Schema({ timestamps: false })
export class HistoricalPrice {
  @Prop({ required: true, uppercase: true, index: true })
  symbol: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop()
  volume?: number;
}

export const HistoricalPriceSchema =
  SchemaFactory.createForClass(HistoricalPrice);
HistoricalPriceSchema.index({ symbol: 1, timestamp: -1 });
