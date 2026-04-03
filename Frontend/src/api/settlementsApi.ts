import client from "./client";
import type {
  ApiSettlementCreate,
  ApiSettlementResponse,
  ApiPayPalSettlementInitiateCreate,
  ApiPayPalSettlementInitiateResponse,
  ApiPayPalTotalSettlementInitiateCreate,
  ApiPayPalTotalSettlementInitiateResponse,
  ApiPayPalSettlementFinalizeRequest,
} from "@/types";

export const settlementsApi = {
  createGroupCash: async (payload: ApiSettlementCreate): Promise<ApiSettlementResponse> => {
    const { data } = await client.post<ApiSettlementResponse>("/settlements/group/cash", payload);
    return data;
  },

  createTotalCash: async (payload: ApiSettlementCreate): Promise<ApiSettlementResponse[]> => {
    const { data } = await client.post<ApiSettlementResponse[]>("/settlements/total/cash", payload);
    return data;
  },

  initiateGroupPayPal: async (
    payload: ApiPayPalSettlementInitiateCreate
  ): Promise<ApiPayPalSettlementInitiateResponse> => {
    const { data } = await client.post<ApiPayPalSettlementInitiateResponse>(
      "/settlements/group/paypal/initiate",
      payload
    );
    return data;
  },

  initiateTotalPayPal: async (
    payload: ApiPayPalTotalSettlementInitiateCreate
  ): Promise<ApiPayPalTotalSettlementInitiateResponse> => {
    const { data } = await client.post<ApiPayPalTotalSettlementInitiateResponse>(
      "/settlements/total/paypal/initiate",
      payload
    );
    return data;
  },

  finalizePayPal: async (payload: ApiPayPalSettlementFinalizeRequest): Promise<ApiSettlementResponse> => {
    const { data } = await client.post<ApiSettlementResponse>("/settlements/paypal/finalize", payload);
    return data;
  },

  getByGroup: async (groupId: number, params?: { limit?: number; offset?: number }): Promise<ApiSettlementResponse[]> => {
    const { data } = await client.get<ApiSettlementResponse[]>(`/settlements/groups/${groupId}/all`, { params });
    return data;
  },

  getByUser: async (params?: { limit?: number; offset?: number }): Promise<ApiSettlementResponse[]> => {
    const { data } = await client.get<ApiSettlementResponse[]>("/settlements/user/all", { params });
    return data;
  },
};
