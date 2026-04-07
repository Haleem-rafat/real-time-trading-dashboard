export type TAlertDirection = 'above' | 'below';

export interface IAlert {
  id: string;
  user: string;
  symbol: string;
  direction: TAlertDirection;
  price: number;
  reference_price: number;
  triggered_at: string | null;
  triggered_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ICreateAlertPayload {
  symbol: string;
  direction: TAlertDirection;
  price: number;
}

/** Server-side `alert:triggered` socket payload */
export interface IAlertTriggeredEvent {
  userId: string;
  alertId: string;
  symbol: string;
  direction: TAlertDirection;
  threshold: number;
  triggeredPrice: number;
  triggeredAt: number;
}
