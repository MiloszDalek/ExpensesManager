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

  // Format labels for monthly, daily, and weekly intervals to show month names
  const formatLabel = (label: string) => {
    const monthNames = [
      t("common.months.jan", { defaultValue: "Jan" }),
      t("common.months.feb", { defaultValue: "Feb" }),
      t("common.months.mar", { defaultValue: "Mar" }),
      t("common.months.apr", { defaultValue: "Apr" }),
      t("common.months.may", { defaultValue: "May" }),
      t("common.months.jun", { defaultValue: "Jun" }),
      t("common.months.jul", { defaultValue: "Jul" }),
      t("common.months.aug", { defaultValue: "Aug" }),
      t("common.months.sep", { defaultValue: "Sep" }),
      t("common.months.oct", { defaultValue: "Oct" }),
      t("common.months.nov", { defaultValue: "Nov" }),
      t("common.months.dec", { defaultValue: "Dec" }),
    ];

    if (interval === "monthly") {
      // Try to parse as YYYY-MM format and format as month name
      const parts = label.split("-");
      if (parts.length === 2) {
        const year = parts[0];
        const month = parts[1];
        const monthIndex = parseInt(month, 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          return `${monthNames[monthIndex]} ${year.slice(-2)}`;
        }
      }
    } else if (interval === "daily") {
      // Try to parse as YYYY-MM-DD format and format as day and month name
      const parts = label.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          return `${day} ${monthNames[month - 1]}`;
        }
      }
    } else if (interval === "weekly") {
      // Try to parse as YYYY-W## format and format as month name and week in month
      const match = label.match(/(\d{4})-W(\d+)/);
      if (match) {
        const year = parseInt(match[1], 10);
        const weekNumber = parseInt(match[2], 10);
        // Calculate the date of the first day of the given week (Monday)
        const janFirst = new Date(year, 0, 1);
        const firstDayOfYear = janFirst.getDay();
        const firstThursday = new Date(year, 0, 1 + ((4 - firstDayOfYear + 7) % 7));
        const weekStart = new Date(firstThursday);
        weekStart.setDate(firstThursday.getDate() - 3 + (weekNumber - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        // Determine which month to use based on where most of the week falls
        const weekMidpoint = new Date(weekStart);
        weekMidpoint.setDate(weekStart.getDate() + 3);
        const primaryMonthIndex = weekMidpoint.getMonth();

        return `${monthNames[primaryMonthIndex]}-${weekNumber}`;
      }
    }
    return label;
  };

  const formattedChartData = chartData.map((item) => ({
    ...item,
    label: formatLabel(item.label),
  }));

  // Trim leading zeros: find first non-zero amount and slice from there
  // Always trim, but ensure at least 3 data points remain
  const firstNonZeroIndex = formattedChartData.findIndex((d) => d.amount > 0);
  let trimmedData = formattedChartData;
  if (firstNonZeroIndex >= 0) {
    const remainingAfterFirstNonZero = formattedChartData.length - firstNonZeroIndex;
    if (remainingAfterFirstNonZero >= 3) {
      trimmedData = formattedChartData.slice(firstNonZeroIndex);
    } else if (formattedChartData.length >= 3) {
      // Trim to leave exactly 3 data points
      trimmedData = formattedChartData.slice(formattedChartData.length - 3);
    }
  }

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
                  angle={interval === "daily" || interval === "weekly" || interval === "monthly" ? -45 : 0}
                  textAnchor={interval === "daily" || interval === "weekly" || interval === "monthly" ? "end" : "middle"}
                  height={interval === "daily" || interval === "weekly" || interval === "monthly" ? 60 : 30}
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
