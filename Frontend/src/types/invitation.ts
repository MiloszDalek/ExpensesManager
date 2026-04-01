import type { ISODateTimeString } from "./common";
import type { InvitationStatus, InvitationType } from "./enums";

export interface ApiContactInvitationCreate {
  to_user_id: number;
}

export interface ApiGroupInvitationCreate {
  group_id: number;
  to_user_id?: number;
  to_user_email?: string;
}

export interface ApiInvitationBaseResponse {
  id: number;
  type: InvitationType;
  status: InvitationStatus;
  from_user_id: number;
  to_user_id: number;
  created_at: ISODateTimeString;
  responded_at?: ISODateTimeString | null;
}

export interface ApiContactInvitationResponse extends ApiInvitationBaseResponse {
  type: "contact";
}

export interface ApiGroupInvitationResponse extends ApiInvitationBaseResponse {
  type: "group";
  group_id: number;
}

export type ApiInvitationResponse =
  | ApiContactInvitationResponse
  | ApiGroupInvitationResponse;