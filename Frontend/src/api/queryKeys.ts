import type {
  ApiIncomeListParams,
  ApiExpenseSummaryDrilldownParams,
  ApiExpenseSummaryOverviewParams,
  ApiExpenseSummaryTrendsParams,
  ApiPersonalExpenseListParams,
  RecurringScope,
} from "@/types";
import type { RecurringExpenseStatus } from "@/types/enums";
import type { BudgetStatus } from "@/types/enums";

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

  recurringExpenses: {
    all: ["expenses", "recurring"] as const,
    list: (params?: {
      limit?: number;
      offset?: number;
      scope?: RecurringScope;
      group_id?: number;
      status?: RecurringExpenseStatus;
    }) => ["expenses", "recurring", "list", params ?? {}] as const,
    forecast: (params?: {
      date_from?: string;
      date_to?: string;
      scope?: RecurringScope;
      group_id?: number;
    }) => ["expenses", "recurring", "forecast", params ?? {}] as const,
  },

  budgets: {
    all: ["budgets"] as const,
    list: (status?: BudgetStatus) => ["budgets", "list", status ?? "all"] as const,
    byId: (budgetId: number) => ["budgets", "byId", budgetId] as const,
    summary: (budgetId: number) => ["budgets", "summary", budgetId] as const,
  },

  budgetIncome: {
    all: ["income"] as const,
    list: (params?: ApiIncomeListParams) => ["income", "list", params ?? {}] as const,
    summary: (params?: { date_from?: string; date_to?: string }) =>
      ["income", "summary", params ?? {}] as const,
  },

  summaries: {
    overview: (params?: ApiExpenseSummaryOverviewParams) =>
      ["expenses", "summary", "overview", params ?? {}] as const,
    trends: (params?: ApiExpenseSummaryTrendsParams) =>
      ["expenses", "summary", "trends", params ?? {}] as const,
    drilldown: (params?: ApiExpenseSummaryDrilldownParams) =>
      ["expenses", "summary", "drilldown", params ?? {}] as const,
  },

  categories: {
    default: ["categories", "default"] as const,
    personal: ["categories", "personal"] as const,
    availablePersonal: ["categories", "available", "personal"] as const,
    group: (groupId: number) => ["categories", "group", groupId] as const,
    availableGroup: (groupId: number) => ["categories", "available", "group", groupId] as const,
    availableGroupsAll: ["categories", "available", "groups", "all"] as const,
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

  admin: {
    usersAll: ["admin", "users", "all"] as const,
    usersActivity: (params?: {
      search?: string;
      role?: "all" | "user" | "admin";
      is_active?: "all" | "active" | "inactive";
    }) => ["admin", "users", "activity", params ?? {}] as const,
    usersActivityStats: (params?: {
      search?: string;
      role?: "all" | "user" | "admin";
      is_active?: "all" | "active" | "inactive";
    }) => ["admin", "users", "activity", "stats", params ?? {}] as const,
    defaultCategories: ["admin", "categories", "default"] as const,
  },
};
