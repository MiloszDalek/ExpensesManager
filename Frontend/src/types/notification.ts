import type { ISODateTimeString } from "./common";
import type { NotificationType, NotificationStatus, NotificationContextType, NotificationSeverity } from "./enums";

export interface ApiNotificationResponse {
  id: number;
  user_id: number;
  type: NotificationType;
  reference_id?: number | null;
  reference_type?: NotificationContextType | null;
  message?: string | null;
  message_key?: string | null;
  context?: Record<string, any> | null;
  status: NotificationStatus;
  severity: NotificationSeverity;
  action_url?: string | null;
  created_at: ISODateTimeString;
}

export interface ApiUnreadNotificationCountResponse {
  count: number;
}

export interface ApiMarkAllReadResponse {
  marked_count: number;
}