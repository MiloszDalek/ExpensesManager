import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageInfoButton from "@/components/help/PageInfoButton";
import type { ApiBudgetPlanResponse, ApiCategoryResponse, ApiBudgetSummaryResponse } from "@/types";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency } from "@/utils/currency";
import type { UseMutationResult } from "@tanstack/react-query";
import { getPoolStatusLabel } from "./budgetLabels";

interface BudgetPoolsSectionProps {
  mobileSection: string;
  selectedBudget: ApiBudgetPlanResponse | null;
  budgetSummary: ApiBudgetSummaryResponse | null | undefined;
  summaryLoading: boolean;
  personalCategories: ApiCategoryResponse[];
  poolName: string;
  setPoolName: (value: string) => void;
  poolCategoryId: string;
  setPoolCategoryId: (value: string) => void;
  poolType: "fixed_amount" | "percent_income";
  setPoolType: (value: "fixed_amount" | "percent_income") => void;
  poolTarget: string;
  setPoolTarget: (value: string) => void;
  poolAlert: string;
  setPoolAlert: (value: string) => void;
  addPoolMutation: UseMutationResult<unknown, Error, void, unknown>;
  isAddPoolDisabled: boolean;
}

export default function BudgetPoolsSection({
  mobileSection,
  selectedBudget,
  budgetSummary,
  summaryLoading,
  personalCategories,
  poolName,
  setPoolName,
  poolCategoryId,
  setPoolCategoryId,
  poolType,
  setPoolType,
  poolTarget,
  setPoolTarget,
  poolAlert,
  setPoolAlert,
  addPoolMutation,
  isAddPoolDisabled,
}: BudgetPoolsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-4 ${mobileSection !== "pools" ? "hidden" : ""}`}>
      <div className="space-y-4">
        <Card className="relative border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <PageInfoButton
            pageKey="budgetsPools"
            variant="icon"
            autoOpen={mobileSection === "pools"}
            className="absolute right-4 top-4"
          />
          <CardContent className="grid gap-3 p-4 md:grid-cols-5">
            <div className="space-y-1">
              <Label>{t("budgets.pools.name")}</Label>
              <Input
                value={poolName}
                onChange={(event) => setPoolName(event.target.value)}
                placeholder={t("budgets.pools.namePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.pools.category")}</Label>
              <Select value={poolCategoryId} onValueChange={setPoolCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("budgets.pools.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {personalCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {t(`category.${category.name}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.pools.type")}</Label>
              <Select
                value={poolType}
                onValueChange={(value) => setPoolType(value as "fixed_amount" | "percent_income")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_amount">{t("budgets.pools.fixed")}</SelectItem>
                  <SelectItem value="percent_income">{t("budgets.pools.percent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.pools.target")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={poolTarget}
                onChange={(event) => setPoolTarget(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.pools.alert")}</Label>
              <Input
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={poolAlert}
                onChange={(event) => setPoolAlert(event.target.value)}
              />
            </div>

            <div className="md:col-span-5">
              <Button onClick={() => addPoolMutation.mutate()} disabled={isAddPoolDisabled}>
                {addPoolMutation.isPending
                  ? t("budgets.actions.saving")
                  : t("budgets.actions.addPool")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="space-y-4 p-4">
            {!selectedBudget ? (
              <p className="text-sm text-muted-foreground">
                {t("budgets.summary.selectBudget")}
              </p>
            ) : summaryLoading ? (
              <p className="text-sm text-muted-foreground">{t("budgets.loading")}</p>
            ) : !budgetSummary ? (
              <p className="text-sm text-muted-foreground">{t("budgets.summary.empty")}</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t("budgets.summary.income")}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(budgetSummary.income_total), budgetSummary.currency as CurrencyEnum)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t("budgets.summary.spent")}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(budgetSummary.spent_total), budgetSummary.currency as CurrencyEnum)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t("budgets.summary.saved")}</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number(budgetSummary.saved_total), budgetSummary.currency as CurrencyEnum)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t("budgets.summary.policy")}</p>
                      <p className="text-lg font-semibold uppercase">
                        {budgetSummary.overspending_strategy.replace("_", " ")}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3">
                      <p className="text-xs text-muted-foreground">{t("budgets.summary.expenseMode")}</p>
                      <p className="text-lg font-semibold">
                        {budgetSummary.include_group_expenses
                          ? t("budgets.summary.modeCombined")
                          : t("budgets.summary.modePersonalOnly")}
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
                          variant={
                            pool.status === "exceeded"
                              ? "destructive"
                              : pool.status === "warning"
                                ? "secondary"
                                : "outline"
                          }
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
                        {formatCurrency(Number(pool.spent_amount), budgetSummary.currency as CurrencyEnum)} /{" "}
                        {formatCurrency(Number(pool.allocated_amount), budgetSummary.currency as CurrencyEnum)} ·{" "}
                        {t("budgets.summary.remaining")}:{" "}
                        {formatCurrency(Number(pool.remaining_amount), budgetSummary.currency as CurrencyEnum)}
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
    </div>
  );
}
