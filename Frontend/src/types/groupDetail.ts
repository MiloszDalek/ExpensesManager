export type SettlementDialogTarget = {
  userId: number;
  memberName: string;
  absoluteAmount: number;
};

export type OutsideAppConfirmTarget = {
  userId: number;
  absoluteAmount: number;
};

export type BalanceRow = {
  userId: number;
  memberName: string;
  relationLabel: string;
  amount: number;
  absoluteAmount: number;
};

export type UserBalanceSummary = {
  othersOweMe: number;
  iOweOthers: number;
  unsettledCount: number;
};
