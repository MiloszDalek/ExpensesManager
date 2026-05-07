import client from "./client";
import type { BalanceSummary } from "@/types/balance";
import { type CurrencyEnum } from "@/types/enums";

export const dashboardApi = {
  getSettlementsSummary: async (params: { currency: CurrencyEnum }): Promise<BalanceSummary> => {
    const { data } = await client.get<BalanceSummary>("/balances/summary", { params });
    return data;
  },
};
