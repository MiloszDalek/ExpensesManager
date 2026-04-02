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
  created_at: ISODateTimeString;
}