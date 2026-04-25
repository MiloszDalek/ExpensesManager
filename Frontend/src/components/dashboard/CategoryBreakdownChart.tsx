import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { CategoryBreakdown } from "@/types/dashboard";
import { formatCurrency } from "@/utils/currency";
import { toFixedSafe } from "@/utils/toFiniteNumber";

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown | undefined;
  isLoading?: boolean;
  currency?: string;
}

// Color palette for Recharts
const COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // green-500
  "#eab308", // yellow-500
  "#ef4444", // red-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#f97316", // orange-500
];

export function CategoryBreakdownChart({ data, isLoading, currency = "USD" }: CategoryBreakdownChartProps) {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.categoryBreakdown.title")}</CardTitle>
          <CardDescription>{t("dashboard.categoryBreakdown.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (data.items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.categoryBreakdown.title")}</CardTitle>
          <CardDescription>{t("dashboard.categoryBreakdown.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PieChart className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.categoryBreakdown.noData")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for Recharts
  const chartData = data.items.map((item) => ({
    name: item.category_name,
    value: item.amount,
    percentage: item.percentage,
    budget: item.budget_allocated,
    remaining: item.budget_remaining,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{formatCurrency(data.value, currency as any)}</p>
          <p className="text-sm text-muted-foreground">{toFixedSafe(data.percentage, 1)}%</p>
          {data.budget !== null && (
            <p className="text-xs text-muted-foreground">
              {t("dashboard.categoryBreakdown.budget")}: {formatCurrency(data.budget, currency as any)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.categoryBreakdown.title")}</CardTitle>
        <CardDescription>{t("dashboard.categoryBreakdown.topCategories")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total */}
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="font-semibold">{t("dashboard.categoryBreakdown.total")}</span>
            <span className="font-bold text-lg">{formatCurrency(data.total, currency as any)}</span>
          </div>

          {/* Recharts Pie Chart */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  formatter={(value: string, entry: any) => (
                    <span className="text-sm">
                      {value} ({toFixedSafe(entry.payload.percentage, 1)}%)
                    </span>
                  )}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Budget information for categories with budgets */}
          <div className="space-y-2">
            {data.items.filter(item => item.budget_allocated !== null).map((item) => (
              <div key={item.category_id} className="flex items-center justify-between text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <span>{item.category_name}</span>
                <div className="flex items-center gap-3">
                  <span>{t("dashboard.categoryBreakdown.budget")}: {formatCurrency(item.budget_allocated!, currency as any)}</span>
                  {item.budget_remaining !== null && (
                    <span className={item.budget_remaining < 0 ? "text-destructive" : "text-green-600"}>
                      {t("dashboard.categoryBreakdown.remaining")}: {formatCurrency(item.budget_remaining, currency as any)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
