import client from "./client";
import type {
  ApiContactInvitationCreate,
  ApiGroupInvitationCreate,
  ApiInvitationResponse,
} from "@/types";

export const invitationsApi = {
  sendToContact: async (payload: ApiContactInvitationCreate): Promise<ApiInvitationResponse> => {
    const { data } = await client.post<ApiInvitationResponse>("/invitations/send/contacts", payload);
    return data;
  },

  sendToGroup: async (payload: ApiGroupInvitationCreate): Promise<ApiInvitationResponse> => {
    const { data } = await client.post<ApiInvitationResponse>("/invitations/send/groups", payload);
    return data;
  },

  listPending: async (params?: { limit?: number; offset?: number }): Promise<ApiInvitationResponse[]> => {
    const { data } = await client.get<ApiInvitationResponse[]>("/invitations/pending", { params });
    return data;
  },

  listGroupPending: async (
    groupId: number,
    params?: { limit?: number; offset?: number }
  ): Promise<ApiInvitationResponse[]> => {
    const { data } = await client.get<ApiInvitationResponse[]>(`/invitations/groups/${groupId}/pending`, {
      params,
    });
    return data;
  },

  accept: async (invitationId: number): Promise<ApiInvitationResponse> => {
    const { data } = await client.patch<ApiInvitationResponse>(`/invitations/${invitationId}/accept`);
    return data;
  },

  decline: async (invitationId: number): Promise<ApiInvitationResponse> => {
    const { data } = await client.patch<ApiInvitationResponse>(`/invitations/${invitationId}/decline`);
    return data;
  },

  cancel: async (invitationId: number): Promise<ApiInvitationResponse> => {
    const { data } = await client.delete<ApiInvitationResponse>(`/invitations/${invitationId}`);
    return data;
  },
};
