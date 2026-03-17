import client from "./client";
import type {
  ApiPersonalExpenseCreate,
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseUpdate,
} from "@/types";

export const expensesPersonalApi = {
  create: async (payload: ApiPersonalExpenseCreate): Promise<ApiPersonalExpenseResponse> => {
    const { data } = await client.post<ApiPersonalExpenseResponse>("/expenses/personal/", payload);
    return data;
  },

  listAll: async (): Promise<ApiPersonalExpenseResponse[]> => {
    const { data } = await client.get<ApiPersonalExpenseResponse[]>("/expenses/personal/all");
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
