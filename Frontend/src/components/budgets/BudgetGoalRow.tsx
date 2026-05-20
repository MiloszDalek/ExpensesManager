import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ApiSavingsGoalResponse } from "@/types";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency } from "@/utils/currency";
import type { UseMutationResult } from "@tanstack/react-query";
import BudgetGoalEditForm from "./BudgetGoalEditForm";
import BudgetGoalHistory from "./BudgetGoalHistory";
import type { GoalEditDraft } from "@/hooks/budgets/useGoalsSection";
import type { ApiBudgetPoolResponse } from "@/types";

function getGoalProgressPercent(goal: ApiSavingsGoalResponse): number {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  if (target <= 0) return 0;
  return Math.min((current / target) * 100, 100);
}

function getGoalRemainingAmount(goal: ApiSavingsGoalResponse): number {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  return Math.max(target - current, 0);
}

interface BudgetGoalRowProps {
  goal: ApiSavingsGoalResponse;
  selectedBudgetCurrency: string;
  allocationInput: string;
  setAllocationInput: (value: string) => void;
  isEditing: boolean;
  isHistoryExpanded: boolean;
  goalEditDraft: GoalEditDraft | null;
  setGoalEditDraft: React.Dispatch<React.SetStateAction<GoalEditDraft | null>>;
  selectedBudgetPools: ApiBudgetPoolResponse[];
  selectedBudgetHasGoalPool: boolean;
  progress: import("@/types").ApiSavingsGoalProgressResponse | null;
  progressLoading: boolean;
  hasProgressData: boolean;
  allocateGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  toggleGoalActiveMutation: UseMutationResult<unknown, Error, ApiSavingsGoalResponse, unknown>;
  updateGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  deleteGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  onToggleHistory: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
}

export default function BudgetGoalRow({
  goal,
  selectedBudgetCurrency,
  allocationInput,
  setAllocationInput,
  isEditing,
  isHistoryExpanded,
  goalEditDraft,
  setGoalEditDraft,
  selectedBudgetPools,
  selectedBudgetHasGoalPool,
  progress,
  progressLoading,
  hasProgressData,
  allocateGoalMutation,
  toggleGoalActiveMutation,
  updateGoalMutation,
  deleteGoalMutation,
  onToggleHistory,
  onStartEdit,
  onCancelEdit,
}: BudgetGoalRowProps) {
  const { t } = useTranslation();

  const progressPercent = getGoalProgressPercent(goal);
  const remainingAmount = getGoalRemainingAmount(goal);

  const parsePositiveNumber = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  return (
    <div className="rounded-md border border-border p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{goal.name}</p>
          <p className="text-xs text-muted-foreground">
            {t("budgets.goals.target")}: {formatCurrency(Number(goal.target_amount), selectedBudgetCurrency as CurrencyEnum)}
            {goal.deadline ? ` · ${t("budgets.goals.deadline")}: ${goal.deadline}` : ""}
          </p>
        </div>
        <Badge variant={goal.is_active ? "outline" : "secondary"}>
          {goal.is_active ? t("budgets.goals.active") : t("budgets.goals.inactive")}
        </Badge>
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {formatCurrency(Number(goal.current_amount), selectedBudgetCurrency as CurrencyEnum)} /{" "}
        {formatCurrency(Number(goal.target_amount), selectedBudgetCurrency as CurrencyEnum)}
        {` (${progressPercent.toFixed(2)}%) · ${t("budgets.summary.remaining")}: ${formatCurrency(Number(remainingAmount), selectedBudgetCurrency as CurrencyEnum)}`}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>{t("budgets.goals.allocate")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={allocationInput}
            onChange={(event) => setAllocationInput(event.target.value)}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => allocateGoalMutation.mutate(goal.id)}
          disabled={allocateGoalMutation.isPending || !parsePositiveNumber(allocationInput)}
        >
          {allocateGoalMutation.isPending
            ? t("budgets.goals.allocating")
            : t("budgets.goals.allocateAction")}
        </Button>

        <Button
          variant="outline"
          onClick={() => toggleGoalActiveMutation.mutate(goal)}
          disabled={toggleGoalActiveMutation.isPending}
        >
          {goal.is_active
            ? t("budgets.goals.deactivate")
            : t("budgets.goals.activate")}
        </Button>

        <Button
          variant="outline"
          onClick={onStartEdit}
          disabled={updateGoalMutation.isPending}
        >
          {t("budgets.actions.edit")}
        </Button>

        <Button variant="outline" onClick={onToggleHistory}>
          {isHistoryExpanded
            ? t("budgets.goals.hideHistory")
            : t("budgets.goals.showHistory")}
        </Button>

        <Button
          variant="outline"
          onClick={() => deleteGoalMutation.mutate(goal.id)}
          disabled={deleteGoalMutation.isPending}
        >
          {t("budgets.actions.delete")}
        </Button>
      </div>

      {isEditing && goalEditDraft ? (
        <BudgetGoalEditForm
          goalId={goal.id}
          goalEditDraft={goalEditDraft}
          setGoalEditDraft={setGoalEditDraft}
          selectedBudgetPools={selectedBudgetPools}
          selectedBudgetHasGoalPool={selectedBudgetHasGoalPool}
          updateGoalMutation={updateGoalMutation}
          onCancel={onCancelEdit}
        />
      ) : null}

      {isHistoryExpanded ? (
        <BudgetGoalHistory
          progress={progress}
          progressLoading={progressLoading}
          hasData={hasProgressData}
          selectedBudgetCurrency={selectedBudgetCurrency}
        />
      ) : null}
    </div>
  );
}
