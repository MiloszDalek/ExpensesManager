import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KPISummary } from "@/types/dashboard";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { formatCurrency } from "@/utils/currency";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  data: KPISummary | undefined;
  isLoading?: boolean;
  currency?: string;
}

export function KPICards({ data, isLoading, currency = "USD" }: KPICardsProps) {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }


  const cards = [
    {
      title: t("dashboard.kpi.totalIncome"),
      value: data.total_income,
      icon: DollarSign,
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: t("dashboard.kpi.totalExpenses"),
      value: data.total_expenses,
      icon: TrendingDown,
      iconColor: "text-red-600 dark:text-red-400",
    },
    {
      title: t("dashboard.kpi.totalSavings"),
      value: data.total_savings,
      icon: PiggyBank,
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: t("dashboard.kpi.remainingBudget"),
      value: data.remaining_budget,
      icon: TrendingUp,
      iconColor: data.overspend_flag
        ? "text-destructive"
        : "text-emerald-600 dark:text-emerald-400",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={cn("h-4 w-4", card.iconColor)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(toFiniteNumber(card.value), currency as any)}
            </div>
            {card.title === t("dashboard.kpi.remainingBudget") && data.overspend_flag && (
              <p className="text-xs text-destructive mt-1">{t("dashboard.kpi.overspendingDetected")}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
