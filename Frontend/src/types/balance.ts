import type { DecimalLike } from "./common";
import type { CurrencyEnum } from "./enums";

export interface ApiUserBalanceItem {
  user_id: number;
  amount: DecimalLike;
}

export interface ApiGroupBalances {
  group_id: number;
  total_balance: DecimalLike;
  balances: ApiUserBalanceItem[];
}

export interface ApiContactBalanceByGroup {
  group_id: number;
  balance: DecimalLike;
  group_name?: string | null;
  group_currency?: CurrencyEnum | null;
}