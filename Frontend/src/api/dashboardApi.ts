import client from "./client";
import type {
  KPISummary,
  AttentionItem,
  TrendData,
  CategoryBreakdown,
  BudgetStatus,
  SettlementSnapshot,
  AggregationPeriod,
} from "@/types/dashboard";
import { type CurrencyEnum } from "@/types/enums";

export const dashboardApi = {
  getKPI: async (params?: { budget_id?: number; currency?: CurrencyEnum }): Promise<KPISummary> => {
    const { data } = await client.get<KPISummary>("/dashboard/kpi", { params });
    return data;
  },

  getAttentionItems: async (params?: { limit?: number; currency?: CurrencyEnum }): Promise<AttentionItem[]> => {
    const { data } = await client.get<AttentionItem[]>("/dashboard/attention", { params });
    return data;
  },

  getTrend: async (params?: {
    period?: AggregationPeriod;
    budget_id?: number;
    date_from?: string;
    date_to?: string;
    currency?: CurrencyEnum;
  }): Promise<TrendData> => {
    const { data } = await client.get<TrendData>("/dashboard/trend", { params });
    return data;
  },

  getCategories: async (params?: {
    budget_id?: number;
    date_from?: string;
    date_to?: string;
    currency?: CurrencyEnum;
  }): Promise<CategoryBreakdown> => {
    const { data } = await client.get<CategoryBreakdown>("/dashboard/categories", { params });
    return data;
  },

  getBudgets: async (params?: { budget_id?: number; currency?: CurrencyEnum }): Promise<BudgetStatus[]> => {
    const { data } = await client.get<BudgetStatus[]>("/dashboard/budgets", { params });
    return data;
  },

  getSettlements: async (params?: { currency?: CurrencyEnum }): Promise<SettlementSnapshot> => {
    const { data } = await client.get<SettlementSnapshot>("/dashboard/settlements", { params });
    return data;
  },
};
