import type { DecimalLike } from "./common";

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
}