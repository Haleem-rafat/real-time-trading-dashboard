import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type AlertDocument = HydratedDocument<Alert>;
export type AlertDirection = 'above' | 'below';

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
      if (ret.user) ret.user = String(ret.user);
      if (ret.triggered_at instanceof Date) {
        ret.triggered_at = ret.triggered_at.toISOString();
      }
      return ret;
    },
  },
})
export class Alert {
  id?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user: mongoose.Types.ObjectId;

  @Prop({ required: true, uppercase: true, trim: true, index: true })
  symbol: string;

  @Prop({ required: true, enum: ['above', 'below'] })
  direction: AlertDirection;

  @Prop({ required: true, min: 0 })
  price: number;

  /**
   * The price observed at the moment the alert was created. Used so the
   * threshold check knows whether the price has actually *crossed* the
   * level (vs. been on the wrong side from the start, which would fire
   * immediately on the very first tick).
   */
  @Prop({ required: true, min: 0 })
  reference_price: number;

  @Prop({ type: Date, default: null })
  triggered_at: Date | null;

  @Prop({ type: Number, default: null })
  triggered_price: number | null;

  @Prop({ default: true })
  is_active: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

// Compound index for the per-user "active alerts for this symbol" lookup
// that the price-tick listener does on every tick.
AlertSchema.index({ symbol: 1, is_active: 1 });
