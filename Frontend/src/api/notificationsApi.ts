import client from "./client";
import type {
  ApiNotificationResponse,
  ApiUnreadNotificationCountResponse,
} from "@/types";

export const notificationsApi = {
  list: async (params?: { limit?: number; offset?: number }): Promise<ApiNotificationResponse[]> => {
    const { data } = await client.get<ApiNotificationResponse[]>("/notifications", { params });
    return data;
  },

  unreadCount: async (): Promise<ApiUnreadNotificationCountResponse> => {
    const { data } = await client.get<ApiUnreadNotificationCountResponse>(
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
};
