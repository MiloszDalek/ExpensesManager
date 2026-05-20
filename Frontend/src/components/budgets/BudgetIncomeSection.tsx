import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageInfoButton from "@/components/help/PageInfoButton";
import type { ApiBudgetPlanResponse, ApiIncomeEntryResponse } from "@/types";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency } from "@/utils/currency";
import type { UseMutationResult } from "@tanstack/react-query";

interface BudgetIncomeSectionProps {
  mobileSection: string;
  selectedBudget: ApiBudgetPlanResponse | null;
  incomeEntries: ApiIncomeEntryResponse[];
  incomeLoading: boolean;
  incomeTitle: string;
  setIncomeTitle: (value: string) => void;
  incomeAmount: string;
  setIncomeAmount: (value: string) => void;
  incomeDate: string;
  setIncomeDate: (value: string) => void;
  addIncomeMutation: UseMutationResult<ApiIncomeEntryResponse, Error, void, unknown>;
  deleteIncomeMutation: UseMutationResult<void, Error, number, unknown>;
  isAddIncomeDisabled: boolean;
}

export default function BudgetIncomeSection({
  mobileSection,
  selectedBudget,
  incomeEntries,
  incomeLoading,
  incomeTitle,
  setIncomeTitle,
  incomeAmount,
  setIncomeAmount,
  incomeDate,
  setIncomeDate,
  addIncomeMutation,
  deleteIncomeMutation,
  isAddIncomeDisabled,
}: BudgetIncomeSectionProps) {
  const { t } = useTranslation();

  return (
    <div className={`space-y-4 ${mobileSection !== "income" ? "hidden" : ""}`}>
      <div className="space-y-4">
        <Card className="relative border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <PageInfoButton
            pageKey="budgetsIncome"
            variant="icon"
            autoOpen={mobileSection === "income"}
            className="absolute right-4 top-4"
          />
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div className="space-y-1">
              <Label>{t("budgets.income.title")}</Label>
              <Input
                value={incomeTitle}
                onChange={(event) => setIncomeTitle(event.target.value)}
                placeholder={t("budgets.income.titlePlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.income.amount")}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={incomeAmount}
                onChange={(event) => setIncomeAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("budgets.income.date")}</Label>
              <DatePicker id="budget-income-date" value={incomeDate} onChange={setIncomeDate} />
            </div>
            <div className="flex items-end">
              <Button onClick={() => addIncomeMutation.mutate()} disabled={isAddIncomeDisabled}>
                {addIncomeMutation.isPending
                  ? t("budgets.actions.saving")
                  : t("budgets.actions.addIncome")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="space-y-3 p-4">
            {!selectedBudget ? (
              <p className="text-sm text-muted-foreground">
                {t("budgets.income.selectBudget")}
              </p>
            ) : incomeLoading ? (
              <p className="text-sm text-muted-foreground">{t("budgets.loading")}</p>
            ) : incomeEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("budgets.income.empty")}</p>
            ) : (
              incomeEntries.map((income) => (
                <div key={income.id} className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{income.title}</p>
                    <p className="text-xs text-muted-foreground">{income.income_date.slice(0, 10)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">
                      {formatCurrency(Number(income.amount), (income.currency || selectedBudget.currency) as CurrencyEnum)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteIncomeMutation.mutate(income.id)}
                      disabled={deleteIncomeMutation.isPending}
                    >
                      {t("budgets.actions.delete")}
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
