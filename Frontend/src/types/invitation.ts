import type { ISODateTimeString } from "./common";
import type { InvitationStatus, InvitationType } from "./enums";

export interface ApiContactInvitationCreate {
  to_user_id?: number;
  to_user_email?: string;
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
  from_user_email?: string;
  from_user_username?: string;
  to_user_id: number;
  to_user_email?: string;
  to_user_username?: string;
  created_at: ISODateTimeString;
  responded_at?: ISODateTimeString | null;
}

export interface ApiContactInvitationResponse extends ApiInvitationBaseResponse {
  type: "contact";
}

export interface ApiGroupInvitationResponse extends ApiInvitationBaseResponse {
  type: "group";
  group_id: number;
  group_name?: string;
}

export type ApiInvitationResponse =
  | ApiContactInvitationResponse
  | ApiGroupInvitationResponse;