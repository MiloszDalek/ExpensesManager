import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { expensesSummaryApi } from "@/api/expensesSummaryApi";
import type { CurrencyEnum } from "@/types/enums";
import { formatCurrency } from "@/utils/currency";
import { toFiniteNumber, toFixedSafe } from "@/utils/toFiniteNumber";

interface CategoryBreakdownChartProps {
  currency: CurrencyEnum;
  range: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#eab308",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#6366f1",
  "#f97316",
];

export function CategoryBreakdownChart({ currency, range }: CategoryBreakdownChartProps) {
  const { t } = useTranslation();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["expenses", "categories", range, currency],
    queryFn: () => expensesSummaryApi.categories({ range, currency }),
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
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

  if (error) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("dashboard.categoryBreakdown.title")}</CardTitle>
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

  if (!data || data.categories.length === 0) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            {t("dashboard.categoryBreakdown.title")}
          </CardTitle>
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

  const items = data.categories;

  const total = toFiniteNumber(data.total_amount);

  const chartData = items.map((item) => {
    const amount = toFiniteNumber(item.amount);
    const percentage = total > 0 ? (amount / total) * 100 : 0;
    const translatedName = t(`category.${item.category_name}`, {
      defaultValue: item.category_name,
    });
    return {
      name: translatedName,
      rawName: item.category_name,
      value: amount,
      percentage,
      currency: data.currency,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{d.name}</p>
          <p className="text-sm">{formatCurrency(d.value, d.currency)}</p>
          <p className="text-sm text-muted-foreground">{toFixedSafe(d.percentage, 1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          {t("dashboard.categoryBreakdown.title")}
        </CardTitle>
        <CardDescription>{t("dashboard.categoryBreakdown.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <span className="font-semibold">{t("dashboard.categoryBreakdown.total")}</span>
            <span className="font-bold text-lg">{formatCurrency(total, currency)}</span>
          </div>

          <div className="sm:h-[300px] h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={400}>
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy={isDesktop ? "30%" : "50%"}
                  innerRadius={50}
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
                  verticalAlign={isDesktop ? "top" : "bottom"}
                  align={isDesktop ? "right" : "center"}
                  layout={isDesktop ? "vertical" : "horizontal"}
                  wrapperStyle={isDesktop ? { paddingTop: 8 } : { paddingTop: 8 }}
                  formatter={(value: string, entry: any) => (
                    <span className="text-sm">
                      {value} ({toFixedSafe(entry.payload.percentage, 1)}%)
                    </span>
                  )}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
