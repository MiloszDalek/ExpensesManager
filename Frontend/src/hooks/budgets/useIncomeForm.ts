import { useState } from "react";
import type { TFunction } from "i18next";
import { useMutation } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import type { ApiBudgetPlanResponse } from "@/types";
import { localizeBudgetError, getErrorMessage } from "./budgetErrors";

const toIsoDateStart = (value: string) => `${value}T00:00:00`;

export function useIncomeForm(
  t: TFunction,
  selectedBudget: ApiBudgetPlanResponse | null,
  refreshBudgetArea: () => Promise<void>,
  setErrorMessage: (msg: string | null) => void,
  setSuccessMessage: (msg: string | null) => void
) {
  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");

  const addIncomeMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected"));
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

  const isAddIncomeDisabled =
    !selectedBudget ||
    !incomeTitle.trim() ||
    !incomeDate ||
    !incomeAmount ||
    addIncomeMutation.isPending;

  return {
    incomeTitle,
    setIncomeTitle,
    incomeAmount,
    setIncomeAmount,
    incomeDate,
    setIncomeDate,
    addIncomeMutation,
    deleteIncomeMutation,
    isAddIncomeDisabled,
  };
}
