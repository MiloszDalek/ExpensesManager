import { useState } from "react";
import type { TFunction } from "i18next";
import { useMutation } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import type { ApiBudgetPlanResponse, ApiBudgetPoolCreate } from "@/types";
import { localizeBudgetError, getErrorMessage } from "./budgetErrors";

export function usePoolForm(
  t: TFunction,
  selectedBudget: ApiBudgetPlanResponse | null,
  refreshBudgetArea: () => Promise<void>,
  setErrorMessage: (msg: string | null) => void,
  setSuccessMessage: (msg: string | null) => void
) {
  const [poolName, setPoolName] = useState("");
  const [poolCategoryId, setPoolCategoryId] = useState<string>("");
  const [poolType, setPoolType] = useState<"fixed_amount" | "percent_income">("fixed_amount");
  const [poolTarget, setPoolTarget] = useState("");
  const [poolAlert, setPoolAlert] = useState("80");

  const addPoolMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected"));
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

  const isAddPoolDisabled =
    !selectedBudget ||
    !poolName.trim() ||
    !poolCategoryId ||
    !poolTarget ||
    addPoolMutation.isPending;

  return {
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
  };
}
