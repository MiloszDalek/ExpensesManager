import { memo } from "react";
import { useTranslation } from "react-i18next";
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
  currency: string;
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
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
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
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
        ) : (
          <div className="min-h-[320px] h-80">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={280}>
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="previousFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date: string) => format(parseISO(date), "dd.MM")}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const formattedDate = label ? format(parseISO(label as string), "yyyy-MM-dd") : "";
                    return (
                      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-medium mb-1">{formattedDate}</p>
                        {payload.map((entry) => (
                          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {Number(entry.value ?? 0).toFixed(2)} {currency}
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
