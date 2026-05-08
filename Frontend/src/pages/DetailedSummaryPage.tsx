import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, ListFilter, ChevronLeft, ChevronRight } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import PageInfoButton from "@/components/help/PageInfoButton";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import {
  categoriesApi,
  expensesSummaryApi,
  groupsApi,
  queryKeys,
} from "@/api";
import type { ApiExpenseSummaryDrilldownParams } from "@/types";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";

import { useSummaryFilters } from "@/hooks/useSummaryFilters";
import { useSummaryExport } from "@/hooks/useSummaryExport";

import SummaryFilters from "@/components/summary/SummaryFilters";
import SummaryTrendChart from "@/components/summary/SummaryTrendChart";
import SummaryCategoryChart from "@/components/summary/SummaryCategoryChart";
import SummaryTransactionsTable from "@/components/summary/SummaryTransactionsTable";
import SummaryExportDialog from "@/components/summary/SummaryExportDialog";
import MobileSummarySwitcher from "@/components/summary/MobileSummarySwitcher";

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export default function DetailedSummaryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const {
    draftFilters,
    appliedFilters,
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    hasPendingFilters,
    hasInvalidDraftDateRange,
    appliedGroupId,
    handlePeriodPresetChange,
    handleScopeChange,
    handleApplyFilters,
    handleSortChange,
    setDraftCurrency,
    setDraftGroupId,
    setDraftDateFrom,
    setDraftDateTo,
    setDraftCategoryIds,
  } = useSummaryFilters();

  const {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFormat,
    pendingExportFormat,
    exportMutation,
    handleExportFormatChange,
    handleExportSubmit,
  } = useSummaryExport({
    scope: appliedFilters.scope,
    groupId: appliedGroupId,
    dateFrom: appliedFilters.dateFrom,
    dateTo: appliedFilters.dateTo,
    categoryIds: appliedFilters.categoryIds,
    currency: appliedFilters.currency,
    sortBy: appliedFilters.sortBy,
    sortOrder: appliedFilters.sortOrder,
  });

  const [showComparePrevious, setShowComparePrevious] = useState(false);
  const [mobileView, setMobileView] = useState<"charts" | "transactions">("charts");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const handleToggleComparePrevious = useCallback(() => {
    setShowComparePrevious((previous) => !previous);
  }, []);

  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage);
  }, []);

  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.listAll(),
    enabled: !!user,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: [
      "categories",
      "available",
      "summary",
      draftFilters.scope,
      draftFilters.groupId,
    ],
    queryFn: async () => {
      if (draftFilters.scope === "personal") {
        return categoriesApi.getAvailablePersonal();
      }

      if (draftFilters.scope === "group") {
        if (draftFilters.groupId === "all") {
          return categoriesApi.getAvailableAllGroups();
        }

        return categoriesApi.getAvailableGroup(Number(draftFilters.groupId));
      }

      const [personalCategories, groupCategories] = await Promise.all([
        categoriesApi.getAvailablePersonal(),
        draftFilters.groupId === "all"
          ? categoriesApi.getAvailableAllGroups()
          : categoriesApi.getAvailableGroup(Number(draftFilters.groupId)),
      ]);

      const mergedCategories = new Map<number, (typeof personalCategories)[number]>();
      for (const category of personalCategories) {
        mergedCategories.set(category.id, category);
      }
      for (const category of groupCategories) {
        mergedCategories.set(category.id, category);
      }

      return Array.from(mergedCategories.values());
    },
    enabled: !!user,
  });

  const categoryIdsKey = appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds.join(",") : "all";

  const summaryParams = useMemo(
    () => ({
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
      currency: appliedFilters.currency,
      compare_previous: true,
      top_categories_limit: 20,
      top_groups_limit: 6,
    }),
    [appliedFilters, appliedGroupId]
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: queryKeys.summaries.overview(
      appliedFilters.dateFrom,
      appliedFilters.dateTo,
      appliedFilters.scope,
      appliedGroupId ?? "all",
      appliedFilters.currency,
      true,
      categoryIdsKey
    ),
    queryFn: () => expensesSummaryApi.overview(summaryParams),
    enabled: !!user,
  });

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery({
    queryKey: queryKeys.summaries.trends(
      appliedFilters.dateFrom,
      appliedFilters.dateTo,
      appliedFilters.scope,
      appliedGroupId ?? "all",
      appliedFilters.currency,
      true,
      categoryIdsKey
    ),
    queryFn: () =>
      expensesSummaryApi.trends({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        scope: appliedFilters.scope,
        granularity: "daily" as const,
        category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
        currency: appliedFilters.currency,
        group_id: appliedGroupId,
        compare_previous: true,
      }),
    enabled: !!user,
  });

  const transactionParams = useMemo<ApiExpenseSummaryDrilldownParams>(
    () => ({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
      currency: appliedFilters.currency,
      sort_by: appliedFilters.sortBy,
      sort_order: appliedFilters.sortOrder,
    }),
    [appliedFilters, appliedGroupId, page]
  );

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery({
    queryKey: queryKeys.summaries.drilldown(
      appliedFilters.dateFrom,
      appliedFilters.dateTo,
      appliedFilters.scope,
      appliedGroupId ?? "all",
      appliedFilters.currency,
      appliedFilters.sortBy,
      appliedFilters.sortOrder,
      categoryIdsKey
    ),
    queryFn: () => expensesSummaryApi.drilldown(transactionParams),
    enabled: !!user,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    setPage(1);
  }, [appliedFilters]);

  useEffect(() => {
    if (!isMobileFiltersOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileFiltersOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileFiltersOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [setIsMobileFiltersOpen]);

  const activeGroups = useMemo(
    () => groups.filter((group) => group.status === "active"),
    [groups]
  );

  const totalLabel = (overview?.totals_by_currency ?? [])
    .map((item) => formatCurrency(Number(item.total_amount), item.currency as CurrencyEnum))
    .join(" · ");

  const cumulativeTrendData = useMemo(() => {
    if (!trends) return [];
    const series = trends.currencies.find((s) => s.currency === appliedFilters.currency);
    if (!series) return [];

    let currentCumulative = 0;
    const currentData = series.current.map((point) => {
      currentCumulative += toNumber(point.total_amount);
      return currentCumulative;
    });

    let previousCumulative = 0;
    const previousData = series.previous.slice(0, series.current.length).map((point) => {
      previousCumulative += toNumber(point.total_amount);
      return previousCumulative;
    });

    return series.current.map((point, index) => ({
      date: point.date,
      current: currentData[index],
      previous: previousData[index] ?? 0,
    }));
  }, [trends, appliedFilters.currency]);

  const PIE_CHART_LIMIT = 8;

  const categoryPieData = useMemo(() => {
    if (!overview?.top_categories?.length) return [];
    const total = overview.top_categories.reduce(
      (sum, cat) => sum + toNumber(cat.total_amount),
      0
    );

    const mapped = overview.top_categories.map((cat) => {
      const amount = toNumber(cat.total_amount);
      const name = t(`category.${cat.category_name}`, { defaultValue: cat.category_name });
      return { name, rawName: cat.category_name, value: amount };
    });

    if (mapped.length <= PIE_CHART_LIMIT) {
      return mapped.map((d) => ({
        ...d,
        percentage: total > 0 ? (d.value / total) * 100 : 0,
      }));
    }

    const top = mapped.slice(0, PIE_CHART_LIMIT);
    const rest = mapped.slice(PIE_CHART_LIMIT);
    const restValue = rest.reduce((sum, d) => sum + d.value, 0);
    const restPercentage = total > 0 ? (restValue / total) * 100 : 0;

    return [
      ...top.map((d) => ({
        ...d,
        percentage: total > 0 ? (d.value / total) * 100 : 0,
      })),
      {
        name: t("category.other", { defaultValue: "Other" }),
        rawName: "other",
        value: restValue,
        percentage: restPercentage,
      },
    ];
  }, [overview, t]);

  if (
    !user ||
    groupsLoading ||
    categoriesLoading ||
    overviewLoading ||
    trendsLoading ||
    transactionsLoading
  ) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if (groupsError || categoriesError || overviewError || trendsError || transactionsError) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {groupsError?.message ||
              categoriesError?.message ||
              overviewError?.message ||
              trendsError?.message ||
              transactionsError?.message ||
              t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold md:text-4xl">{t("summaryPage.title")}</h1>
              <PageInfoButton pageKey="summaries" autoOpen={true} />
            </div>
            <p className="mt-2 text-muted-foreground">
              {t("summaryPage.subtitle")} · {t("summaryPage.total")}: <span className="font-semibold text-primary">{totalLabel || "0.00"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setIsExportDialogOpen(true)}
              disabled={exportMutation.isPending}
              className="hidden shadow-lg md:flex"
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingExportFormat ? t("summaryPage.exporting") : t("summaryPage.export", { defaultValue: "Export" })}
            </Button>
          </div>
        </motion.div>

        <div className="hidden md:block">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-foreground">
            <ListFilter className="h-5 w-5 text-primary" />
            {t("summaryPage.filtersTitle")}
          </h2>
          <SummaryFilters
            draftFilters={draftFilters}
            categories={categories}
            activeGroups={activeGroups}
            hasPendingFilters={hasPendingFilters}
            hasInvalidDraftDateRange={hasInvalidDraftDateRange}
            onScopeChange={handleScopeChange}
            onGroupChange={setDraftGroupId}
            onCurrencyChange={setDraftCurrency}
            onPeriodPresetChange={handlePeriodPresetChange}
            onSortChange={handleSortChange}
            onDateFromChange={setDraftDateFrom}
            onDateToChange={setDraftDateTo}
            onCategoryIdsChange={setDraftCategoryIds}
            onApply={handleApplyFilters}
          />
        </div>

        <MobileSummarySwitcher view={mobileView} onViewChange={setMobileView} />

        <div className={`${mobileView === "charts" ? "block" : "hidden"} lg:block`}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <SummaryTrendChart
              data={cumulativeTrendData}
              currency={appliedFilters.currency}
              showComparePrevious={showComparePrevious}
              onToggleComparePrevious={handleToggleComparePrevious}
            />
            <SummaryCategoryChart
              data={categoryPieData}
              currency={appliedFilters.currency}
            />
          </div>
        </div>

        <div className={`${mobileView === "transactions" ? "block" : "hidden"} lg:block`}>
          <SummaryTransactionsTable
            items={transactions?.items ?? []}
            sortBy={appliedFilters.sortBy}
            sortOrder={appliedFilters.sortOrder}
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={transactions?.total_count ?? 0}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      <SummaryExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        format={exportFormat}
        onFormatChange={handleExportFormatChange}
        isPending={exportMutation.isPending}
        pendingFormat={pendingExportFormat}
        onSubmit={handleExportSubmit}
      />

      <button
        type="button"
        onClick={() => setIsExportDialogOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:hidden"
      >
        <Download className="h-6 w-6" />
      </button>

      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-[41] bg-black/35 transition-opacity duration-300 ${
            isMobileFiltersOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsMobileFiltersOpen(false)}
          aria-hidden="true"
        />

        <aside
          className="fixed left-0 top-0 z-[42] h-screen border-r border-border bg-background/95 shadow-xl backdrop-blur-sm transition-transform duration-300 ease-out"
          style={{
            width: "min(84vw, 22rem)",
            transform: isMobileFiltersOpen ? "translateX(0)" : "translateX(-100%)",
          }}
          aria-hidden={!isMobileFiltersOpen}
        >
          <button
            type="button"
            aria-label={
              isMobileFiltersOpen
                ? t("summaryPage.closeFilters", { defaultValue: "Close filters" })
                : t("summaryPage.openFilters", { defaultValue: "Open filters" })
            }
            onClick={() => setIsMobileFiltersOpen((previous) => !previous)}
            className="absolute -right-8 top-[42%] z-[43] flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm"
          >
            {isMobileFiltersOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="h-full overflow-y-auto p-4 pt-6">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              {t("summaryPage.filtersTitle")}
            </h2>
            <SummaryFilters
              draftFilters={draftFilters}
              categories={categories}
              activeGroups={activeGroups}
              hasPendingFilters={hasPendingFilters}
              hasInvalidDraftDateRange={hasInvalidDraftDateRange}
              onScopeChange={handleScopeChange}
              onGroupChange={setDraftGroupId}
              onCurrencyChange={setDraftCurrency}
              onPeriodPresetChange={handlePeriodPresetChange}
              onSortChange={handleSortChange}
              onDateFromChange={setDraftDateFrom}
              onDateToChange={setDraftDateTo}
              onCategoryIdsChange={setDraftCategoryIds}
              onApply={handleApplyFilters}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
