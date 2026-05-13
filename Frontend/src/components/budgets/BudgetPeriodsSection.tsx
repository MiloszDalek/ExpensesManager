import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageInfoButton from "@/components/help/PageInfoButton";
import type { ApiBudgetPlanResponse } from "@/types";
import type { UseMutationResult } from "@tanstack/react-query";
import type { User } from "@/types";
import { getBudgetStatusLabel } from "./budgetLabels";

interface BudgetPeriodsSectionProps {
  mobileSection: string;
  selectedBudget: ApiBudgetPlanResponse | null;
  selectedBudgetId: number | null;
  setSelectedBudgetId: (id: number) => void;
  budgets: ApiBudgetPlanResponse[];
  budgetsLoading: boolean;
  user: User | null;
  recalculateBudgetMutation: UseMutationResult<unknown, Error, void, unknown>;
  autoAllocateGoalsMutation: UseMutationResult<unknown, Error, void, unknown>;
  toggleGroupExpenseModeMutation: UseMutationResult<ApiBudgetPlanResponse, Error, void, unknown>;
  closeBudgetMutation: UseMutationResult<{ to_budget_id: number }, Error, void, unknown>;
  runDueRolloversMutation: UseMutationResult<{ processed_budgets_count: number; created_budgets_count: number }, Error, void, unknown>;
}

export default function BudgetPeriodsSection({
  mobileSection,
  selectedBudget,
  selectedBudgetId,
  setSelectedBudgetId,
  budgets,
  budgetsLoading,
  user,
  recalculateBudgetMutation,
  autoAllocateGoalsMutation,
  toggleGroupExpenseModeMutation,
  closeBudgetMutation,
  runDueRolloversMutation,
}: BudgetPeriodsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-4 ${mobileSection !== "periods" ? "hidden" : ""}`}>
      <div className="space-y-4">
        <Card className="relative border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <PageInfoButton
            pageKey="budgetsPeriods"
            variant="icon"
            autoOpen={mobileSection === "periods"}
            className="absolute right-4 top-4"
          />
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {selectedBudget
                    ? t("budgets.periods.current")
                    : t("budgets.periods.none")}
                </p>
                {selectedBudget ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedBudget.name} · {selectedBudget.period_start} - {selectedBudget.period_end}
                    {" · "}
                    {selectedBudget.include_group_expenses
                      ? t("budgets.summary.modeCombined")
                      : t("budgets.summary.modePersonalOnly")}
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
                    ? t("budgets.actions.recalculating")
                    : t("budgets.actions.recalculate")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => autoAllocateGoalsMutation.mutate()}
                  disabled={!selectedBudget || autoAllocateGoalsMutation.isPending}
                >
                  {autoAllocateGoalsMutation.isPending
                    ? t("budgets.actions.autoAllocating")
                    : t("budgets.actions.autoAllocateGoals")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleGroupExpenseModeMutation.mutate()}
                  disabled={!selectedBudget || toggleGroupExpenseModeMutation.isPending}
                >
                  {toggleGroupExpenseModeMutation.isPending
                    ? t("budgets.actions.switchingMode")
                    : selectedBudget?.include_group_expenses
                      ? t("budgets.actions.disableGroupExpenses")
                      : t("budgets.actions.enableGroupExpenses")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => closeBudgetMutation.mutate()}
                  disabled={!selectedBudget || closeBudgetMutation.isPending}
                >
                  {closeBudgetMutation.isPending
                    ? t("budgets.actions.closing")
                    : t("budgets.actions.closePeriod")}
                </Button>
                {user?.role === "admin" ? (
                  <Button
                    variant="outline"
                    onClick={() => runDueRolloversMutation.mutate()}
                    disabled={runDueRolloversMutation.isPending}
                  >
                    {runDueRolloversMutation.isPending
                      ? t("budgets.actions.runningDue")
                      : t("budgets.actions.runDueRollovers")}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="space-y-3 p-4">
            {budgetsLoading ? (
              <p className="text-sm text-muted-foreground">{t("budgets.loading")}</p>
            ) : budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("budgets.empty")}</p>
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
                        ? t("budgets.actions.selected")
                        : t("budgets.actions.select")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
