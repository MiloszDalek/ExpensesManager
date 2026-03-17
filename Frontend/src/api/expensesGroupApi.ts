import client from "./client";
import type {
  ApiGroupExpenseCreate,
  ApiGroupExpenseResponse,
  ApiGroupExpenseUpdate,
} from "@/types";

export const expensesGroupApi = {
  create: async (groupId: number, payload: ApiGroupExpenseCreate): Promise<ApiGroupExpenseResponse> => {
    const { data } = await client.post<ApiGroupExpenseResponse>(`/expenses/group/${groupId}`, payload);
    return data;
  },

  list: async (
    groupId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiGroupExpenseResponse[]> => {
    const { data } = await client.get<ApiGroupExpenseResponse[]>(`/expenses/group/${groupId}`, {
      params,
    });
    return data;
  },

  update: async (
    groupId: number,
    expenseId: number,
    payload: ApiGroupExpenseUpdate
  ): Promise<ApiGroupExpenseResponse> => {
    const { data } = await client.patch<ApiGroupExpenseResponse>(
      `/expenses/group/${groupId}/${expenseId}`,
      payload
    );
    return data;
  },

  delete: async (groupId: number, expenseId: number): Promise<void> => {
    await client.delete(`/expenses/group/${groupId}/${expenseId}`);
  },
};
