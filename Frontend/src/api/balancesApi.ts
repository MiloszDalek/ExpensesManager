import client from "./client";
import type {
  ApiContactBalanceByGroup,
  ApiGroupBalances,
  ApiUserBalanceItem,
} from "@/types";

export const balancesApi = {
  getGroup: async (groupId: number): Promise<ApiGroupBalances> => {
    const { data } = await client.get<ApiGroupBalances>(`/balances/group/${groupId}`);
    return data;
  },

  getContacts: async (): Promise<ApiUserBalanceItem[]> => {
    const { data } = await client.get<ApiUserBalanceItem[]>("/balances/contacts");
    return data;
  },

  getContactByGroups: async (otherUserId: number): Promise<ApiContactBalanceByGroup[]> => {
    const { data } = await client.get<ApiContactBalanceByGroup[]>(
      `/balances/contacts/${otherUserId}/groups`
    );
    return data;
  },
};
