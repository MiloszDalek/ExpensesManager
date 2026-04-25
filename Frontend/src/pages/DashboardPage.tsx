import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dashboardApi } from "@/api/dashboardApi";
import { KPICards } from "@/components/dashboard/KPICards";
import { AttentionSection } from "@/components/dashboard/AttentionSection";
import { SpendingTrendChart } from "@/components/dashboard/SpendingTrendChart";
import { CategoryBreakdownChart } from "@/components/dashboard/CategoryBreakdownChart";
import { BudgetStatusList } from "@/components/dashboard/BudgetStatusList";
import { SettlementSnapshot } from "@/components/dashboard/SettlementSnapshot";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { getRecentCurrencies } from "@/utils/currency";
import { type CurrencyEnum } from "@/types/enums";
import PageInfoButton from "@/components/help/PageInfoButton";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Currency state management
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyEnum>("PLN");
  
  useEffect(() => {
    const recentCurrencies = getRecentCurrencies();
    if (recentCurrencies.length > 0) {
      setSelectedCurrency(recentCurrencies[0]);
    }
  }, []);

  const { data: kpi, isLoading: kpiLoading } = useQuery({
    queryKey: ['dashboard', 'kpi', selectedCurrency],
    queryFn: () => dashboardApi.getKPI({ currency: selectedCurrency }),
    enabled: !!user,
  });

  const { data: attentionItems, isLoading: attentionLoading } = useQuery({
    queryKey: ['dashboard', 'attention', selectedCurrency],
    queryFn: () => dashboardApi.getAttentionItems({ limit: 10, currency: selectedCurrency }),
    enabled: !!user,
  });

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['dashboard', 'trend', selectedCurrency],
    queryFn: () => dashboardApi.getTrend({ period: 'monthly', currency: selectedCurrency }),
    enabled: !!user,
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['dashboard', 'categories', selectedCurrency],
    queryFn: () => dashboardApi.getCategories({ currency: selectedCurrency }),
    enabled: !!user,
  });

  const { data: budgetStatus, isLoading: budgetLoading } = useQuery({
    queryKey: ['dashboard', 'budgets', selectedCurrency],
    queryFn: () => dashboardApi.getBudgets({ currency: selectedCurrency }),
    enabled: !!user,
  });

  const { data: settlementSnapshot, isLoading: settlementLoading } = useQuery({
    queryKey: ['dashboard', 'settlements', selectedCurrency],
    queryFn: () => dashboardApi.getSettlements({ currency: selectedCurrency }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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

        {/* KPI Cards */}
        <KPICards data={kpi} isLoading={kpiLoading} currency={selectedCurrency} />

        {/* Attention Section */}
        <AttentionSection items={attentionItems} isLoading={attentionLoading} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingTrendChart data={trendData} isLoading={trendLoading} currency={selectedCurrency} />
          <CategoryBreakdownChart data={categoryData} isLoading={categoryLoading} currency={selectedCurrency} />
        </div>

        {/* Budget & Settlements Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BudgetStatusList budgets={budgetStatus} isLoading={budgetLoading} currency={selectedCurrency} />
          <SettlementSnapshot snapshot={settlementSnapshot} isLoading={settlementLoading} currency={selectedCurrency} />
        </div>
      </div>
    </div>
  );
}
