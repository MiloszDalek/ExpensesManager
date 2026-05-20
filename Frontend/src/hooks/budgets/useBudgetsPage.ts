import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type { ApiBudgetPlanResponse, ApiCategoryResponse } from "@/types";
import { localizeBudgetError, getErrorMessage } from "./budgetErrors";

export function useBudgetsPage(t: TFunction) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: queryKeys.budgets.list("active"),
    queryFn: () => budgetsApi.listBudgets("active"),
    enabled: !!user,
  });

  useEffect(() => {
    if (budgets.length === 0) {
      setSelectedBudgetId(null);
      return;
    }
    const selectedExists = budgets.some((budget) => budget.id === selectedBudgetId);
    if (!selectedExists) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  const selectedBudget = useMemo<ApiBudgetPlanResponse | null>(() => {
    if (!selectedBudgetId) return null;
    return budgets.find((budget) => budget.id === selectedBudgetId) ?? null;
  }, [budgets, selectedBudgetId]);

  const { data: budgetSummary, isLoading: summaryLoading } = useQuery({
    queryKey: selectedBudgetId ? queryKeys.budgets.summary(selectedBudgetId) : ["budgets", "summary", "none"],
    queryFn: () => budgetsApi.getBudgetSummary(selectedBudgetId as number),
    enabled: !!selectedBudgetId,
  });

  const { data: incomeEntries = [], isLoading: incomeLoading } = useQuery({
    queryKey: selectedBudget
      ? queryKeys.budgetIncome.list({
          date_from: selectedBudget.period_start,
          date_to: selectedBudget.period_end,
          currency: selectedBudget.currency,
          limit: 100,
        })
      : ["income", "list", "none"],
    queryFn: () =>
      budgetsApi.listIncome({
        limit: 100,
        date_from: selectedBudget?.period_start,
        date_to: selectedBudget?.period_end,
        currency: selectedBudget?.currency,
      }),
    enabled: !!selectedBudget,
  });

  const { data: personalCategories = [] } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availablePersonal,
    queryFn: () => categoriesApi.getAvailablePersonal(),
    enabled: !!user,
  });

  const refreshBudgetArea = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgetIncome.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals.all });
    if (selectedBudgetId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(selectedBudgetId) });
    }
  };

  const recalculateBudgetMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) throw new Error(t("budgets.errors.noBudgetSelected"));
      return budgetsApi.recalculateBudget(selectedBudget.id);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.actions.recalculated"));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const closeBudgetMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) throw new Error(t("budgets.errors.noBudgetSelected"));
      return budgetsApi.closeBudgetPeriod(selectedBudget.id);
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.actions.budgetClosed", { toBudgetId: result.to_budget_id }));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const runDueRolloversMutation = useMutation({
    mutationFn: () => budgetsApi.runDueRollovers(),
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(
        t("budgets.actions.runDueDone", {
          processedCount: result.processed_budgets_count,
          createdCount: result.created_budgets_count,
        })
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const toggleGroupExpenseModeMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) throw new Error(t("budgets.errors.noBudgetSelected"));
      return budgetsApi.updateBudget(selectedBudget.id, {
        include_group_expenses: !selectedBudget.include_group_expenses,
      });
    },
    onSuccess: async (updatedBudget) => {
      setErrorMessage(null);
      setSuccessMessage(
        updatedBudget.include_group_expenses
          ? t("budgets.actions.groupExpensesEnabled")
          : t("budgets.actions.groupExpensesDisabled")
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  return {
    user,
    budgets,
    budgetsLoading,
    selectedBudgetId,
    setSelectedBudgetId,
    selectedBudget,
    budgetSummary,
    summaryLoading,
    incomeEntries,
    incomeLoading,
    personalCategories,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    refreshBudgetArea,
    recalculateBudgetMutation,
    closeBudgetMutation,
    runDueRolloversMutation,
    toggleGroupExpenseModeMutation,
  };
}
