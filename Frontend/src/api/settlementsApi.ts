import client from "./client";
import type { ApiSettlementCreate, ApiSettlementResponse } from "@/types";

export const settlementsApi = {
  createGroupCash: async (payload: ApiSettlementCreate): Promise<ApiSettlementResponse> => {
    const { data } = await client.post<ApiSettlementResponse>("/settlements/group/cash", payload);
    return data;
  },

  createTotalCash: async (payload: ApiSettlementCreate): Promise<ApiSettlementResponse[]> => {
    const { data } = await client.post<ApiSettlementResponse[]>("/settlements/total/cash", payload);
    return data;
  },
};
