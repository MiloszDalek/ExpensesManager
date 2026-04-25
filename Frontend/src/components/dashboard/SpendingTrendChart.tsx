import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { TrendData } from "@/types/dashboard";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
interface SpendingTrendChartProps {
  data: TrendData | undefined;
  isLoading?: boolean;
  currency?: string;
}

export function SpendingTrendChart({ data, isLoading, currency = "USD" }: SpendingTrendChartProps) {
  const { t } = useTranslation();

  if (isLoading || !data) {
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

  // Prepare data for Recharts
  const chartData = data.data_points.map(point => ({
    name: point.label || point.period,
    amount: toFiniteNumber(point.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.spendingTrend.title")}</CardTitle>
        <CardDescription>
          {t("dashboard.spendingTrend.overview", { 
            period: data.period_type.charAt(0).toUpperCase() + data.period_type.slice(1) 
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="flex items-center justify-between text-sm mb-6">
          <span className="text-muted-foreground">{t("dashboard.spendingTrend.total")}</span>
          <span className="font-semibold">{formatCurrency(toFiniteNumber(data.total), currency as any)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mb-6">
          <span className="text-muted-foreground">{t("dashboard.spendingTrend.average")}</span>
          <span className="font-semibold">{formatCurrency(toFiniteNumber(data.average), currency as any)}</span>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => getCurrencySymbol(currency as any) + value}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency((value || 0), currency as any), t("dashboard.spendingTrend.amount") || "Amount"]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {data.data_points.length > 10 && (
          <p className="text-xs text-muted-foreground mt-4">
            {t("dashboard.spendingTrend.showingLimited", { count: data.data_points.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
