import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { HandCoins, AlertTriangle } from "lucide-react";
import { dashboardApi } from "@/api/dashboardApi";
import { formatCurrency } from "@/utils/currency";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import type { CurrencyEnum } from "@/types/enums";
import { useNavigate } from "react-router-dom";

interface SettlementsSummaryProps {
  currency: CurrencyEnum;
}

export function SettlementsSummary({ currency }: SettlementsSummaryProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "settlements-summary", currency],
    queryFn: () => dashboardApi.getSettlementsSummary({ currency }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settlementsSummary.title", { defaultValue: "Settlements Summary" })}</CardTitle>
          <CardDescription>{t("dashboard.settlementsSummary.description", { defaultValue: "Overview of pending settlements" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settlementsSummary.title", { defaultValue: "Settlements Summary" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <AlertTriangle className="h-12 w-12 text-destructive/50" />
            <p className="text-sm text-muted-foreground">
              {t("common.error", { defaultValue: "Failed to load data." })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.owed_to_me === 0 && data.i_owe === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settlementsSummary.title", { defaultValue: "Settlements Summary" })}</CardTitle>
          <CardDescription>{t("dashboard.settlementsSummary.description", { defaultValue: "Overview of pending settlements" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HandCoins className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.settlementsSummary.noData", { defaultValue: "No settlement data available" })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const owedToMe = toFiniteNumber(data.owed_to_me);
  const iOwe = toFiniteNumber(data.i_owe);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.settlementsSummary.title", { defaultValue: "Settlements Summary" })}</CardTitle>
        <CardDescription>{t("dashboard.settlementsSummary.description", { defaultValue: "Overview of pending settlements" })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/contacts")}
          >
            <span className="text-sm text-muted-foreground">
              {t("dashboard.settlementsSummary.othersOweYou", { defaultValue: "Others owe you" })}
            </span>
            <span className="font-semibold text-emerald-600">
              {formatCurrency(owedToMe, currency)}
            </span>
          </div>
          <div
            className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate("/contacts")}
          >
            <span className="text-sm text-muted-foreground">
              {t("dashboard.settlementsSummary.youOwe", { defaultValue: "You owe" })}
            </span>
            <span className="font-semibold text-destructive">
              {formatCurrency(iOwe, currency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
