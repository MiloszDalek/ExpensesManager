import client from "./client";
import type {
  ApiBudgetPlanCreate,
  ApiBudgetPlanResponse,
  ApiBudgetPlanUpdate,
  ApiBudgetPoolCreate,
  ApiBudgetPoolResponse,
  ApiBudgetPoolUpdate,
  ApiBudgetSummaryResponse,
  ApiIncomeEntryCreate,
  ApiIncomeEntryResponse,
  ApiIncomeListParams,
  ApiIncomeSummaryResponse,
} from "@/types";
import type { BudgetStatus } from "@/types/enums";

export const budgetsApi = {
  listBudgets: async (status?: BudgetStatus): Promise<ApiBudgetPlanResponse[]> => {
    const { data } = await client.get<ApiBudgetPlanResponse[]>("/budgets/", {
      params: { status },
    });
    return data;
  },

  getBudget: async (budgetId: number): Promise<ApiBudgetPlanResponse> => {
    const { data } = await client.get<ApiBudgetPlanResponse>(`/budgets/${budgetId}`);
    return data;
  },

  createBudget: async (payload: ApiBudgetPlanCreate): Promise<ApiBudgetPlanResponse> => {
    const { data } = await client.post<ApiBudgetPlanResponse>("/budgets/", payload);
    return data;
  },

  updateBudget: async (budgetId: number, payload: ApiBudgetPlanUpdate): Promise<ApiBudgetPlanResponse> => {
    const { data } = await client.patch<ApiBudgetPlanResponse>(`/budgets/${budgetId}`, payload);
    return data;
  },

  deleteBudget: async (budgetId: number): Promise<void> => {
    await client.delete(`/budgets/${budgetId}`);
  },

  addPool: async (budgetId: number, payload: ApiBudgetPoolCreate): Promise<ApiBudgetPoolResponse> => {
    const { data } = await client.post<ApiBudgetPoolResponse>(`/budgets/${budgetId}/pools`, payload);
    return data;
  },

  updatePool: async (
    budgetId: number,
    poolId: number,
    payload: ApiBudgetPoolUpdate
  ): Promise<ApiBudgetPoolResponse> => {
    const { data } = await client.patch<ApiBudgetPoolResponse>(`/budgets/${budgetId}/pools/${poolId}`, payload);
    return data;
  },

  deletePool: async (budgetId: number, poolId: number): Promise<void> => {
    await client.delete(`/budgets/${budgetId}/pools/${poolId}`);
  },

  getBudgetSummary: async (budgetId: number): Promise<ApiBudgetSummaryResponse> => {
    const { data } = await client.get<ApiBudgetSummaryResponse>(`/budgets/${budgetId}/summary`);
    return data;
  },

  listIncome: async (params: ApiIncomeListParams = {}): Promise<ApiIncomeEntryResponse[]> => {
    const { limit = 20, offset = 0, ...filters } = params;
    const { data } = await client.get<ApiIncomeEntryResponse[]>("/income/", {
      params: {
        limit,
        offset,
        ...filters,
      },
    });
    return data;
  },

  createIncome: async (payload: ApiIncomeEntryCreate): Promise<ApiIncomeEntryResponse> => {
    const { data } = await client.post<ApiIncomeEntryResponse>("/income/", payload);
    return data;
  },

  deleteIncome: async (incomeId: number): Promise<void> => {
    await client.delete(`/income/${incomeId}`);
  },

  getIncomeSummary: async (params?: { date_from?: string; date_to?: string }): Promise<ApiIncomeSummaryResponse> => {
    const { data } = await client.get<ApiIncomeSummaryResponse>("/income/summary", { params });
    return data;
  },
};
