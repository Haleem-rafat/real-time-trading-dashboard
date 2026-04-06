import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TickerDocument = HydratedDocument<Ticker>;
export type AssetType = 'stock' | 'crypto';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.__v;
      if (ret.createdAt) {
        ret.created_at = ret.createdAt;
        delete ret.createdAt;
      }
      if (ret.updatedAt) {
        ret.updated_at = ret.updatedAt;
        delete ret.updatedAt;
      }
      return ret;
    },
  },
})
export class Ticker {
  id?: string;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  })
  symbol: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['stock', 'crypto'] })
  asset_type: AssetType;

  @Prop({ required: true })
  base_price: number;

  @Prop({ required: true, default: 0.02 })
  volatility: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: true })
  is_active: boolean;
}

export const TickerSchema = SchemaFactory.createForClass(Ticker);
