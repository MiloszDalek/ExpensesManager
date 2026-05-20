import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiSavingsGoalProgressResponse } from "@/types";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency } from "@/utils/currency";

interface BudgetGoalHistoryProps {
  progress: ApiSavingsGoalProgressResponse | null;
  progressLoading: boolean;
  hasData: boolean;
  selectedBudgetCurrency: string;
}

export default function BudgetGoalHistory({
  progress,
  progressLoading,
  hasData,
  selectedBudgetCurrency,
}: BudgetGoalHistoryProps) {
  const { t } = useTranslation();

  return (
    <Card className="mt-3 border border-border bg-background/50">
      <CardContent className="space-y-3 p-3">
        <p className="text-sm font-medium text-foreground">
          {t("budgets.goals.history")}
        </p>

        {progressLoading ? (
          <p className="text-xs text-muted-foreground">{t("budgets.loading")}</p>
        ) : !hasData ? (
          <p className="text-xs text-muted-foreground">{t("budgets.goals.historyEmpty")}</p>
        ) : progress && progress.allocations.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("budgets.goals.historyEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {progress?.allocations.map((allocation) => (
              <div key={allocation.id} className="flex items-center justify-between rounded-md border border-border p-2">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {allocation.allocation_type === "auto"
                      ? t("budgets.goals.autoAllocation")
                      : t("budgets.goals.manualAllocation")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {allocation.created_at.slice(0, 10)}
                    {allocation.notes ? ` · ${allocation.notes}` : ""}
                  </p>
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {formatCurrency(Number(allocation.amount), selectedBudgetCurrency as CurrencyEnum)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
