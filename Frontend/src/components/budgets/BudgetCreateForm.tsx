import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import type { CurrencyEnum } from "@/types/enums";
import type { UseMutationResult } from "@tanstack/react-query";
import type { ApiBudgetPlanResponse } from "@/types";

interface BudgetCreateFormProps {
  budgetName: string;
  setBudgetName: (value: string) => void;
  budgetCurrency: CurrencyEnum;
  setBudgetCurrency: (value: CurrencyEnum) => void;
  periodType: "monthly" | "weekly";
  setPeriodType: (value: "monthly" | "weekly") => void;
  periodStart: string;
  setPeriodStart: (value: string) => void;
  periodEnd: string;
  setPeriodEnd: (value: string) => void;
  incomeTarget: string;
  setIncomeTarget: (value: string) => void;
  includeGroupExpenses: boolean;
  setIncludeGroupExpenses: (value: boolean) => void;
  createBudgetMutation: UseMutationResult<ApiBudgetPlanResponse, Error, void, unknown>;
  isCreateBudgetDisabled: boolean;
  useTemplate: boolean;
  setUseTemplate: (value: boolean) => void;
}

export default function BudgetCreateForm({
  budgetName,
  setBudgetName,
  budgetCurrency,
  setBudgetCurrency,
  periodType,
  setPeriodType,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  incomeTarget,
  setIncomeTarget,
  includeGroupExpenses,
  setIncludeGroupExpenses,
  createBudgetMutation,
  isCreateBudgetDisabled,
  // useTemplate,
  // setUseTemplate,
}: BudgetCreateFormProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
      <CardContent className="grid gap-3 p-4 md:grid-cols-6">
        <div className="space-y-1 md:col-span-2">
          <Label>{t("budgets.form.name")}</Label>
          <Input
            value={budgetName}
            onChange={(event) => setBudgetName(event.target.value)}
            placeholder={t("budgets.form.namePlaceholder")}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.form.periodType")}</Label>
          <Select
            value={periodType}
            onValueChange={(value) => setPeriodType(value as "monthly" | "weekly")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t("budgets.period.monthly")}</SelectItem>
              <SelectItem value="weekly">{t("budgets.period.weekly")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.form.start")}</Label>
          <DatePicker id="budget-period-start" value={periodStart} onChange={setPeriodStart} />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.form.end")}</Label>
          <DatePicker id="budget-period-end" value={periodEnd} onChange={setPeriodEnd} />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.form.currency")}</Label>
          <CurrencyPicker selectedCurrency={budgetCurrency} onCurrencyChange={setBudgetCurrency} />
        </div>

        <div className="space-y-1">
          <Label>{t("budgets.form.incomeTarget")}</Label>
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
            {t("budgets.form.includeGroupExpenses")}
          </Label>
        </div>

        <div className="md:col-span-6">
          {/* <div className="md:col-span-6 flex items-center gap-2">
            <input
              id="budget-use-template"
              type="checkbox"
              checked={useTemplate}
              onChange={(event) => setUseTemplate(event.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="budget-use-template" className="cursor-pointer text-sm">
              {t("budgets.form.useTemplate")}
            </Label>
          </div> */}
          <Button onClick={() => createBudgetMutation.mutate()} disabled={isCreateBudgetDisabled}>
            {createBudgetMutation.isPending
              ? t("budgets.actions.creating")
              : t("budgets.actions.createWithTemplate")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
