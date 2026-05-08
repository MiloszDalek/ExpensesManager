import { memo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PieChart as PieChartIcon } from "lucide-react";
import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";

interface CategoryPieDatum {
  name: string;
  rawName: string;
  value: number;
  percentage: number;
}

interface SummaryCategoryChartProps {
  data: CategoryPieDatum[];
  currency: string;
}

const COLORS = [
  "#3b82f6", "#10b981", "#eab308", "#ef4444", "#a855f7",
  "#ec4899", "#6366f1", "#f97316", "#14b8a6", "#8b5cf6",
];

const SummaryCategoryChart = memo(function SummaryCategoryChart({
  data,
  currency,
}: SummaryCategoryChartProps) {
  const { t } = useTranslation();

  const tooltipContent = useCallback(({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as CategoryPieDatum;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{d.name}</p>
          <p className="text-sm">{formatCurrency(Number(d.value), currency as CurrencyEnum)}</p>
          <p className="text-sm text-muted-foreground">{d.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  }, [currency]);

  const legendFormatter = useCallback((value: string, entry: any) => {
    return (
      <span className="text-sm">
        {value} ({entry.payload.percentage.toFixed(1)}%)
      </span>
    );
  }, []);

  return (
    <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-primary" />
          {t("summaryPage.charts.categoryTitle", { defaultValue: "Category breakdown" })}
        </CardTitle>
        <CardDescription>
          {t("summaryPage.charts.categorySubtitle", { defaultValue: "Distribution by category" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
        ) : (
          <div className="min-h-[320px] h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={280}>
              <RechartsPieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={tooltipContent} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  layout="horizontal"
                  formatter={legendFormatter}
                  wrapperStyle={{ paddingTop: 8 }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default SummaryCategoryChart;
