import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency, formatCompactCurrency } from "@/utils/currency";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { cn } from "@/lib/utils";

interface GroupSpendingTrendChartProps {
  groupId: number;
  currency: CurrencyEnum;
  className?: string;
}

const INTERVAL_OPTIONS: { value: "daily" | "weekly" | "monthly"; labelKey: string }[] = [
  { value: "daily", labelKey: "groupSpendingTrend.intervalDaily" },
  { value: "weekly", labelKey: "groupSpendingTrend.intervalWeekly" },
  { value: "monthly", labelKey: "groupSpendingTrend.intervalMonthly" },
];

export function GroupSpendingTrendChart({
  groupId,
  currency,
  className,
}: GroupSpendingTrendChartProps) {
  const { t } = useTranslation();
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">("monthly");

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.groups.spendingTrend(groupId, interval),
    queryFn: () => groupsApi.spendingTrend(groupId, interval),
  });

  const chartData = data?.map((item) => ({
    label: item.label,
    amount: toFiniteNumber(item.amount),
  })) ?? [];

  // Trim leading zeros: find first non-zero amount and slice from there
  const firstNonZeroIndex = chartData.findIndex((d) => d.amount > 0);
  const trimmedData = firstNonZeroIndex >= 0 ? chartData.slice(firstNonZeroIndex) : chartData;

  if (isLoading) {
    return (
      <Card className={cn("border border-border bg-card/80 shadow-sm backdrop-blur-sm", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("groupSpendingTrend.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border border-border bg-card/80 shadow-sm backdrop-blur-sm", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("groupSpendingTrend.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <AlertTriangle className="h-12 w-12 text-destructive/50" />
            <p className="text-sm text-muted-foreground">{t("common.errorLoadingData")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = trimmedData.length > 0 && trimmedData.some((d) => d.amount > 0);

  return (
    <Card className={cn("border border-border bg-card/80 shadow-sm backdrop-blur-sm", className)}>
      <CardHeader className="px-3 sm:px-6">
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {t("groupSpendingTrend.title")}
            </CardTitle>
            <CardDescription className="text-xs pl-7">
              {interval === "daily" && t("groupSpendingTrend.descriptionDaily")}
              {interval === "weekly" && t("groupSpendingTrend.descriptionWeekly")}
              {interval === "monthly" && t("groupSpendingTrend.descriptionMonthly")}
            </CardDescription>
          </div>
          <Select
            value={interval}
            onValueChange={(val) => setInterval(val as "daily" | "weekly" | "monthly")}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {!hasData ? (
          <p className="py-10 text-center text-muted-foreground">
            {t("groupSpendingTrend.noData")}
          </p>
        ) : (
          <div className="h-[220px] w-full sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <BarChart data={trimmedData} margin={{ top: 10, right: 20, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                  angle={interval === "daily" ? -45 : 0}
                  textAnchor={interval === "daily" ? "end" : "middle"}
                  height={interval === "daily" ? 60 : 30}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) =>
                    formatCompactCurrency(Number(value), currency, { noDecimals: true })
                  }
                  width={80}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const value = payload[0]?.value ?? 0;
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium mb-1">{label}</p>
                        <p className="text-sm text-foreground">
                          {formatCurrency(Number(value), currency)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="amount"
                  name={t("groupSpendingTrend.amountLabel")}
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
