import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BudgetStatus } from "@/types/dashboard";
import { formatCurrency } from "@/utils/currency";
import { cn } from "@/lib/utils";
import { toFixedSafe } from "@/utils/toFiniteNumber";

interface BudgetStatusListProps {
  budgets: BudgetStatus[] | undefined;
  isLoading?: boolean;
  currency?: string;
}

export function BudgetStatusList({ budgets, isLoading, currency = "USD" }: BudgetStatusListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.budgetStatus.title")}</CardTitle>
          <CardDescription>{t("dashboard.budgetStatus.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!budgets || budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.budgetStatus.title")}</CardTitle>
          <CardDescription>{t("dashboard.budgetStatus.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.budgetStatus.noBudgets")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    if (status === "EXCEEDED") {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (status === "WARNING") {
      return <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
  };

  const getProgressColor = (status: string) => {
    if (status === "EXCEEDED") return "bg-destructive";
    if (status === "WARNING") return "bg-orange-600 dark:bg-orange-400";
    return "bg-primary";
  };

  // Get the first active budget (or first budget)
  const budget = budgets[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.budgetStatus.title")}</CardTitle>
        <CardDescription>
          {budget.budget_name} • {new Date(budget.period_start).toLocaleDateString()} - {new Date(budget.period_end).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budget.pools.map((pool) => (
            <div key={pool.pool_id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(pool.status)}
                  <span className="font-medium text-sm">{pool.category_name}</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold">${toFixedSafe(pool.spent)}</span>
                  <span className="text-muted-foreground"> / ${toFixedSafe(pool.allocated)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", getProgressColor(pool.status))}
                    style={{ width: `${Math.min(pool.usage_percentage || 0, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {t("dashboard.budgetStatus.used", { percentage: toFixedSafe(pool.usage_percentage, 1) || "0" })}
                  </span>
                  <span className={cn(
                    "font-medium",
                    pool.remaining < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                  )}>
                    {t(pool.remaining < 0 ? "dashboard.budgetStatus.over" : "dashboard.budgetStatus.remaining")}: {formatCurrency(Math.abs(pool.remaining), currency as any)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {budgets.length > 1 && (
          <p className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            {t("dashboard.budgetStatus.showingLimited", { count: budgets.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
