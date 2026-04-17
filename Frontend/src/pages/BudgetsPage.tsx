import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { savingsGoalsApi } from "@/api/savingsGoalsApi";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ApiBudgetPlanResponse,
  type ApiBudgetPoolCreate,
  type ApiCategoryResponse,
  type ApiSavingsGoalCreate,
  type ApiSavingsGoalProgressResponse,
  type ApiSavingsGoalResponse,
  type ApiSavingsGoalUpdate,
} from "@/types";
import { SUPPORTED_CURRENCIES } from "@/types/enums";


const formatMoney = (value: number | string, currency: string) => {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
};

const toIsoDateStart = (value: string) => `${value}T00:00:00`;

const parsePositiveNumber = (value: string) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
};

const getGoalProgressPercent = (goal: ApiSavingsGoalResponse): number => {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);

  if (target <= 0) {
    return 0;
  }

  return Math.min((current / target) * 100, 100);
};

const getGoalRemainingAmount = (goal: ApiSavingsGoalResponse): number => {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  return Math.max(target - current, 0);
};

type GoalEditDraft = {
  name: string;
  targetAmount: string;
  deadline: string;
  budgetPoolId: string;
  autoAllocateAmount: string;
  isActive: boolean;
};

const BUDGET_ERROR_TRANSLATIONS: Record<string, string> = {
  "period_start cannot be greater than period_end": "budgets.errors.periodRangeInvalid",
  "Weekly budget period must have exactly 7 days": "budgets.errors.weeklyPeriodMustBeSevenDays",
  "Monthly budget period must start on first day of month": "budgets.errors.monthlyStartInvalid",
  "Monthly budget period must end on last day of month": "budgets.errors.monthlyEndInvalid",
  "income_target must be greater than 0": "budgets.errors.incomeTargetInvalid",
  "Budget period overlaps with existing active budget": "budgets.errors.periodOverlap",
  "Budget requires at least one pool": "budgets.errors.poolRequired",
  "Pool target value must be greater than 0": "budgets.errors.poolTargetInvalid",
  "Pool alert threshold must be in range (0, 100]": "budgets.errors.poolAlertRangeInvalid",
  "Percent pool target cannot be greater than 100": "budgets.errors.poolPercentRangeInvalid",
  "Percent pools total cannot exceed 100": "budgets.errors.poolPercentTotalInvalid",
  "Fixed pools total cannot exceed income_target": "budgets.errors.poolFixedTotalTooHigh",
  "No available personal categories for budget template": "budgets.errors.noCategoriesForTemplate",
  "Budget not found": "budgets.errors.budgetNotFound",
  "Budget pool not found": "budgets.errors.poolNotFound",
  "Amount must be greater than 0": "budgets.errors.amountInvalid",
  "date_from cannot be greater than date_to": "budgets.errors.dateRangeInvalid",
  "Income entry not found": "budgets.errors.incomeNotFound",
  "Category not found": "budgets.errors.categoryNotFound",
  "Not a personal category": "budgets.errors.categoryNotPersonal",
  "target_amount must be greater than 0": "budgets.errors.goalTargetInvalid",
  "auto_allocate_amount cannot be negative": "budgets.errors.goalAutoAllocateInvalid",
  "Savings goal not found": "budgets.errors.goalNotFound",
  "Insufficient remaining amount in selected budget pool": "budgets.errors.goalPoolBalanceInsufficient",
  "Budget period has not ended yet": "budgets.errors.budgetPeriodNotEnded",
  "Budget rollover already executed": "budgets.errors.rolloverAlreadyExecuted",
  "Next budget period overlaps with existing active budget": "budgets.errors.rolloverPeriodOverlap",
  "Not authorized": "budgets.errors.notAuthorized",
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
};

const localizeBudgetError = (message: string, t: TFunction): string => {
  const normalizedMessage = message.trim().replace(/\.$/, "");
  const key = BUDGET_ERROR_TRANSLATIONS[normalizedMessage];
  if (key) {
    return t(key);
  }

  return normalizedMessage || t("budgets.errors.generic");
};

const getBudgetStatusLabel = (status: "active" | "archived", t: TFunction): string => {
  if (status === "active") {
    return t("budgets.status.active");
  }
  return t("budgets.status.archived");
};

const getPoolStatusLabel = (status: "on_track" | "warning" | "exceeded", t: TFunction): string => {
  if (status === "on_track") {
    return t("budgets.poolStatus.onTrack");
  }
  if (status === "warning") {
    return t("budgets.poolStatus.warning");
  }
  return t("budgets.poolStatus.exceeded");
};

export default function BudgetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [budgetName, setBudgetName] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<typeof SUPPORTED_CURRENCIES[number]>("PLN");
  const [periodType, setPeriodType] = useState<"monthly" | "weekly">("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [incomeTarget, setIncomeTarget] = useState("");
  const [includeGroupExpenses, setIncludeGroupExpenses] = useState(false);

  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");

  const [poolName, setPoolName] = useState("");
  const [poolCategoryId, setPoolCategoryId] = useState<string>("");
  const [poolType, setPoolType] = useState<"fixed_amount" | "percent_income">("fixed_amount");
  const [poolTarget, setPoolTarget] = useState("");
  const [poolAlert, setPoolAlert] = useState("80");

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
    if (!selectedBudgetId) {
      return null;
    }
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
    if (editingGoalId === null) {
      return;
    }

    const stillExists = savingsGoals.some((goal) => goal.id === editingGoalId);
    if (!stillExists) {
      setEditingGoalId(null);
      setGoalEditDraft(null);
    }
  }, [editingGoalId, savingsGoals]);

  const refreshBudgetArea = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgetIncome.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals.all });

    if (selectedBudgetId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.summary(selectedBudgetId) });
    }
  };

  const createBudgetMutation = useMutation({
    mutationFn: () =>
      budgetsApi.createBudget({
        name: budgetName.trim(),
        currency: budgetCurrency,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        income_target: incomeTarget.trim() ? Number(incomeTarget) : null,
        include_group_expenses: includeGroupExpenses,
        use_template_50_30_20: true,
      }),
    onSuccess: async (created) => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setBudgetName("");
      setIncomeTarget("");
      setIncludeGroupExpenses(false);
      await refreshBudgetArea();
      setSelectedBudgetId(created.id);
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }

      return budgetsApi.createIncome({
        title: incomeTitle.trim(),
        amount: Number(incomeAmount),
        currency: selectedBudget.currency,
        income_date: toIsoDateStart(incomeDate),
      });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIncomeTitle("");
      setIncomeAmount("");
      setIncomeDate("");
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (incomeId: number) => budgetsApi.deleteIncome(incomeId),
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const addPoolMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }

      const payload: ApiBudgetPoolCreate = {
        name: poolName.trim(),
        category_id: Number(poolCategoryId),
        pool_type: poolType,
        target_value: Number(poolTarget),
        alert_threshold: Number(poolAlert),
      };

      return budgetsApi.addPool(selectedBudget.id, payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      setPoolName("");
      setPoolCategoryId("");
      setPoolTarget("");
      setPoolAlert("80");
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const recalculateBudgetMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }
      return budgetsApi.recalculateBudget(selectedBudget.id);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.actions.recalculated", { defaultValue: "Budget recalculated." }));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const closeBudgetMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }
      return budgetsApi.closeBudgetPeriod(selectedBudget.id);
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(
        t("budgets.actions.budgetClosed", {
          toBudgetId: result.to_budget_id,
          defaultValue: "Budget closed. New budget #{{toBudgetId}} created.",
        })
      );
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
          defaultValue: "Processed {{processedCount}} budgets, created {{createdCount}} new periods.",
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
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }

      return budgetsApi.updateBudget(selectedBudget.id, {
        include_group_expenses: !selectedBudget.include_group_expenses,
      });
    },
    onSuccess: async (updatedBudget) => {
      setErrorMessage(null);
      setSuccessMessage(
        updatedBudget.include_group_expenses
          ? t("budgets.actions.groupExpensesEnabled", { defaultValue: "Group expense shares are now included." })
          : t("budgets.actions.groupExpensesDisabled", { defaultValue: "Group expense shares are now excluded." })
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: () => {
      const targetValue = parsePositiveNumber(goalTarget);
      if (!targetValue) {
        throw new Error("target_amount must be greater than 0");
      }

      const autoAllocateValue = goalAutoAllocateAmount.trim()
        ? Number(goalAutoAllocateAmount)
        : null;

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
      setSuccessMessage(t("budgets.goals.created", { defaultValue: "Savings goal created." }));
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

      return savingsGoalsApi.allocate(goalId, {
        amount,
      });
    },
    onSuccess: async (_, goalId) => {
      setErrorMessage(null);
      setSuccessMessage(t("budgets.goals.allocated", { defaultValue: "Funds allocated to goal." }));
      setGoalAllocationAmounts((prev) => ({
        ...prev,
        [goalId]: "",
      }));
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
      setSuccessMessage(t("budgets.goals.deleted", { defaultValue: "Savings goal deleted." }));
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const autoAllocateGoalsMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }
      return savingsGoalsApi.autoAllocateForBudget(selectedBudget.id);
    },
    onSuccess: async (result) => {
      setErrorMessage(null);
      setSuccessMessage(
        t("budgets.goals.autoAllocated", {
          allocatedCount: result.allocated_goals_count,
          defaultValue: "Auto-allocation done. Updated {{allocatedCount}} goals.",
        })
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
      setSuccessMessage(t("budgets.goals.updated", { defaultValue: "Savings goal updated." }));
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
      savingsGoalsApi.update(goal.id, {
        is_active: !goal.is_active,
      }),
    onSuccess: async (_, goal) => {
      setErrorMessage(null);
      setSuccessMessage(
        goal.is_active
          ? t("budgets.goals.deactivated", { defaultValue: "Goal deactivated." })
          : t("budgets.goals.activated", { defaultValue: "Goal activated." })
      );
      await refreshBudgetArea();
    },
    onError: (error) => {
      setSuccessMessage(null);
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const handleStartGoalEdit = (goal: ApiSavingsGoalResponse) => {
    setEditingGoalId(goal.id);
    setGoalEditDraft({
      name: goal.name,
      targetAmount: String(goal.target_amount ?? ""),
      deadline: goal.deadline ?? "",
      budgetPoolId: goal.budget_pool_id === null ? "none" : String(goal.budget_pool_id),
      autoAllocateAmount: goal.auto_allocate_amount === null ? "" : String(goal.auto_allocate_amount),
      isActive: goal.is_active,
    });
  };

  const handleCancelGoalEdit = () => {
    setEditingGoalId(null);
    setGoalEditDraft(null);
  };

  const isCreateBudgetDisabled =
    !budgetName.trim() ||
    !periodStart ||
    !periodEnd ||
    createBudgetMutation.isPending;

  const isAddIncomeDisabled =
    !selectedBudget ||
    !incomeTitle.trim() ||
    !incomeDate ||
    !incomeAmount ||
    addIncomeMutation.isPending;

  const isAddPoolDisabled =
    !selectedBudget ||
    !poolName.trim() ||
    !poolCategoryId ||
    !poolTarget ||
    addPoolMutation.isPending;

  const isCreateGoalDisabled =
    !goalName.trim() ||
    !parsePositiveNumber(goalTarget) ||
    createGoalMutation.isPending;

  const selectedBudgetCurrency = selectedBudget?.currency ?? budgetCurrency;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("budgets.title", { defaultValue: "Budget Manager" })}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("budgets.subtitle", {
              defaultValue: "Track income, monitor spending, and protect your monthly or weekly pools.",
            })}
          </p>
        </motion.div>

        {errorMessage ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        ) : null}

        {successMessage ? (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-3 text-sm text-emerald-700">{successMessage}</CardContent>
          </Card>
        ) : null}

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="grid gap-3 p-4 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label>{t("budgets.form.name", { defaultValue: "Budget name" })}</Label>
              <Input
                value={budgetName}
                onChange={(event) => setBudgetName(event.target.value)}
                placeholder={t("budgets.form.namePlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.periodType", { defaultValue: "Period" })}</Label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as "monthly" | "weekly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("budgets.period.monthly", { defaultValue: "Monthly" })}</SelectItem>
                  <SelectItem value="weekly">{t("budgets.period.weekly", { defaultValue: "Weekly" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.start", { defaultValue: "Start" })}</Label>
              <DatePicker id="budget-period-start" value={periodStart} onChange={setPeriodStart} />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.end", { defaultValue: "End" })}</Label>
              <DatePicker id="budget-period-end" value={periodEnd} onChange={setPeriodEnd} />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.currency", { defaultValue: "Currency" })}</Label>
              <Select value={budgetCurrency} onValueChange={(value) => setBudgetCurrency(value as typeof SUPPORTED_CURRENCIES[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.incomeTarget", { defaultValue: "Income target (optional)" })}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={incomeTarget}
                onChange={(event) => setIncomeTarget(event.target.value)}
              />
            </div>

            <div className="md:col-span-6 flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
              <input
                id="budget-include-group-expenses"
                type="checkbox"
                checked={includeGroupExpenses}
                onChange={(event) => setIncludeGroupExpenses(event.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="budget-include-group-expenses" className="cursor-pointer text-sm">
                {t("budgets.form.includeGroupExpenses", {
                  defaultValue: "Include my group expense shares in budget calculations",
                })}
              </Label>
            </div>

            <div className="md:col-span-6">
              <Button onClick={() => createBudgetMutation.mutate()} disabled={isCreateBudgetDisabled}>
                {createBudgetMutation.isPending
                  ? t("budgets.actions.creating", { defaultValue: "Creating..." })
                  : t("budgets.actions.createWithTemplate", { defaultValue: "Create budget (50/30/20 template)" })}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="periods" className="space-y-4">
          <TabsList>
            <TabsTrigger value="periods">{t("budgets.tabs.periods", { defaultValue: "Periods" })}</TabsTrigger>
            <TabsTrigger value="income">{t("budgets.tabs.income", { defaultValue: "Income" })}</TabsTrigger>
            <TabsTrigger value="pools">{t("budgets.tabs.pools", { defaultValue: "Pools" })}</TabsTrigger>
            <TabsTrigger value="goals">{t("budgets.tabs.goals", { defaultValue: "Goals" })}</TabsTrigger>
          </TabsList>

          <TabsContent value="periods">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {selectedBudget
                          ? t("budgets.periods.current", { defaultValue: "Selected period" })
                          : t("budgets.periods.none", { defaultValue: "No period selected" })}
                      </p>
                      {selectedBudget ? (
                        <p className="text-xs text-muted-foreground">
                          {selectedBudget.name} · {selectedBudget.period_start} - {selectedBudget.period_end}
                          {" · "}
                          {selectedBudget.include_group_expenses
                            ? t("budgets.summary.modeCombined", { defaultValue: "Personal + group shares" })
                            : t("budgets.summary.modePersonalOnly", { defaultValue: "Personal only" })}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => recalculateBudgetMutation.mutate()}
                        disabled={!selectedBudget || recalculateBudgetMutation.isPending}
                      >
                        {recalculateBudgetMutation.isPending
                          ? t("budgets.actions.recalculating", { defaultValue: "Recalculating..." })
                          : t("budgets.actions.recalculate", { defaultValue: "Recalculate" })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => autoAllocateGoalsMutation.mutate()}
                        disabled={!selectedBudget || autoAllocateGoalsMutation.isPending}
                      >
                        {autoAllocateGoalsMutation.isPending
                          ? t("budgets.actions.autoAllocating", { defaultValue: "Auto-allocating..." })
                          : t("budgets.actions.autoAllocateGoals", { defaultValue: "Auto-allocate goals" })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleGroupExpenseModeMutation.mutate()}
                        disabled={!selectedBudget || toggleGroupExpenseModeMutation.isPending}
                      >
                        {toggleGroupExpenseModeMutation.isPending
                          ? t("budgets.actions.switchingMode", { defaultValue: "Switching mode..." })
                          : selectedBudget?.include_group_expenses
                            ? t("budgets.actions.disableGroupExpenses", { defaultValue: "Exclude group shares" })
                            : t("budgets.actions.enableGroupExpenses", { defaultValue: "Include group shares" })}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => closeBudgetMutation.mutate()}
                        disabled={!selectedBudget || closeBudgetMutation.isPending}
                      >
                        {closeBudgetMutation.isPending
                          ? t("budgets.actions.closing", { defaultValue: "Closing..." })
                          : t("budgets.actions.closePeriod", { defaultValue: "Close period" })}
                      </Button>
                      {user?.role === "admin" ? (
                        <Button
                          variant="outline"
                          onClick={() => runDueRolloversMutation.mutate()}
                          disabled={runDueRolloversMutation.isPending}
                        >
                          {runDueRolloversMutation.isPending
                            ? t("budgets.actions.runningDue", { defaultValue: "Running..." })
                            : t("budgets.actions.runDueRollovers", { defaultValue: "Run due rollovers" })}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-3 p-4">
                  {budgetsLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : budgets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.empty", { defaultValue: "No budgets yet. Create your first period above." })}
                    </p>
                  ) : (
                    budgets.map((budget) => (
                      <div
                        key={budget.id}
                        className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">{budget.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {budget.period_start} - {budget.period_end} · {budget.currency}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={budget.status === "active" ? "default" : "secondary"}>
                            {getBudgetStatusLabel(budget.status, t)}
                          </Badge>
                          <Button
                            variant={selectedBudgetId === budget.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedBudgetId(budget.id)}
                          >
                            {selectedBudgetId === budget.id
                              ? t("budgets.actions.selected", { defaultValue: "Selected" })
                              : t("budgets.actions.select", { defaultValue: "Select" })}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="income">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>{t("budgets.income.title", { defaultValue: "Title" })}</Label>
                    <Input
                      value={incomeTitle}
                      onChange={(event) => setIncomeTitle(event.target.value)}
                      placeholder={t("budgets.income.titlePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.income.amount", { defaultValue: "Amount" })}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={incomeAmount}
                      onChange={(event) => setIncomeAmount(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.income.date", { defaultValue: "Date" })}</Label>
                    <DatePicker id="budget-income-date" value={incomeDate} onChange={setIncomeDate} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => addIncomeMutation.mutate()} disabled={isAddIncomeDisabled}>
                      {addIncomeMutation.isPending
                        ? t("budgets.actions.saving", { defaultValue: "Saving..." })
                        : t("budgets.actions.addIncome", { defaultValue: "Add income" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-3 p-4">
                  {!selectedBudget ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.income.selectBudget", { defaultValue: "Select budget to view period income." })}
                    </p>
                  ) : incomeLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : incomeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.income.empty", { defaultValue: "No income entries yet." })}</p>
                  ) : (
                    incomeEntries.map((income) => (
                      <div key={income.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{income.title}</p>
                          <p className="text-xs text-muted-foreground">{income.income_date.slice(0, 10)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{formatMoney(income.amount, income.currency || selectedBudget.currency)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteIncomeMutation.mutate(income.id)}
                            disabled={deleteIncomeMutation.isPending}
                          >
                            {t("budgets.actions.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pools">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.name", { defaultValue: "Pool name" })}</Label>
                    <Input
                      value={poolName}
                      onChange={(event) => setPoolName(event.target.value)}
                      placeholder={t("budgets.pools.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.category", { defaultValue: "Category" })}</Label>
                    <Select value={poolCategoryId} onValueChange={setPoolCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("budgets.pools.selectCategory", { defaultValue: "Select" })} />
                      </SelectTrigger>
                      <SelectContent>
                        {personalCategories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>{t(`category.${category.name}`, { defaultValue: category.name })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.type", { defaultValue: "Type" })}</Label>
                    <Select value={poolType} onValueChange={(value) => setPoolType(value as "fixed_amount" | "percent_income")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed_amount">{t("budgets.pools.fixed", { defaultValue: "Fixed amount" })}</SelectItem>
                        <SelectItem value="percent_income">{t("budgets.pools.percent", { defaultValue: "% of income" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.target", { defaultValue: "Target" })}</Label>
                    <Input type="number" min="0" step="0.01" value={poolTarget} onChange={(event) => setPoolTarget(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.alert", { defaultValue: "Alert %" })}</Label>
                    <Input type="number" min="1" max="100" step="0.01" value={poolAlert} onChange={(event) => setPoolAlert(event.target.value)} />
                  </div>

                  <div className="md:col-span-5">
                    <Button onClick={() => addPoolMutation.mutate()} disabled={isAddPoolDisabled}>
                      {addPoolMutation.isPending
                        ? t("budgets.actions.saving", { defaultValue: "Saving..." })
                        : t("budgets.actions.addPool", { defaultValue: "Add pool" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-4 p-4">
                  {!selectedBudget ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.summary.selectBudget", { defaultValue: "Select budget to view summary." })}
                    </p>
                  ) : summaryLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : !budgetSummary ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.summary.empty", { defaultValue: "No summary data." })}</p>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.income", { defaultValue: "Income" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.income_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.spent", { defaultValue: "Spent" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.spent_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.saved", { defaultValue: "Saved" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.saved_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.policy", { defaultValue: "Overspending policy" })}</p>
                            <p className="text-lg font-semibold uppercase">{budgetSummary.overspending_strategy.replace("_", " ")}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.expenseMode", { defaultValue: "Expense scope" })}</p>
                            <p className="text-lg font-semibold">
                              {budgetSummary.include_group_expenses
                                ? t("budgets.summary.modeCombined", { defaultValue: "Personal + group shares" })
                                : t("budgets.summary.modePersonalOnly", { defaultValue: "Personal only" })}
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-3">
                        {budgetSummary.pools.map((pool) => (
                          <div key={pool.pool_id} className="rounded-md border border-border p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{pool.pool_name}</p>
                                <p className="text-xs text-muted-foreground">{pool.category_name}</p>
                              </div>
                              <Badge
                                variant={pool.status === "exceeded" ? "destructive" : pool.status === "warning" ? "secondary" : "outline"}
                              >
                                {getPoolStatusLabel(pool.status, t)}
                              </Badge>
                            </div>

                            <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${pool.status === "exceeded" ? "bg-destructive" : "bg-primary"}`}
                                style={{ width: `${Math.min(pool.utilization_percent ?? 0, 100)}%` }}
                              />
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {formatMoney(pool.spent_amount, budgetSummary.currency)} / {formatMoney(pool.allocated_amount, budgetSummary.currency)} · {t("budgets.summary.remaining", { defaultValue: "Remaining" })}: {formatMoney(pool.remaining_amount, budgetSummary.currency)}
                              {pool.utilization_percent != null ? ` (${pool.utilization_percent.toFixed(2)}%)` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-6">
                  <div className="space-y-1 md:col-span-2">
                    <Label>{t("budgets.goals.name", { defaultValue: "Goal name" })}</Label>
                    <Input
                      value={goalName}
                      onChange={(event) => setGoalName(event.target.value)}
                      placeholder={t("budgets.goals.namePlaceholder", { defaultValue: "Emergency fund" })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>{t("budgets.goals.target", { defaultValue: "Target amount" })}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goalTarget}
                      onChange={(event) => setGoalTarget(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>{t("budgets.goals.deadline", { defaultValue: "Deadline (optional)" })}</Label>
                    <DatePicker id="goal-deadline" value={goalDeadline} onChange={setGoalDeadline} />
                  </div>

                  <div className="space-y-1">
                    <Label>{t("budgets.goals.pool", { defaultValue: "Source pool" })}</Label>
                    <Select value={goalBudgetPoolId} onValueChange={setGoalBudgetPoolId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("budgets.goals.poolOptional", { defaultValue: "Optional" })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("budgets.goals.noPool", { defaultValue: "No linked pool" })}</SelectItem>
                        {(selectedBudget?.pools ?? []).map((pool) => (
                          <SelectItem key={pool.id} value={String(pool.id)}>
                            {pool.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>{t("budgets.goals.autoAllocate", { defaultValue: "Auto allocate / period" })}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goalAutoAllocateAmount}
                      onChange={(event) => setGoalAutoAllocateAmount(event.target.value)}
                    />
                  </div>

                  <div className="md:col-span-6 flex flex-wrap gap-2">
                    <Button onClick={() => createGoalMutation.mutate()} disabled={isCreateGoalDisabled}>
                      {createGoalMutation.isPending
                        ? t("budgets.goals.creating", { defaultValue: "Creating..." })
                        : t("budgets.goals.create", { defaultValue: "Create goal" })}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIncludeInactiveGoals((prev) => !prev)}
                    >
                      {includeInactiveGoals
                        ? t("budgets.goals.hideInactive", { defaultValue: "Hide inactive" })
                        : t("budgets.goals.showInactive", { defaultValue: "Show inactive" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-4 p-4">
                  {savingsGoalsLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : savingsGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.goals.empty", { defaultValue: "No savings goals yet." })}
                    </p>
                  ) : (
                    savingsGoals.map((goal) => {
                      const progressPercent = getGoalProgressPercent(goal);
                      const remainingAmount = getGoalRemainingAmount(goal);
                      const allocationInput = goalAllocationAmounts[goal.id] ?? "";
                      const isEditingGoal = editingGoalId === goal.id;
                      const isHistoryExpanded = expandedGoalHistoryId === goal.id;
                      const progressForGoal = isHistoryExpanded ? expandedGoalProgress : undefined;
                      const hasGoalProgressData = progressForGoal?.goal.id === goal.id;
                      const selectedBudgetPools = selectedBudget?.pools ?? [];
                      const selectedBudgetHasGoalPool =
                        goalEditDraft?.budgetPoolId !== "none" &&
                        selectedBudgetPools.some((pool) => String(pool.id) === goalEditDraft?.budgetPoolId);

                      return (
                        <div key={goal.id} className="rounded-md border border-border p-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{goal.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {t("budgets.goals.target", { defaultValue: "Target" })}: {formatMoney(goal.target_amount, selectedBudgetCurrency)}
                                {goal.deadline ? ` · ${t("budgets.goals.deadline", { defaultValue: "Deadline" })}: ${goal.deadline}` : ""}
                              </p>
                            </div>
                            <Badge variant={goal.is_active ? "outline" : "secondary"}>
                              {goal.is_active
                                ? t("budgets.goals.active", { defaultValue: "Active" })
                                : t("budgets.goals.inactive", { defaultValue: "Inactive" })}
                            </Badge>
                          </div>

                          <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                          </div>

                          <p className="mb-3 text-xs text-muted-foreground">
                            {formatMoney(goal.current_amount, selectedBudgetCurrency)} / {formatMoney(goal.target_amount, selectedBudgetCurrency)}
                            {` (${progressPercent.toFixed(2)}%) · ${t("budgets.summary.remaining", { defaultValue: "Remaining" })}: ${formatMoney(remainingAmount, selectedBudgetCurrency)}`}
                          </p>

                          <div className="flex flex-wrap items-end gap-2">
                            <div className="space-y-1">
                              <Label>{t("budgets.goals.allocate", { defaultValue: "Allocate amount" })}</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={allocationInput}
                                onChange={(event) =>
                                  setGoalAllocationAmounts((prev) => ({
                                    ...prev,
                                    [goal.id]: event.target.value,
                                  }))
                                }
                              />
                            </div>

                            <Button
                              variant="outline"
                              onClick={() => allocateGoalMutation.mutate(goal.id)}
                              disabled={
                                allocateGoalMutation.isPending ||
                                !parsePositiveNumber(allocationInput)
                              }
                            >
                              {allocateGoalMutation.isPending
                                ? t("budgets.goals.allocating", { defaultValue: "Allocating..." })
                                : t("budgets.goals.allocateAction", { defaultValue: "Allocate" })}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => toggleGoalActiveMutation.mutate(goal)}
                              disabled={toggleGoalActiveMutation.isPending}
                            >
                              {goal.is_active
                                ? t("budgets.goals.deactivate", { defaultValue: "Deactivate" })
                                : t("budgets.goals.activate", { defaultValue: "Activate" })}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => handleStartGoalEdit(goal)}
                              disabled={updateGoalMutation.isPending}
                            >
                              {t("budgets.actions.edit", { defaultValue: "Edit" })}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() =>
                                setExpandedGoalHistoryId((prev) => (prev === goal.id ? null : goal.id))
                              }
                            >
                              {isHistoryExpanded
                                ? t("budgets.goals.hideHistory", { defaultValue: "Hide history" })
                                : t("budgets.goals.showHistory", { defaultValue: "Show history" })}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => deleteGoalMutation.mutate(goal.id)}
                              disabled={deleteGoalMutation.isPending}
                            >
                              {t("budgets.actions.delete", { defaultValue: "Delete" })}
                            </Button>
                          </div>

                          {isEditingGoal && goalEditDraft ? (
                            <Card className="mt-3 border border-border bg-background/50">
                              <CardContent className="grid gap-3 p-3 md:grid-cols-3">
                                <div className="space-y-1 md:col-span-2">
                                  <Label>{t("budgets.goals.name", { defaultValue: "Goal name" })}</Label>
                                  <Input
                                    value={goalEditDraft.name}
                                    onChange={(event) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              name: event.target.value,
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label>{t("budgets.goals.target", { defaultValue: "Target amount" })}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={goalEditDraft.targetAmount}
                                    onChange={(event) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              targetAmount: event.target.value,
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label>{t("budgets.goals.deadline", { defaultValue: "Deadline (optional)" })}</Label>
                                  <DatePicker
                                    id={`goal-edit-deadline-${goal.id}`}
                                    value={goalEditDraft.deadline}
                                    onChange={(value) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              deadline: value,
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label>{t("budgets.goals.pool", { defaultValue: "Source pool" })}</Label>
                                  <Select
                                    value={goalEditDraft.budgetPoolId}
                                    onValueChange={(value) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              budgetPoolId: value,
                                            }
                                          : prev
                                      )
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">
                                        {t("budgets.goals.noPool", { defaultValue: "No linked pool" })}
                                      </SelectItem>
                                      {selectedBudgetPools.map((pool) => (
                                        <SelectItem key={pool.id} value={String(pool.id)}>
                                          {pool.name}
                                        </SelectItem>
                                      ))}
                                      {!selectedBudgetHasGoalPool && goalEditDraft.budgetPoolId !== "none" ? (
                                        <SelectItem value={goalEditDraft.budgetPoolId}>
                                          {t("budgets.goals.currentPool", {
                                            poolId: goalEditDraft.budgetPoolId,
                                            defaultValue: "Current pool #{{poolId}}",
                                          })}
                                        </SelectItem>
                                      ) : null}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-1">
                                  <Label>{t("budgets.goals.autoAllocate", { defaultValue: "Auto allocate / period" })}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={goalEditDraft.autoAllocateAmount}
                                    onChange={(event) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              autoAllocateAmount: event.target.value,
                                            }
                                          : prev
                                      )
                                    }
                                  />
                                </div>

                                <div className="space-y-1">
                                  <Label>{t("budgets.goals.status", { defaultValue: "Status" })}</Label>
                                  <Select
                                    value={goalEditDraft.isActive ? "active" : "inactive"}
                                    onValueChange={(value) =>
                                      setGoalEditDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              isActive: value === "active",
                                            }
                                          : prev
                                      )
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">
                                        {t("budgets.goals.active", { defaultValue: "Active" })}
                                      </SelectItem>
                                      <SelectItem value="inactive">
                                        {t("budgets.goals.inactive", { defaultValue: "Inactive" })}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="md:col-span-3 flex flex-wrap gap-2">
                                  <Button
                                    onClick={() => updateGoalMutation.mutate(goal.id)}
                                    disabled={updateGoalMutation.isPending || !goalEditDraft.name.trim() || !parsePositiveNumber(goalEditDraft.targetAmount)}
                                  >
                                    {updateGoalMutation.isPending
                                      ? t("budgets.actions.saving", { defaultValue: "Saving..." })
                                      : t("budgets.actions.save", { defaultValue: "Save" })}
                                  </Button>
                                  <Button variant="outline" onClick={handleCancelGoalEdit}>
                                    {t("budgets.actions.cancel", { defaultValue: "Cancel" })}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ) : null}

                          {isHistoryExpanded ? (
                            <Card className="mt-3 border border-border bg-background/50">
                              <CardContent className="space-y-3 p-3">
                                <p className="text-sm font-medium text-foreground">
                                  {t("budgets.goals.history", { defaultValue: "Allocation history" })}
                                </p>

                                {expandedGoalProgressLoading ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t("budgets.loading", { defaultValue: "Loading..." })}
                                  </p>
                                ) : !hasGoalProgressData ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t("budgets.goals.historyEmpty", { defaultValue: "No allocation history yet." })}
                                  </p>
                                ) : progressForGoal.allocations.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">
                                    {t("budgets.goals.historyEmpty", { defaultValue: "No allocation history yet." })}
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {progressForGoal.allocations.map((allocation) => (
                                      <div key={allocation.id} className="flex items-center justify-between rounded-md border border-border p-2">
                                        <div>
                                          <p className="text-xs font-medium text-foreground">
                                            {allocation.allocation_type === "auto"
                                              ? t("budgets.goals.autoAllocation", { defaultValue: "Auto allocation" })
                                              : t("budgets.goals.manualAllocation", { defaultValue: "Manual allocation" })}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {allocation.created_at.slice(0, 10)}
                                            {allocation.notes ? ` · ${allocation.notes}` : ""}
                                          </p>
                                        </div>
                                        <span className="text-xs font-semibold text-foreground">
                                          {formatMoney(allocation.amount, selectedBudgetCurrency)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
