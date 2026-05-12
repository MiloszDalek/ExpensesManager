import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { recurringExpensesApi } from "@/api/recurringExpensesApi";
import { queryKeys } from "@/api/queryKeys";
import type { ApiRecurringExpenseResponse, ApiRecurringExpenseUpdate, ApiRecurringGroupExpenseCreate } from "@/types";

const RECURRING_LIMIT = 50;

export function useGroupRecurring(groupId: number, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<ApiRecurringExpenseResponse | null>(null);

  const {
    data: recurringExpenses = [],
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery<ApiRecurringExpenseResponse[]>({
    queryKey: queryKeys.recurringExpenses.list({
      scope: "group",
      group_id: groupId,
      limit: RECURRING_LIMIT,
      offset: 0,
    }),
    queryFn: () =>
      recurringExpensesApi.list({
        scope: "group",
        group_id: groupId,
        limit: RECURRING_LIMIT,
        offset: 0,
      }),
    enabled,
  });

  const recurringActionDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const invalidateRecurringGroupQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
  };

  const createRecurringExpenseMutation = useMutation<void, Error, ApiRecurringGroupExpenseCreate>({
    mutationFn: async (payload) => {
      const recurringExpense = await recurringExpensesApi.createGroup(groupId, payload);
      await recurringExpensesApi.generateNow(recurringExpense.id, { up_to_date: payload.starts_on });
    },
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const updateRecurringMutation = useMutation<
    ApiRecurringExpenseResponse,
    Error,
    { recurringExpenseId: number; payload: ApiRecurringExpenseUpdate }
  >({
    mutationFn: ({ recurringExpenseId, payload }) => recurringExpensesApi.update(recurringExpenseId, payload),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
      setEditingRecurringExpense(null);
    },
  });

  const generateNowRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) =>
      recurringExpensesApi.generateNow(recurringExpenseId, { up_to_date: recurringActionDate }),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const pauseRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.pause(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringGroupQueries();
    },
  });

  const resumeRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.resume(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringGroupQueries();
    },
  });

  const archiveRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.archive(recurringExpenseId),
    onSuccess: async () => {
      setEditingRecurringExpense(null);
      await invalidateRecurringGroupQueries();
    },
  });

  const mapRecurringFrequencyLabel = (frequency: ApiRecurringExpenseResponse["frequency"]) => {
    if (frequency === "daily") return t("addExpenseDialog.recurringDaily");
    if (frequency === "weekly") return t("addExpenseDialog.recurringWeekly");
    if (frequency === "monthly") return t("addExpenseDialog.recurringMonthly");
    if (frequency === "quarterly") return t("addExpenseDialog.recurringQuarterly");
    return t("addExpenseDialog.recurringYearly");
  };

  const mapRecurringStatusLabel = (status: ApiRecurringExpenseResponse["status"]) => {
    if (status === "active") return t("recurringExpenses.statusActive");
    if (status === "paused") return t("recurringExpenses.statusPaused");
    if (status === "ended") return t("recurringExpenses.statusEnded");
    return t("recurringExpenses.statusArchived");
  };

  const formatDateSafe = (dateValue: string) => {
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? dateValue : format(parsedDate, "MMM d, yyyy");
  };

  const recurringActionsPending =
    updateRecurringMutation.isPending ||
    generateNowRecurringMutation.isPending ||
    pauseRecurringMutation.isPending ||
    resumeRecurringMutation.isPending ||
    archiveRecurringMutation.isPending;

  return {
    recurringExpenses,
    recurringLoading,
    recurringError,
    editingRecurringExpense,
    setEditingRecurringExpense,
    createRecurringExpenseMutation,
    updateRecurringMutation,
    generateNowRecurringMutation,
    pauseRecurringMutation,
    resumeRecurringMutation,
    archiveRecurringMutation,
    recurringActionsPending,
    mapRecurringFrequencyLabel,
    mapRecurringStatusLabel,
    formatDateSafe,
  };
}
