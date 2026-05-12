import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { queryKeys } from "@/api/queryKeys";
import type { ApiGroupExpenseCreate, ApiGroupExpenseUpdate, ApiGroupExpenseResponse } from "@/types";

const LIMIT = 20;

function mapGroupExpenseError(
  t: (key: string, options?: Record<string, unknown>) => string,
  message: string | undefined,
  fallbackKey: string
) {
  return message === "Participant not found in group"
    ? t("addGroupExpenseDialog.errors.participantNotFoundInGroup")
    : message === "Duplicate participants"
      ? t("addGroupExpenseDialog.errors.duplicateParticipants")
      : message === "Expense must have at least one participant"
        ? t("addGroupExpenseDialog.errors.participantsRequired")
        : message === "Share amounts must be positive"
          ? t("addGroupExpenseDialog.errors.sharesPositive")
          : message === "Split amounts must add up to total expense amount"
            ? t("addGroupExpenseDialog.errors.sharesSumMismatch")
            : message === "Expense currency must match group currency"
              ? t("addGroupExpenseDialog.errors.currencyMismatch")
              : message === "Group not found"
                ? t("addGroupExpenseDialog.errors.groupNotFound")
                : message === "Expense not found"
                  ? t("addGroupExpenseDialog.errors.expenseNotFound")
                  : message === "Updating amount requires expense shares"
                    ? t("addGroupExpenseDialog.errors.updateRequiresShares")
                    : message === "Not authorized admin group role required or being expense creator"
                      ? t("addGroupExpenseDialog.errors.managePermissionRequired")
                      : message === "Not authorized"
                        ? t("addGroupExpenseDialog.errors.notAuthorized")
                        : message || t(fallbackKey);
}

export function useGroupExpenses(groupId: number, enabled: boolean) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createExpenseError, setCreateExpenseError] = useState<string | null>(null);
  const [editExpenseError, setEditExpenseError] = useState<string | null>(null);
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ApiGroupExpenseResponse | null>(null);

  const {
    data: expensePages,
    isLoading: expensesLoading,
    error: expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ApiGroupExpenseResponse[]>({
    queryKey: [...queryKeys.groupExpenses.list(groupId), "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      expensesGroupApi.list(groupId, {
        limit: LIMIT,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    initialPageParam: 0,
    enabled,
  });

  const expenses = useMemo(() => expensePages?.pages.flatMap((page) => page) ?? [], [expensePages]);

  const createExpenseMutation = useMutation<ApiGroupExpenseResponse, Error, ApiGroupExpenseCreate>({
    mutationFn: (expenseData) => expensesGroupApi.create(groupId, expenseData),
    onMutate: () => {
      setCreateExpenseError(null);
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      setCreateExpenseError(null);
    },
    onError: (mutationError) => {
      setCreateExpenseError(mapGroupExpenseError(t, mutationError.message, "addGroupExpenseDialog.errors.createFailed"));
    },
  });

  const updateExpenseMutation = useMutation<
    ApiGroupExpenseResponse,
    Error,
    { expenseId: number; payload: ApiGroupExpenseUpdate }
  >({
    mutationFn: ({ expenseId, payload }) => expensesGroupApi.update(groupId, expenseId, payload),
    onMutate: () => {
      setEditExpenseError(null);
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      setEditExpenseError(null);
      setEditingExpense(null);
    },
    onError: (mutationError) => {
      setEditExpenseError(mapGroupExpenseError(t, mutationError.message, "addGroupExpenseDialog.errors.updateFailed"));
    },
  });

  const deleteExpenseMutation = useMutation<void, Error, number>({
    mutationFn: (expenseId) => expensesGroupApi.delete(groupId, expenseId),
    onMutate: () => {
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      setDeleteExpenseError(null);
    },
    onError: (mutationError) => {
      setDeleteExpenseError(mapGroupExpenseError(t, mutationError.message, "addGroupExpenseDialog.errors.deleteFailed"));
    },
  });

  return {
    expenses,
    expensesLoading,
    expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createExpenseError,
    setCreateExpenseError,
    editExpenseError,
    setEditExpenseError,
    deleteExpenseError,
    setDeleteExpenseError,
    editingExpense,
    setEditingExpense,
    createExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation,
  };
}
