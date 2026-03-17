import client from "./client";
import type { ApiCategoryCreate, ApiCategoryResponse } from "@/types";

export const categoriesApi = {
  getDefault: async (): Promise<ApiCategoryResponse[]> => {
    const { data } = await client.get<ApiCategoryResponse[]>("/category/default");
    return data;
  },

  getPersonal: async (): Promise<ApiCategoryResponse[]> => {
    const { data } = await client.get<ApiCategoryResponse[]>("/category/personal");
    return data;
  },

  getAvailablePersonal: async (): Promise<ApiCategoryResponse[]> => {
    const { data } = await client.get<ApiCategoryResponse[]>("/category/available/personal");
    return data;
  },

  createPersonal: async (payload: ApiCategoryCreate): Promise<ApiCategoryResponse> => {
    const { data } = await client.post<ApiCategoryResponse>("/category/personal", payload);
    return data;
  },

  deletePersonal: async (categoryId: number): Promise<void> => {
    await client.delete(`/category/personal/${categoryId}`);
  },

  createGroup: async (groupId: number, payload: ApiCategoryCreate): Promise<ApiCategoryResponse> => {
    const { data } = await client.post<ApiCategoryResponse>(`/category/group/${groupId}`, payload);
    return data;
  },

  getGroup: async (groupId: number): Promise<ApiCategoryResponse[]> => {
    const { data } = await client.get<ApiCategoryResponse[]>(`/category/group/${groupId}`);
    return data;
  },

  getAvailableGroup: async (groupId: number): Promise<ApiCategoryResponse[]> => {
    const { data } = await client.get<ApiCategoryResponse[]>(
      `/category/available/group/${groupId}`
    );
    return data;
  },

  deleteGroup: async (categoryId: number): Promise<void> => {
    await client.delete(`/category/group/${categoryId}`);
  },
};
