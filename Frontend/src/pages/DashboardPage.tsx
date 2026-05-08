import { useTranslation } from "react-i18next";
import { SpendingTrendChart } from "@/components/dashboard/SpendingTrendChart";
import { CategoryBreakdownChart } from "@/components/dashboard/CategoryBreakdownChart";
import { UpcomingRecurringExpenses } from "@/components/dashboard/UpcomingRecurringExpenses";
import { SettlementsSummary } from "@/components/dashboard/SettlementsSummary";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { getRecentCurrencies } from "@/utils/currency";
import { type CurrencyEnum } from "@/types/enums";
import PageInfoButton from "@/components/help/PageInfoButton";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyEnum>(() => {
    const recentCurrencies = getRecentCurrencies();
    return recentCurrencies.length > 0 ? recentCurrencies[0] : "PLN";
  });

  const [range, setRange] = useState("current_month");

  if (!user) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t("dashboard.title", { 
                defaultValue: "Dashboard",
                username: user.username?.split(" ")[0] || "there" 
              })}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t("dashboard.subtitle", { defaultValue: "Your financial overview at a glance" })}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CurrencyPicker
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
              className="w-40"
            />
            <PageInfoButton pageKey="dashboard" autoOpen={true} />
          </div>
        </div>

        {/* Top Row: Trend + Category */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <SpendingTrendChart currency={selectedCurrency} range={range} onRangeChange={setRange} />
          <CategoryBreakdownChart currency={selectedCurrency} range={range} />
        </div>

        {/* Bottom Row: Upcoming Recurring + Settlements Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UpcomingRecurringExpenses currency={selectedCurrency} />
          <SettlementsSummary currency={selectedCurrency} />
        </div>
      </div>
    </div>
  );
}
