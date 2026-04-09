import client from "./client";
import type {
  ApiRecurringExpenseResponse,
  ApiRecurringExpenseUpdate,
  ApiRecurringForecastResponse,
  ApiRecurringGenerationSummaryResponse,
  ApiRecurringGroupExpenseCreate,
  ApiRecurringPersonalExpenseCreate,
  RecurringScope,
} from "@/types";
import type { RecurringExpenseStatus } from "@/types/enums";

export type RecurringListParams = {
  limit?: number;
  offset?: number;
  scope?: RecurringScope;
  group_id?: number;
  status?: RecurringExpenseStatus;
};

export type RecurringForecastParams = {
  date_from: string;
  date_to: string;
  scope?: RecurringScope;
  group_id?: number;
};

export type GenerateDueParams = {
  up_to_date?: string;
  limit?: number;
};

export type GenerateNowParams = {
  up_to_date?: string;
};

export const recurringExpensesApi = {
  createPersonal: async (
    payload: ApiRecurringPersonalExpenseCreate
  ): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.post<ApiRecurringExpenseResponse>("/recurring-expenses/personal", payload);
    return data;
  },

  createGroup: async (
    groupId: number,
    payload: ApiRecurringGroupExpenseCreate
  ): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.post<ApiRecurringExpenseResponse>(
      `/recurring-expenses/group/${groupId}`,
      payload
    );
    return data;
  },

  list: async (params: RecurringListParams = {}): Promise<ApiRecurringExpenseResponse[]> => {
    const { data } = await client.get<ApiRecurringExpenseResponse[]>("/recurring-expenses/", { params });
    return data;
  },

  getById: async (recurringExpenseId: number): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.get<ApiRecurringExpenseResponse>(
      `/recurring-expenses/${recurringExpenseId}`
    );
    return data;
  },

  update: async (
    recurringExpenseId: number,
    payload: ApiRecurringExpenseUpdate
  ): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.patch<ApiRecurringExpenseResponse>(
      `/recurring-expenses/${recurringExpenseId}`,
      payload
    );
    return data;
  },

  pause: async (recurringExpenseId: number): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.post<ApiRecurringExpenseResponse>(
      `/recurring-expenses/${recurringExpenseId}/pause`
    );
    return data;
  },

  resume: async (recurringExpenseId: number): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.post<ApiRecurringExpenseResponse>(
      `/recurring-expenses/${recurringExpenseId}/resume`
    );
    return data;
  },

  archive: async (recurringExpenseId: number): Promise<ApiRecurringExpenseResponse> => {
    const { data } = await client.post<ApiRecurringExpenseResponse>(
      `/recurring-expenses/${recurringExpenseId}/archive`
    );
    return data;
  },

  delete: async (recurringExpenseId: number): Promise<void> => {
    await client.delete(`/recurring-expenses/${recurringExpenseId}`);
  },

  generateNow: async (
    recurringExpenseId: number,
    params: GenerateNowParams = {}
  ): Promise<ApiRecurringGenerationSummaryResponse> => {
    const { data } = await client.post<ApiRecurringGenerationSummaryResponse>(
      `/recurring-expenses/${recurringExpenseId}/generate-now`,
      null,
      { params }
    );
    return data;
  },

  generateDue: async (params: GenerateDueParams = {}): Promise<ApiRecurringGenerationSummaryResponse> => {
    const { data } = await client.post<ApiRecurringGenerationSummaryResponse>(
      "/recurring-expenses/generate-due",
      null,
      { params }
    );
    return data;
  },

  forecast: async (params: RecurringForecastParams): Promise<ApiRecurringForecastResponse> => {
    const { data } = await client.get<ApiRecurringForecastResponse>("/recurring-expenses/forecast", {
      params,
    });
    return data;
  },
};
