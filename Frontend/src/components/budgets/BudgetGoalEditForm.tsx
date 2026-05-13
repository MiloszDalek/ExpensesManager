import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ApiBudgetPoolResponse } from "@/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { GoalEditDraft } from "@/hooks/budgets/useGoalsSection";

interface BudgetGoalEditFormProps {
  goalId: number;
  goalEditDraft: GoalEditDraft;
  setGoalEditDraft: React.Dispatch<React.SetStateAction<GoalEditDraft | null>>;
  selectedBudgetPools: ApiBudgetPoolResponse[];
  selectedBudgetHasGoalPool: boolean;
  updateGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  onCancel: () => void;
}

export default function BudgetGoalEditForm({
  goalId,
  goalEditDraft,
  setGoalEditDraft,
  selectedBudgetPools,
  selectedBudgetHasGoalPool,
  updateGoalMutation,
  onCancel,
}: BudgetGoalEditFormProps) {
  const { t } = useTranslation();

  const parsePositiveNumber = (value: string) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return numeric;
  };

  const isSaveDisabled =
    updateGoalMutation.isPending ||
    !goalEditDraft.name.trim() ||
    !parsePositiveNumber(goalEditDraft.targetAmount);

  return (
    <Card className="mt-3 border border-border bg-background/50">
      <CardContent className="grid gap-3 p-3 md:grid-cols-3">
        <div className="space-y-1 md:col-span-2">
          <Label>{t("budgets.goals.name")}</Label>
          <Input
            value={goalEditDraft.name}
            onChange={(event) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, name: event.target.value } : prev
              )
            }
          />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.goals.target")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={goalEditDraft.targetAmount}
            onChange={(event) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, targetAmount: event.target.value } : prev
              )
            }
          />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.goals.deadline")}</Label>
          <DatePicker
            id={`goal-edit-deadline-${goalId}`}
            value={goalEditDraft.deadline}
            onChange={(value) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, deadline: value } : prev
              )
            }
          />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.goals.pool")}</Label>
          <Select
            value={goalEditDraft.budgetPoolId}
            onValueChange={(value) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, budgetPoolId: value } : prev
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("budgets.goals.noPool")}</SelectItem>
              {selectedBudgetPools.map((pool) => (
                <SelectItem key={pool.id} value={String(pool.id)}>
                  {pool.name}
                </SelectItem>
              ))}
              {!selectedBudgetHasGoalPool && goalEditDraft.budgetPoolId !== "none" ? (
                <SelectItem value={goalEditDraft.budgetPoolId}>
                  {t("budgets.goals.currentPool", { poolId: goalEditDraft.budgetPoolId })}
                </SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.goals.autoAllocate")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={goalEditDraft.autoAllocateAmount}
            onChange={(event) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, autoAllocateAmount: event.target.value } : prev
              )
            }
          />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.goals.status")}</Label>
          <Select
            value={goalEditDraft.isActive ? "active" : "inactive"}
            onValueChange={(value) =>
              setGoalEditDraft((prev) =>
                prev ? { ...prev, isActive: value === "active" } : prev
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{t("budgets.goals.active")}</SelectItem>
              <SelectItem value="inactive">{t("budgets.goals.inactive")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3 flex flex-wrap gap-2">
          <Button
            onClick={() => updateGoalMutation.mutate(goalId)}
            disabled={isSaveDisabled}
          >
            {updateGoalMutation.isPending
              ? t("budgets.actions.saving")
              : t("budgets.actions.save")}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            {t("budgets.actions.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
