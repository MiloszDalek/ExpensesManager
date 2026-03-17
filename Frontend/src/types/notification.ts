import type { ISODateTimeString } from "./common";
import type { NotificationType } from "./enums";

export interface ApiNotificationResponse {
  id: number;
  user_id: number;
  type: NotificationType;
  reference_id?: number | null;
  message?: string | null;
  action_url?: string | null;
  is_read: boolean;
  created_at: ISODateTimeString;
}

export interface ApiUnreadNotificationCountResponse {
  count: number;
}