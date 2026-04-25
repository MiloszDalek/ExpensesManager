import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SettlementSnapshot } from "@/types/dashboard";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { formatCurrency } from "@/utils/currency";
import { cn } from "@/lib/utils";

interface SettlementSnapshotProps {
  snapshot: SettlementSnapshot | undefined;
  isLoading?: boolean;
  currency?: string;
}

export function SettlementSnapshot({ snapshot, isLoading, currency = "USD" }: SettlementSnapshotProps) {
  const { t } = useTranslation();

  if (isLoading || !snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.settlements.title")}</CardTitle>
          <CardDescription>{t("dashboard.settlements.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = snapshot.net_balance > 0;
  const isNeutral = snapshot.net_balance === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.settlements.title")}</CardTitle>
        <CardDescription>
          {snapshot.pending_settlements_count > 0
            ? t("dashboard.settlements.pendingSettlements", { 
                count: snapshot.pending_settlements_count,
                plural: snapshot.pending_settlements_count !== 1 ? "s" : ""
              })
            : t("dashboard.settlements.allSettled")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Net Balance */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t("dashboard.settlements.netBalance")}</span>
              <DollarSign className={cn(
                "h-4 w-4",
                isNeutral
                  ? "text-muted-foreground"
                  : isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
              )} />
            </div>
            <div className="mt-2">
              <div className={cn(
                "text-3xl font-bold",
                isNeutral
                  ? "text-foreground"
                  : isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
              )}>
                {isPositive ? "+" : ""}{formatCurrency(toFiniteNumber((snapshot as unknown as Record<string, unknown>).net_balance), currency as any)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isNeutral
                  ? t("dashboard.settlements.youreEven")
                  : isPositive
                    ? t("dashboard.settlements.youreOwed")
                    : t("dashboard.settlements.youOwe")}
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">{t("dashboard.settlements.owedToMe")}</span>
              </div>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(toFiniteNumber((snapshot as unknown as Record<string, unknown>).total_owed_to_me), currency as any)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">{t("dashboard.settlements.iOwe")}</span>
              </div>
              <span className="font-semibold text-destructive">
                {formatCurrency(toFiniteNumber((snapshot as unknown as Record<string, unknown>).total_i_owe), currency as any)}
              </span>
            </div>
          </div>

          {/* Action hint */}
          {snapshot.pending_settlements_count > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                {t("dashboard.settlements.manageSettlements")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
