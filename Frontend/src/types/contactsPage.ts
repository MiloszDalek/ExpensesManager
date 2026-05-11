import type { ApiContactResponse } from "./contact";

export type ContactBalanceRow = {
  contact: ApiContactResponse;
  currencyTotals: Record<string, number>;
  absoluteTotal: number;
};

export type GroupSettlementTarget = {
  contactUserId: number;
  contactUsername: string;
  groupId: number;
  groupName: string;
  amount: number;
  currency: string;
};

export type TotalSettlementTarget = {
  contactUserId: number;
  contactUsername: string;
};

export type TotalSettlementOptionsTarget = {
  contactUserId: number;
  contactUsername: string;
  currency: string;
};
