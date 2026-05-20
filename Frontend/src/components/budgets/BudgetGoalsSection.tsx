import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import PageInfoButton from "@/components/help/PageInfoButton";
import type { ApiBudgetPlanResponse, ApiSavingsGoalResponse, ApiSavingsGoalProgressResponse } from "@/types";
import type { UseMutationResult } from "@tanstack/react-query";
import BudgetGoalRow from "./BudgetGoalRow";
import type { GoalEditDraft } from "@/hooks/budgets/useGoalsSection";

interface BudgetGoalsSectionProps {
  mobileSection: string;
  selectedBudget: ApiBudgetPlanResponse | null;
  selectedBudgetCurrency: string;
  goalName: string;
  setGoalName: (value: string) => void;
  goalTarget: string;
  setGoalTarget: (value: string) => void;
  goalDeadline: string;
  setGoalDeadline: (value: string) => void;
  goalBudgetPoolId: string;
  setGoalBudgetPoolId: (value: string) => void;
  goalAutoAllocateAmount: string;
  setGoalAutoAllocateAmount: (value: string) => void;
  includeInactiveGoals: boolean;
  setIncludeInactiveGoals: React.Dispatch<React.SetStateAction<boolean>>;
  goalAllocationAmounts: Record<number, string>;
  setGoalAllocationAmounts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  expandedGoalHistoryId: number | null;
  setExpandedGoalHistoryId: React.Dispatch<React.SetStateAction<number | null>>;
  editingGoalId: number | null;
  setEditingGoalId: (value: number | null) => void;
  goalEditDraft: GoalEditDraft | null;
  setGoalEditDraft: React.Dispatch<React.SetStateAction<GoalEditDraft | null>>;
  savingsGoals: ApiSavingsGoalResponse[];
  savingsGoalsLoading: boolean;
  expandedGoalProgress: ApiSavingsGoalProgressResponse | null | undefined;
  expandedGoalProgressLoading: boolean;
  createGoalMutation: UseMutationResult<unknown, Error, void, unknown>;
  allocateGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  deleteGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  updateGoalMutation: UseMutationResult<unknown, Error, number, unknown>;
  toggleGoalActiveMutation: UseMutationResult<unknown, Error, ApiSavingsGoalResponse, unknown>;
  isCreateGoalDisabled: boolean;
}

export default function BudgetGoalsSection({
  mobileSection,
  selectedBudget,
  selectedBudgetCurrency,
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
  updateGoalMutation,
  toggleGoalActiveMutation,
  isCreateGoalDisabled,
}: BudgetGoalsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-4 ${mobileSection !== "goals" ? "hidden" : ""}`}>
      <div className="space-y-4">
        <Card className="relative border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <PageInfoButton
            pageKey="budgetsGoals"
            variant="icon"
            autoOpen={mobileSection === "goals"}
            className="absolute right-4 top-4"
          />
          <CardContent className="grid gap-3 p-4 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label>{t("budgets.goals.name")}</Label>
              <Input
                value={goalName}
                onChange={(event) => setGoalName(event.target.value)}
                placeholder={t("budgets.goals.namePlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.goals.target")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={goalTarget}
                onChange={(event) => setGoalTarget(event.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.goals.deadline")}</Label>
              <DatePicker id="goal-deadline" value={goalDeadline} onChange={setGoalDeadline} />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.goals.pool")}</Label>
              <Select value={goalBudgetPoolId} onValueChange={setGoalBudgetPoolId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("budgets.goals.poolOptional")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("budgets.goals.noPool")}</SelectItem>
                  {(selectedBudget?.pools ?? []).map((pool) => (
                    <SelectItem key={pool.id} value={String(pool.id)}>
                      {pool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.goals.autoAllocate")}</Label>
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
                  ? t("budgets.goals.creating")
                  : t("budgets.goals.create")}
              </Button>

              <Button
                variant="outline"
                onClick={() => setIncludeInactiveGoals((prev) => !prev)}
              >
                {includeInactiveGoals
                  ? t("budgets.goals.hideInactive")
                  : t("budgets.goals.showInactive")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="space-y-4 p-4">
            {savingsGoalsLoading ? (
              <p className="text-sm text-muted-foreground">{t("budgets.loading")}</p>
            ) : savingsGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("budgets.goals.empty")}</p>
            ) : (
              savingsGoals.map((goal) => {
                const isHistoryExpanded = expandedGoalHistoryId === goal.id;
                const progressForGoal = isHistoryExpanded ? expandedGoalProgress : undefined;
                const hasGoalProgressData = progressForGoal?.goal.id === goal.id;
                const selectedBudgetPools = selectedBudget?.pools ?? [];
                const selectedBudgetHasGoalPool =
                  goalEditDraft?.budgetPoolId !== "none" &&
                  selectedBudgetPools.some((pool) => String(pool.id) === goalEditDraft?.budgetPoolId);

                return (
                  <BudgetGoalRow
                    key={goal.id}
                    goal={goal}
                    selectedBudgetCurrency={selectedBudgetCurrency}
                    allocationInput={goalAllocationAmounts[goal.id] ?? ""}
                    setAllocationInput={(value) =>
                      setGoalAllocationAmounts((prev) => ({ ...prev, [goal.id]: value }))
                    }
                    isEditing={editingGoalId === goal.id}
                    isHistoryExpanded={isHistoryExpanded}
                    goalEditDraft={goalEditDraft}
                    setGoalEditDraft={setGoalEditDraft}
                    selectedBudgetPools={selectedBudgetPools}
                    selectedBudgetHasGoalPool={selectedBudgetHasGoalPool}
                    progress={progressForGoal ?? null}
                    progressLoading={expandedGoalProgressLoading}
                    hasProgressData={hasGoalProgressData}
                    allocateGoalMutation={allocateGoalMutation}
                    toggleGoalActiveMutation={toggleGoalActiveMutation}
                    updateGoalMutation={updateGoalMutation}
                    deleteGoalMutation={deleteGoalMutation}
                    onToggleHistory={() =>
                      setExpandedGoalHistoryId((prev) => (prev === goal.id ? null : goal.id))
                    }
                    onStartEdit={() => {
                      setEditingGoalId(goal.id);
                      setGoalEditDraft({
                        name: goal.name,
                        targetAmount: String(goal.target_amount ?? ""),
                        deadline: goal.deadline ?? "",
                        budgetPoolId: goal.budget_pool_id === null ? "none" : String(goal.budget_pool_id),
                        autoAllocateAmount: goal.auto_allocate_amount === null ? "" : String(goal.auto_allocate_amount),
                        isActive: goal.is_active,
                      });
                    }}
                    onCancelEdit={() => {
                      setEditingGoalId(null);
                      setGoalEditDraft(null);
                    }}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
