import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { expensesSummaryApi } from "@/api/expensesSummaryApi";
import type { CurrencyEnum } from "@/types/enums";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { formatCurrency, formatCompactCurrency } from "@/utils/currency";
import { convertToCumulative } from "@/utils/convertToCumulative";

interface SpendingTrendChartProps {
  currency: CurrencyEnum;
  range: string;
  onRangeChange: (range: string) => void;
}

const RANGE_OPTIONS = [
  { value: "current_week", labelKey: "range.currentWeek" },
  { value: "previous_week", labelKey: "range.previousWeek" },
  { value: "current_month", labelKey: "range.currentMonth" },
  { value: "previous_month", labelKey: "range.previousMonth" },
];

const PREVIOUS_RANGE_MAP: Record<string, string> = {
  current_week: "previous_week",
  current_month: "previous_month",
};

function getPreviousRange(range: string): string | null {
  return PREVIOUS_RANGE_MAP[range] || null;
}

export function SpendingTrendChart({ currency, range, onRangeChange }: SpendingTrendChartProps) {
  const { t } = useTranslation();
  const [compare, setCompare] = useState(false);

  const previousRange = getPreviousRange(range);

  const {
    data: currentData,
    isLoading: currentLoading,
  } = useQuery({
    queryKey: ["expenses", "trend", range, currency],
    queryFn: () => expensesSummaryApi.trend({ range, currency }),
  });

  const {
    data: previousData,
    isLoading: previousLoading,
  } = useQuery({
    queryKey: ["expenses", "trend", previousRange, currency],
    queryFn: () => expensesSummaryApi.trend({ range: previousRange!, currency }),
    enabled: compare && !!previousRange,
  });

  const isLoading = currentLoading || (compare && previousLoading);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.spendingTrend.title")}</CardTitle>
          <CardDescription>{t("dashboard.spendingTrend.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.spendingTrend.title")}</CardTitle>
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

  function fillMissingDays(
    points: { date: string; amount: number }[]
  ): { date: string; amount: number }[] {
    if (points.length === 0) return [];
    const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
    const start = new Date(sorted[0].date);
    const end = new Date(sorted[sorted.length - 1].date);
    const amountMap = new Map(sorted.map((p) => [p.date, p.amount]));
    const result: { date: string; amount: number }[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      result.push({ date: dateStr, amount: amountMap.get(dateStr) || 0 });
    }
    return result;
  }

  function alignByDayIndex(
    current: { value: number }[],
    previous: { value: number }[]
  ): { day: number; current: number; previous: number }[] {
    const maxLen = Math.max(current.length, previous.length);
    const result: { day: number; current: number; previous: number }[] = [];
    for (let i = 0; i < maxLen; i++) {
      result.push({
        day: i + 1,
        current: current[i]?.value ?? 0,
        previous: previous[i]?.value ?? 0,
      });
    }
    return result;
  }

  const currentFilled = fillMissingDays(
    currentData.points.map((p) => ({
      date: p.date,
      amount: toFiniteNumber(p.amount),
    }))
  );
  const currentCumulative = convertToCumulative(
    currentFilled.map((d) => ({ ...d, currency }))
  );

  const previousCumulative = previousData
    ? (() => {
        const filled = fillMissingDays(
          previousData.points.map((p) => ({
            date: p.date,
            amount: toFiniteNumber(p.amount),
          }))
        );
        return convertToCumulative(filled.map((d) => ({ ...d, currency })));
      })()
    : [];

  const previousCumulativeTrimmed = previousCumulative.slice(0, currentCumulative.length);

  const chartData = compare
    ? alignByDayIndex(currentCumulative, previousCumulativeTrimmed)
    : currentCumulative.map((d, i) => ({ day: i + 1, current: d.value, previous: 0 }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("dashboard.spendingTrend.title")}</CardTitle>
          <CardDescription>
            {t("dashboard.spendingTrend.cumulativeDescription", { currency })}
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <label
            className={`flex items-center gap-2 text-sm ${
              !previousRange
                ? "text-muted-foreground opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              disabled={!previousRange}
              className="rounded border-border"
            />
            {t("dashboard.spendingTrend.comparePrevious")}
          </label>
          <Select
            value={range}
            onValueChange={(val) => {
              onRangeChange(val);
              if (!PREVIOUS_RANGE_MAP[val]) setCompare(false);
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("range.select")} />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={300}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="prevTrendColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => formatCompactCurrency(Number(value), currency)}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const label =
                    name === "current"
                      ? t("dashboard.spendingTrend.current") || "Current"
                      : t("dashboard.spendingTrend.previous") || "Previous";
                  return [formatCurrency(value || 0, currency), label];
                }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke="#16a34a"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#trendColor)"
              />
              {compare && !!previousData && (
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke="#eab308"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#prevTrendColor)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
