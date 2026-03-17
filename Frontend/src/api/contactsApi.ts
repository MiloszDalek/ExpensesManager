import client from "./client";
import type { ApiContactResponse } from "@/types";

export const contactsApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<ApiContactResponse[]> => {
    const { data } = await client.get<ApiContactResponse[]>("/contacts", { params });
    return data;
  },
};
