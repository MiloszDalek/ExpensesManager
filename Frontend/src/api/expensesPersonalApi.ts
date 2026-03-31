import client from "./client";
import type {
  ApiPersonalExpenseCreate,
  ApiPersonalExpenseListParams,
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseSummaryResponse,
  ApiPersonalExpenseUpdate,
} from "@/types";

export const expensesPersonalApi = {
  create: async (payload: ApiPersonalExpenseCreate): Promise<ApiPersonalExpenseResponse> => {
    const { data } = await client.post<ApiPersonalExpenseResponse>("/expenses/personal/", payload);
    return data;
  },

  list: async (params: ApiPersonalExpenseListParams = {}): Promise<ApiPersonalExpenseResponse[]> => {
    const { limit = 20, offset = 0, ...filters } = params;

    const { data } = await client.get<ApiPersonalExpenseResponse[]>("/expenses/personal/", {
      params: {
        limit,
        offset,
        ...filters,
      },
    });
    return data;
  },

  summary: async (
    params: Omit<ApiPersonalExpenseListParams, "limit" | "offset"> = {}
  ): Promise<ApiPersonalExpenseSummaryResponse> => {
    const { data } = await client.get<ApiPersonalExpenseSummaryResponse>("/expenses/personal/summary", {
      params,
    });

    return data;
  },

  update: async (
    expenseId: number,
    payload: ApiPersonalExpenseUpdate
  ): Promise<ApiPersonalExpenseResponse> => {
    const { data } = await client.patch<ApiPersonalExpenseResponse>(
      `/expenses/personal/${expenseId}`,
      payload
    );
    return data;
  },

  delete: async (expenseId: number): Promise<void> => {
    await client.delete(`/expenses/personal/${expenseId}`);
  },
};
