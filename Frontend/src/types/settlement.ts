import type { CurrencyEnum, PaymentMethod, SettlementStatus } from "./enums";
import type { DecimalLike, ISODateTimeString } from "./common";

export interface ApiSettlementCreate {
  to_user_id: number;
  group_id?: number | null;
  transaction_id?: string | null;
}

export interface ApiSettlementResponse {
  id: number;
  from_user_id: number;
  to_user_id: number;
  group_id: number;
  amount: DecimalLike;
  currency: CurrencyEnum;
  payment_method: PaymentMethod;
  status: SettlementStatus;
  transaction_id?: string | null;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  created_at: ISODateTimeString;
}

export interface ApiPayPalSettlementInitiateCreate {
  to_user_id: number;
  group_id: number;
}

export interface ApiPayPalSettlementInitiateResponse {
  settlement_id: number;
  order_id: string;
  approve_url: string;
  status: SettlementStatus;
}

export interface ApiPayPalTotalSettlementInitiateCreate {
  to_user_id: number;
}

export interface ApiPayPalTotalSettlementInitiateResponse {
  settlement_ids: number[];
  order_id: string;
  approve_url: string;
  status: SettlementStatus;
}

export interface ApiPayPalSettlementFinalizeRequest {
  order_id: string;
}