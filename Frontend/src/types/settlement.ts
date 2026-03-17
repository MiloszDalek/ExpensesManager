import type { CurrencyEnum, PaymentMethod, SettlementStatus } from "./enums";
import type { ISODateTimeString } from "./common";

export interface ApiSettlementCreate {
  to_user_id: number;
  group_id?: number | null;
  currency?: CurrencyEnum;
  payment_method?: PaymentMethod;
  transaction_id?: string | null;
}

export interface ApiSettlementResponse extends ApiSettlementCreate {
  id: number;
  status: SettlementStatus;
  created_at: ISODateTimeString;
}