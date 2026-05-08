import { memo } from "react";
import { useTranslation } from "react-i18next";
import { formatCompactCurrency, formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";
import { BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendPoint {
  date: string;
  current: number;
  previous: number;
}

interface SummaryTrendChartProps {
  data: TrendPoint[];
  currency: CurrencyEnum;
  showComparePrevious: boolean;
  onToggleComparePrevious: () => void;
}

const SummaryTrendChart = memo(function SummaryTrendChart({
  data,
  currency,
  showComparePrevious,
  onToggleComparePrevious,
}: SummaryTrendChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:col-span-3">
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-1">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {t("summaryPage.charts.trendTitle")}
          </CardTitle>
          <CardDescription>
            {t("summaryPage.charts.trendSubtitle", { defaultValue: "Total spending accumulated day by day" })}
          </CardDescription>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showComparePrevious}
            onChange={onToggleComparePrevious}
            className="rounded border-border"
          />
          {t("summaryPage.charts.comparePrevious", { defaultValue: "Compare previous period" })}
        </label>
      </CardHeader>
      <CardContent className="px-0 sm:px-6">
        {data.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
        ) : (
          <div className={`sm:h-[325px] h-[220px] w-full ${showComparePrevious ? 'h-[250px]' : ''}`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={220}>
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="15%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previousFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="15%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date: string) => format(parseISO(date), "dd.MM")}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  className="text-muted-foreground"
                  tickFormatter={(value) => formatCompactCurrency(Number(value), currency, { noDecimals: true })}/>
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const formattedDate = label ? format(parseISO(label as string), "yyyy-MM-dd") : "";
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium mb-1">{formattedDate}</p>
                        {payload.map((entry) => (
                          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {formatCurrency(Number(entry.value ?? 0), currency)}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="current"
                  name={t("summaryPage.charts.currentCumulative", { defaultValue: "Current period (cumulative)" })}
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  fill="url(#currentFill)"
                />
                {showComparePrevious && (
                  <Area
                    type="monotone"
                    dataKey="previous"
                    name={t("summaryPage.charts.previousCumulative", { defaultValue: "Previous period (cumulative)" })}
                    stroke="#eab308"
                    strokeWidth={2}
                    fill="url(#previousFill)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default SummaryTrendChart;
