import type { ApiPersonalExpenseListParams } from "@/types";

export const queryKeys = {
  groups: {
    all: ["groups", "all"] as const,
    byId: (groupId: number) => ["groups", "byId", groupId] as const,
    members: (groupId: number) => ["groups", "members", groupId] as const,
  },

  groupExpenses: {
    list: (groupId: number, params?: { limit?: number; offset?: number }) =>
      ["expenses", "group", groupId, params ?? {}] as const,
  },

  personalExpenses: {
    all: ["expenses", "personal"] as const,
    list: (params?: ApiPersonalExpenseListParams) =>
      ["expenses", "personal", "list", params ?? {}] as const,
    summary: (params?: Omit<ApiPersonalExpenseListParams, "limit" | "offset">) =>
      ["expenses", "personal", "summary", params ?? {}] as const,
  },

  categories: {
    default: ["categories", "default"] as const,
    personal: ["categories", "personal"] as const,
    availablePersonal: ["categories", "available", "personal"] as const,
    group: (groupId: number) => ["categories", "group", groupId] as const,
    availableGroup: (groupId: number) => ["categories", "available", "group", groupId] as const,
  },

  contacts: {
    list: (params?: { limit?: number; offset?: number }) => ["contacts", params ?? {}] as const,
  },

  invitations: {
    pending: (params?: { limit?: number; offset?: number }) =>
      ["invitations", "pending", params ?? {}] as const,
    sent: (params?: {
      limit?: number;
      offset?: number;
      type?: "contact" | "group";
      status?: "pending" | "accepted" | "rejected" | "cancelled" | "archived";
    }) => ["invitations", "sent", params ?? {}] as const,
    groupPending: (groupId: number, params?: { limit?: number; offset?: number }) =>
      ["invitations", "group", groupId, "pending", params ?? {}] as const,
  },

  notifications: {
    list: (params?: { limit?: number; offset?: number }) =>
      ["notifications", "list", params ?? {}] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },

  balances: {
    group: (groupId: number) => ["balances", "group", groupId] as const,
    contacts: ["balances", "contacts"] as const,
    contactByGroups: (otherUserId: number) =>
      ["balances", "contacts", otherUserId, "groups"] as const,
  },

  settlements: {
    group: (groupId: number, params?: { limit?: number; offset?: number }) =>
      ["settlements", "group", groupId, params ?? {}] as const,
    user: (params?: { limit?: number; offset?: number }) =>
      ["settlements", "user", params ?? {}] as const,
  },
};
