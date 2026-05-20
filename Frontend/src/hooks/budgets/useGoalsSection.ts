import { useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { useMutation, useQuery } from "@tanstack/react-query";

import { savingsGoalsApi } from "@/api/savingsGoalsApi";
import { queryKeys } from "@/api/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import type {
  ApiSavingsGoalCreate,
  ApiSavingsGoalResponse,
  ApiSavingsGoalUpdate,
  ApiSavingsGoalProgressResponse,
} from "@/types";
import { localizeBudgetError, getErrorMessage } from "./budgetErrors";

const parsePositiveNumber = (value: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return numeric;
};

export type GoalEditDraft = {
  name: string;
  targetAmount: string;
  deadline: string;
  budgetPoolId: string;
  autoAllocateAmount: string;
  isActive: boolean;
};

export function useGoalsSection(
  t: TFunction,
  selectedBudgetId: number | null,
  refreshBudgetArea: () => Promise<void>,
  setErrorMessage: (msg: string | null) => void,
  setSuccessMessage: (msg: string | null) => void
) {
  const { user } = useAuth();

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalBudgetPoolId, setGoalBudgetPoolId] = useState("none");
  const [goalAutoAllocateAmount, setGoalAutoAllocateAmount] = useState("");
  const [includeInactiveGoals, setIncludeInactiveGoals] = useState(false);
  const [goalAllocationAmounts, setGoalAllocationAmounts] = useState<Record<number, string>>({});
  const [expandedGoalHistoryId, setExpandedGoalHistoryId] = useState<number | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<number | null>(null);
  const [goalEditDraft, setGoalEditDraft] = useState<GoalEditDraft | null>(null);

  const { data: savingsGoals = [], isLoading: savingsGoalsLoading } = useQuery<ApiSavingsGoalResponse[]>({
    queryKey: queryKeys.savingsGoals.list({ include_inactive: includeInactiveGoals }),
    queryFn: () => savingsGoalsApi.list({ include_inactive: includeInactiveGoals }),
    enabled: !!user,
  });

  const { data: expandedGoalProgress, isLoading: expandedGoalProgressLoading } = useQuery<ApiSavingsGoalProgressResponse>({
    queryKey:
      expandedGoalHistoryId !== null
        ? queryKeys.savingsGoals.progress(expandedGoalHistoryId)
        : ["savingsGoals", "progress", "none"],
    queryFn: () => savingsGoalsApi.getProgress(expandedGoalHistoryId as number),
    enabled: expandedGoalHistoryId !== null,
  });

  useEffect(() => {
    if (editingGoalId === null) return;
    const stillExists = savingsGoals.some((goal) => goal.id === editingGoalId);
    if (!stillExists) {
      setEditingGoalId(null);
      setGoalEditDraft(null);
    }
  }, [editingGoalId, savingsGoals]);

  const createGoalMutation = useMutation({
    mutationFn: () => {
      const targetValue = parsePositiveNumber(goalTarget);
      if (!targetValue) {
        throw new Error("target_amount must be greater than 0");
      }
      const autoAllocateValue = goalAutoAllocateAmount.trim() ? Number(goalAutoAllocateAmount) : null;
      const payload: ApiSavingsGoalCreate = {
        name: goalName.trim(),
        target_amount: targetValue,
        deadline: goalDeadline || null,
        budget_pool_id: goalBudgetPoolId === "none" ? null : Number(goalBudgetPoolId),
        auto_allocate_amount: autoAllocateValue,
      };
      return savingsGoalsApi.create(payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.goals.created"));
      setGoalName("");
      setGoalTarget("");
      setGoalDeadline("");
      setGoalBudgetPoolId("none");
      setGoalAutoAllocateAmount("");
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const allocateGoalMutation = useMutation({
    mutationFn: (goalId: number) => {
      const rawAmount = goalAllocationAmounts[goalId] ?? "";
      const amount = parsePositiveNumber(rawAmount);
      if (!amount) {
        throw new Error("Amount must be greater than 0");
      }
      return savingsGoalsApi.allocate(goalId, { amount });
    },
    onSuccess: async (_, goalId) => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.goals.allocated"));
      setGoalAllocationAmounts((prev) => ({ ...prev, [goalId]: "" }));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (goalId: number) => savingsGoalsApi.remove(goalId),
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.goals.deleted"));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const autoAllocateGoalsMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudgetId) {
        throw new Error(t("budgets.errors.noBudgetSelected"));
      }
      return savingsGoalsApi.autoAllocateForBudget(selectedBudgetId);
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(
        t("budgets.goals.autoAllocated", { allocatedCount: result.allocated_goals_count })
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: (goalId: number) => {
      if (!goalEditDraft) {
        throw new Error("Savings goal not found");
      }
      const targetAmount = parsePositiveNumber(goalEditDraft.targetAmount);
      if (!targetAmount) {
        throw new Error("target_amount must be greater than 0");
      }
      const rawAutoAllocate = goalEditDraft.autoAllocateAmount.trim();
      const autoAllocateAmount = rawAutoAllocate === "" ? null : Number(rawAutoAllocate);
      if (
        autoAllocateAmount !== null &&
        (!Number.isFinite(autoAllocateAmount) || autoAllocateAmount < 0)
      ) {
        throw new Error("auto_allocate_amount cannot be negative");
      }
      const payload: ApiSavingsGoalUpdate = {
        name: goalEditDraft.name.trim(),
        target_amount: targetAmount,
        deadline: goalEditDraft.deadline || null,
        budget_pool_id: goalEditDraft.budgetPoolId === "none" ? null : Number(goalEditDraft.budgetPoolId),
        auto_allocate_amount: autoAllocateAmount,
        is_active: goalEditDraft.isActive,
      };
      return savingsGoalsApi.update(goalId, payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.goals.updated"));
      setEditingGoalId(null);
      setGoalEditDraft(null);
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const toggleGoalActiveMutation = useMutation({
    mutationFn: (goal: ApiSavingsGoalResponse) =>
      savingsGoalsApi.update(goal.id, { is_active: !goal.is_active }),
    onSuccess: async (_, goal) => {
      setErrorMessage(null);
      setSuccessMessage(
        goal.is_active ? t("budgets.goals.deactivated") : t("budgets.goals.activated")
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const isCreateGoalDisabled =
    !goalName.trim() || !parsePositiveNumber(goalTarget) || createGoalMutation.isPending;

  return {
    goalName,
    setGoalName,
    goalTarget,
    setGoalTarget,
    goalDeadline,
    setGoalDeadline,
    goalBudgetPoolId,
    setGoalBudgetPoolId,
    goalAutoAllocateAmount,
    setGoalAutoAllocateAmount,
    includeInactiveGoals,
    setIncludeInactiveGoals,
    goalAllocationAmounts,
    setGoalAllocationAmounts,
    expandedGoalHistoryId,
    setExpandedGoalHistoryId,
    editingGoalId,
    setEditingGoalId,
    goalEditDraft,
    setGoalEditDraft,
    savingsGoals,
    savingsGoalsLoading,
    expandedGoalProgress,
    expandedGoalProgressLoading,
    createGoalMutation,
    allocateGoalMutation,
    deleteGoalMutation,
    autoAllocateGoalsMutation,
    updateGoalMutation,
    toggleGoalActiveMutation,
    isCreateGoalDisabled,
  };
}
