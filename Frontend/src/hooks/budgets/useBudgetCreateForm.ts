import { useState } from "react";
import type { TFunction } from "i18next";
import { useMutation } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import type { CurrencyEnum } from "@/types/enums";
import { localizeBudgetError, getErrorMessage } from "./budgetErrors";

export function useBudgetCreateForm(
  t: TFunction,
  refreshBudgetArea: () => Promise<void>,
  setSelectedBudgetId: (id: number | null) => void,
  setErrorMessage: (msg: string | null) => void,
  setSuccessMessage: (msg: string | null) => void
) {
  const [budgetName, setBudgetName] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<CurrencyEnum>("PLN");
  const [periodType, setPeriodType] = useState<"monthly" | "weekly">("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [incomeTarget, setIncomeTarget] = useState("");
  const [includeGroupExpenses, setIncludeGroupExpenses] = useState(false);
  const [useTemplate, setUseTemplate] = useState(true);

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
        use_template_50_30_20: useTemplate,
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

  const isCreateBudgetDisabled =
    !budgetName.trim() || !periodStart || !periodEnd || createBudgetMutation.isPending;

  return {
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
    useTemplate,
    setUseTemplate,
    createBudgetMutation,
    isCreateBudgetDisabled,
  };
}
