import client from "./client";
import type {
  ApiGroupCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiGroupUpdate,
} from "@/types";

export const groupsApi = {
  create: async (payload: ApiGroupCreate): Promise<ApiGroupResponse> => {
    const { data } = await client.post<ApiGroupResponse>("/groups", payload);
    return data;
  },

  listAll: async (): Promise<ApiGroupResponse[]> => {
    const { data } = await client.get<ApiGroupResponse[]>("/groups/all");
    return data;
  },

  getById: async (groupId: number): Promise<ApiGroupResponse> => {
    const { data } = await client.get<ApiGroupResponse>(`/groups/${groupId}`);
    return data;
  },

  update: async (groupId: number, payload: ApiGroupUpdate): Promise<ApiGroupResponse> => {
    const { data } = await client.patch<ApiGroupResponse>(`/groups/${groupId}`, payload);
    return data;
  },

  members: async (groupId: number): Promise<ApiGroupMemberResponse[]> => {
    const { data } = await client.get<ApiGroupMemberResponse[]>(`/groups/${groupId}/members`);
    return data;
  },

  grantAdmin: async (groupId: number, userId: number): Promise<ApiGroupMemberResponse> => {
    const { data } = await client.patch<ApiGroupMemberResponse>(
      `/groups/${groupId}/members/${userId}/grant-admin`
    );
    return data;
  },

  removeMember: async (groupId: number, userId: number): Promise<void> => {
    await client.delete(`/groups/${groupId}/members/${userId}`);
  },

  leaveGroup: async (groupId: number): Promise<void> => {
    await client.delete(`/groups/${groupId}/members/me`);
  },
};
