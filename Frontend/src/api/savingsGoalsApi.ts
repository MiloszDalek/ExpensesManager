import client from "./client";
import type {
  ApiSavingsGoalAllocateRequest,
  ApiSavingsGoalAutoAllocateSummaryResponse,
  ApiSavingsGoalCreate,
  ApiSavingsGoalProgressResponse,
  ApiSavingsGoalResponse,
  ApiSavingsGoalUpdate,
} from "@/types";

export const savingsGoalsApi = {
  list: async (params?: { include_inactive?: boolean }): Promise<ApiSavingsGoalResponse[]> => {
    const { data } = await client.get<ApiSavingsGoalResponse[]>("/savings-goals/", { params });
    return data;
  },

  getById: async (goalId: number): Promise<ApiSavingsGoalResponse> => {
    const { data } = await client.get<ApiSavingsGoalResponse>(`/savings-goals/${goalId}`);
    return data;
  },

  getProgress: async (goalId: number): Promise<ApiSavingsGoalProgressResponse> => {
    const { data } = await client.get<ApiSavingsGoalProgressResponse>(`/savings-goals/${goalId}/progress`);
    return data;
  },

  create: async (payload: ApiSavingsGoalCreate): Promise<ApiSavingsGoalResponse> => {
    const { data } = await client.post<ApiSavingsGoalResponse>("/savings-goals/", payload);
    return data;
  },

  update: async (goalId: number, payload: ApiSavingsGoalUpdate): Promise<ApiSavingsGoalResponse> => {
    const { data } = await client.patch<ApiSavingsGoalResponse>(`/savings-goals/${goalId}`, payload);
    return data;
  },

  allocate: async (goalId: number, payload: ApiSavingsGoalAllocateRequest): Promise<ApiSavingsGoalProgressResponse> => {
    const { data } = await client.post<ApiSavingsGoalProgressResponse>(`/savings-goals/${goalId}/allocate`, payload);
    return data;
  },

  autoAllocateForBudget: async (budgetId: number): Promise<ApiSavingsGoalAutoAllocateSummaryResponse> => {
    const { data } = await client.post<ApiSavingsGoalAutoAllocateSummaryResponse>(`/savings-goals/auto-allocate/${budgetId}`);
    return data;
  },

  remove: async (goalId: number): Promise<void> => {
    await client.delete(`/savings-goals/${goalId}`);
  },
};
