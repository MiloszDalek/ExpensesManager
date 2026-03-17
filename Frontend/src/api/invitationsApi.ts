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

  accept: async (invitationId: number): Promise<ApiInvitationResponse> => {
    const { data } = await client.patch<ApiInvitationResponse>(`/invitations/${invitationId}/accept`);
    return data;
  },
};
