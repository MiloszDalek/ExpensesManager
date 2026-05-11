import client from "./client";
import type {
  ApiNotificationResponse,
  ApiUnreadNotificationCountResponse,
  ApiMarkAllReadResponse,
  NotificationStatus,
  NotificationType,
  NotificationSeverity,
} from "@/types";

export const notificationsApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<ApiNotificationResponse[]> => {
    const { data } = await client.get<ApiNotificationResponse[]>("/notifications", { params });
    return data;
  },

  listFiltered: async (params?: {
    status?: NotificationStatus;
    type?: NotificationType;
    types?: NotificationType[];
    severity?: NotificationSeverity;
    limit?: number;
    offset?: number;
  }): Promise<ApiNotificationResponse[]> => {
    const { data } = await client.get<ApiNotificationResponse[]>("/notifications/filtered", { params });
    return data;
  },

  unreadCount: async (): Promise<ApiUnreadNotificationCountResponse> => {
    const { data} = await client.get<ApiUnreadNotificationCountResponse>(
      "/notifications/unread-count"
    );
    return data;
  },

  markAsRead: async (notificationId: number): Promise<ApiNotificationResponse> => {
    const { data } = await client.patch<ApiNotificationResponse>(
      `/notifications/${notificationId}/read`
    );
    return data;
  },

  markAllAsRead: async (): Promise<ApiMarkAllReadResponse> => {
    const { data } = await client.patch<ApiMarkAllReadResponse>(
      "/notifications/mark-all-read"
    );
    return data;
  },

  delete: async (notificationId: number): Promise<ApiNotificationResponse> => {
    const { data } = await client.delete<ApiNotificationResponse>(
      `/notifications/${notificationId}`
    );
    return data;
  },
};
