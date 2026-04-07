import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FilterX,
  Layers,
  ListFilter,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  categoriesApi,
  expensesSummaryApi,
  groupsApi,
  queryKeys,
} from "@/api";
import {
  type PersonalExpensePeriodPreset,
  type ExpenseSummaryScope,
  type ApiExpenseSummaryDrilldownParams,
} from "@/types";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";

type SummaryFiltersState = {
  scope: ExpenseSummaryScope;
  groupId: string;
  categoryId: string;
  currency: CurrencyEnum | "all";
  periodPreset: PersonalExpensePeriodPreset;
  dateFrom: string;
  dateTo: string;
};

type ExportFormat = "csv" | "xlsx" | "pdf";

const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

const getPeriodRange = (preset: Exclude<PersonalExpensePeriodPreset, "custom">) => {
  const now = new Date();

  if (preset === "previous_month") {
    const previousMonth = subMonths(now, 1);
    const start = startOfMonth(previousMonth);
    const end = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    return {
      dateFrom: toDateInput(start),
      dateTo: toDateInput(end),
    };
  }

  return {
    dateFrom: toDateInput(startOfMonth(now)),
    dateTo: toDateInput(now),
  };
};

const getInitialFilters = (): SummaryFiltersState => {
  const thisMonthRange = getPeriodRange("this_month");

  return {
    scope: "all",
    groupId: "all",
    categoryId: "all",
    currency: "all",
    periodPreset: "this_month",
    dateFrom: thisMonthRange.dateFrom,
    dateTo: thisMonthRange.dateTo,
  };
};

const areFiltersEqual = (first: SummaryFiltersState, second: SummaryFiltersState) => {
  return (
    first.scope === second.scope &&
    first.groupId === second.groupId &&
    first.categoryId === second.categoryId &&
    first.currency === second.currency &&
    first.periodPreset === second.periodPreset &&
    first.dateFrom === second.dateFrom &&
    first.dateTo === second.dateTo
  );
};

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const formatAmount = (value: number | string | null | undefined) => toNumber(value).toFixed(2);

export default function DetailedSummaryPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [draftFilters, setDraftFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [trendCurrency, setTrendCurrency] = useState<CurrencyEnum | null>(null);
  const [drilldownDate, setDrilldownDate] = useState<string | null>(null);
  const [drilldownCategoryId, setDrilldownCategoryId] = useState<number | null>(null);
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);

  const appliedGroupId = appliedFilters.groupId === "all" ? undefined : Number(appliedFilters.groupId);

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

  const summaryParams = useMemo(
    () => ({
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
      compare_previous: true,
      top_categories_limit: 6,
      top_groups_limit: 6,
    }),
    [appliedFilters, appliedGroupId]
  );

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: queryKeys.summaries.overview(summaryParams),
    queryFn: () => expensesSummaryApi.overview(summaryParams),
    enabled: !!user,
  });

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery({
    queryKey: queryKeys.summaries.trends(summaryParams),
    queryFn: () => expensesSummaryApi.trends(summaryParams),
    enabled: !!user,
  });

  const drilldownParams = useMemo<ApiExpenseSummaryDrilldownParams>(
    () => ({
      limit: 100,
      offset: 0,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      date_from: drilldownDate ?? appliedFilters.dateFrom,
      date_to: drilldownDate ?? appliedFilters.dateTo,
      category_id:
        drilldownCategoryId ??
        (appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId)),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
      sort_by: "expense_date",
      sort_order: "desc",
    }),
    [appliedFilters, appliedGroupId, drilldownCategoryId, drilldownDate]
  );

  const {
    data: drilldown,
    isLoading: drilldownLoading,
    error: drilldownError,
  } = useQuery({
    queryKey: queryKeys.summaries.drilldown(drilldownParams),
    queryFn: () => expensesSummaryApi.drilldown(drilldownParams),
    enabled: !!user,
  });

  const exportMutation = useMutation({
    mutationFn: (format: ExportFormat) => {
      const baseParams = {
        scope: appliedFilters.scope,
        group_id: appliedGroupId,
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
        currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
        sort_by: "expense_date",
        sort_order: "desc",
      } as const;
      const activeLocale = i18n.resolvedLanguage || i18n.language || "en";

      if (format === "xlsx") {
        return expensesSummaryApi.exportXlsx(baseParams, activeLocale);
      }

      if (format === "pdf") {
        return expensesSummaryApi.exportPdf(baseParams, activeLocale);
      }

      return expensesSummaryApi.exportCsv(baseParams);
    },
    onMutate: (format: ExportFormat) => {
      setPendingExportFormat(format);
    },
    onSuccess: ({ blob, filename }) => {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    },
    onSettled: () => {
      setPendingExportFormat(null);
    },
  });

  const handlePeriodPresetChange = (preset: PersonalExpensePeriodPreset) => {
    if (preset === "custom") {
      setDraftFilters((previous) => ({ ...previous, periodPreset: preset }));
      return;
    }

    const range = getPeriodRange(preset);
    setDraftFilters((previous) => ({
      ...previous,
      periodPreset: preset,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
  };

  const handleScopeChange = (scope: ExpenseSummaryScope) => {
    setDraftFilters((previous) => {
      if (scope === "personal") {
        return {
          ...previous,
          scope,
          groupId: "all",
          categoryId: "all",
        };
      }

      return {
        ...previous,
        scope,
        categoryId: "all",
      };
    });
  };

  const hasPendingFilters = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );

  const hasInvalidDraftDateRange =
    draftFilters.periodPreset === "custom" &&
    !!draftFilters.dateFrom &&
    !!draftFilters.dateTo &&
    draftFilters.dateFrom > draftFilters.dateTo;

  const activeGroups = useMemo(
    () => groups.filter((group) => group.status === "active"),
    [groups]
  );

  const availableTrendCurrencies = useMemo(
    () => trends?.currencies.map((currencySeries) => currencySeries.currency) ?? [],
    [trends]
  );

  const activeTrendCurrency =
    trendCurrency && availableTrendCurrencies.includes(trendCurrency)
      ? trendCurrency
      : availableTrendCurrencies[0] || null;

  const activeTrendSeries = useMemo(
    () => trends?.currencies.find((series) => series.currency === activeTrendCurrency) ?? null,
    [activeTrendCurrency, trends]
  );

  const trendChartData = useMemo(() => {
    if (!activeTrendSeries) {
      return [];
    }

    return activeTrendSeries.current.map((point, index) => {
      const previousPoint = activeTrendSeries.previous[index];
      const parsedDate = parseISO(point.date);

      return {
        label: format(parsedDate, "dd MMM"),
        rawDate: point.date,
        personal: toNumber(point.personal_amount),
        group: toNumber(point.group_amount),
        total: toNumber(point.total_amount),
        previousTotal: toNumber(previousPoint?.total_amount ?? 0),
      };
    });
  }, [activeTrendSeries]);

  const ownVsGroupChartData = useMemo(
    () =>
      (overview?.own_vs_group ?? []).map((item) => ({
        currency: item.currency,
        personal: toNumber(item.personal_amount),
        group: toNumber(item.group_amount),
      })),
    [overview]
  );

  const topCategoriesData = useMemo(
    () =>
      (overview?.top_categories ?? []).map((category) => ({
        categoryId: category.category_id,
        categoryName: category.category_name,
        amount: toNumber(category.total_amount),
      })),
    [overview]
  );

  const topGroupsData = useMemo(
    () =>
      (overview?.top_groups ?? []).map((group) => ({
        groupId: group.group_id,
        groupName: group.group_name,
        amount: toNumber(group.total_amount),
      })),
    [overview]
  );

  const activeComparison = useMemo(() => {
    if (!overview?.comparison_by_currency?.length) {
      return null;
    }

    if (activeTrendCurrency) {
      return overview.comparison_by_currency.find((item) => item.currency === activeTrendCurrency) ?? null;
    }

    return overview.comparison_by_currency[0] ?? null;
  }, [activeTrendCurrency, overview]);

  const totalLabel = (overview?.totals_by_currency ?? [])
    .map((item) => `${formatAmount(item.total_amount)} ${item.currency}`)
    .join(" · ");

  const handleApplyFilters = () => {
    if (hasInvalidDraftDateRange) {
      return;
    }

    setAppliedFilters(draftFilters);
    setDrilldownDate(null);
    setDrilldownCategoryId(null);
  };

  const clearDrilldown = () => {
    setDrilldownDate(null);
    setDrilldownCategoryId(null);
  };

  if (!user || groupsLoading || categoriesLoading || overviewLoading || trendsLoading || drilldownLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (groupsError || categoriesError || overviewError || trendsError || drilldownError) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {groupsError?.message ||
              categoriesError?.message ||
              overviewError?.message ||
              trendsError?.message ||
              drilldownError?.message ||
              t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{t("summaryPage.title")}</h1>
            <p className="mt-2 text-muted-foreground">
              {t("summaryPage.subtitle")} · {t("summaryPage.total")}: <span className="font-semibold text-primary">{totalLabel || "0.00"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => exportMutation.mutate("csv")}
              disabled={exportMutation.isPending}
              className="shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingExportFormat === "csv" ? t("summaryPage.exporting") : t("summaryPage.exportCsv")}
            </Button>

            <Button
              onClick={() => exportMutation.mutate("xlsx")}
              disabled={exportMutation.isPending}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingExportFormat === "xlsx" ? t("summaryPage.exporting") : t("summaryPage.exportXlsx")}
            </Button>

            <Button
              onClick={() => exportMutation.mutate("pdf")}
              disabled={exportMutation.isPending}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingExportFormat === "pdf" ? t("summaryPage.exporting") : t("summaryPage.exportPdf")}
            </Button>
          </div>
        </motion.div>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-primary" />
              {t("summaryPage.filtersTitle")}
            </CardTitle>
            <CardDescription>{t("summaryPage.filtersSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <Label>{t("summaryPage.scope")}</Label>
                <Select value={draftFilters.scope} onValueChange={(value) => handleScopeChange(value as ExpenseSummaryScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("summaryPage.scopeAll")}</SelectItem>
                    <SelectItem value="personal">{t("summaryPage.scopePersonal")}</SelectItem>
                    <SelectItem value="group">{t("summaryPage.scopeGroup")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("summaryPage.group")}</Label>
                <Select
                  value={draftFilters.groupId}
                  onValueChange={(value) => setDraftFilters((previous) => ({ ...previous, groupId: value, categoryId: "all" }))}
                  disabled={draftFilters.scope === "personal"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("summaryPage.groupAll")}</SelectItem>
                    {activeGroups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("summaryPage.category")}</Label>
                <Select
                  value={draftFilters.categoryId}
                  onValueChange={(value) => setDraftFilters((previous) => ({ ...previous, categoryId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("summaryPage.categoryAll")}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("expenseFilters.currency")}</Label>
                <Select
                  value={draftFilters.currency}
                  onValueChange={(value) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      currency: value as SummaryFiltersState["currency"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("expenseFilters.allCurrencies")}</SelectItem>
                    {SUPPORTED_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>{t("expenseFilters.period")}</Label>
                <Select value={draftFilters.periodPreset} onValueChange={(value) => handlePeriodPresetChange(value as PersonalExpensePeriodPreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">{t("expenseFilters.thisMonth")}</SelectItem>
                    <SelectItem value="previous_month">{t("expenseFilters.previousMonth")}</SelectItem>
                    <SelectItem value="custom">{t("expenseFilters.customRange")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draftFilters.periodPreset === "custom" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="summary-date-from">{t("expenseFilters.from")}</Label>
                  <Input
                    id="summary-date-from"
                    type="date"
                    value={draftFilters.dateFrom}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        periodPreset: "custom",
                        dateFrom: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="summary-date-to">{t("expenseFilters.to")}</Label>
                  <Input
                    id="summary-date-to"
                    type="date"
                    value={draftFilters.dateTo}
                    onChange={(event) =>
                      setDraftFilters((previous) => ({
                        ...previous,
                        periodPreset: "custom",
                        dateTo: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {t("summaryPage.filtersHint")}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearDrilldown} disabled={!drilldownDate && !drilldownCategoryId}>
                  <FilterX className="mr-2 h-4 w-4" />
                  {t("summaryPage.clearDrilldown")}
                </Button>
                <Button onClick={handleApplyFilters} disabled={!hasPendingFilters || hasInvalidDraftDateRange}>
                  {t("expenseFilters.apply")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.totalCount")}</CardDescription>
              <CardTitle className="text-3xl">{overview?.total_count ?? 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.topCategory")}</CardDescription>
              <CardTitle>{overview?.top_categories?.[0]?.category_name ?? t("summaryPage.noData")}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.activeCurrency")}</CardDescription>
              <CardTitle>{activeTrendCurrency ?? t("summaryPage.noData")}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.periodComparison")}</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {activeComparison ? `${formatAmount(activeComparison.delta_amount)} ${activeComparison.currency}` : t("summaryPage.noData")}
                {activeComparison?.delta_amount ? (
                  activeComparison.delta_amount.toString().startsWith("-") ? (
                    <ArrowDownRight className="h-5 w-5 text-rose-500" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                  )
                ) : null}
              </CardTitle>
              <CardDescription>
                {activeComparison && activeComparison.delta_percent !== null
                  ? `${activeComparison.delta_percent.toFixed(2)}%`
                  : t("summaryPage.notAvailable")}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t("summaryPage.charts.trendTitle")}
                </CardTitle>
                <CardDescription>{t("summaryPage.charts.trendSubtitle")}</CardDescription>
              </div>
              <Select
                value={activeTrendCurrency || undefined}
                onValueChange={(value) => setTrendCurrency(value as CurrencyEnum)}
                disabled={!availableTrendCurrencies.length}
              >
                <SelectTrigger className="w-28">
                  <SelectValue placeholder={t("summaryPage.currency")} />
                </SelectTrigger>
                <SelectContent>
                  {availableTrendCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {trendChartData.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendChartData}
                      onClick={(state: any) => {
                        const clicked = state?.activePayload?.[0]?.payload;
                        if (clicked?.rawDate) {
                          setDrilldownDate(clicked.rawDate as string);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" name={t("summaryPage.charts.total")} stroke="#0f766e" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="personal" name={t("summaryPage.charts.personal")} stroke="#2563eb" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="group" name={t("summaryPage.charts.group")} stroke="#ea580c" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="previousTotal" name={t("summaryPage.charts.previous")} stroke="#6b7280" strokeDasharray="6 4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {t("summaryPage.charts.ownVsGroupTitle")}
              </CardTitle>
              <CardDescription>{t("summaryPage.charts.ownVsGroupSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {ownVsGroupChartData.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ownVsGroupChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="currency" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="personal" stackId="a" name={t("summaryPage.charts.personal")} fill="#2563eb" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="group" stackId="a" name={t("summaryPage.charts.group")} fill="#ea580c" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("summaryPage.charts.topCategoriesTitle")}</CardTitle>
              <CardDescription>{t("summaryPage.charts.topCategoriesSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {topCategoriesData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topCategoriesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="amount" name={t("summaryPage.amount")} fill="#0f766e" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {topCategoriesData.map((category) => (
                      <Button
                        key={category.categoryId}
                        variant={drilldownCategoryId === category.categoryId ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDrilldownCategoryId(category.categoryId)}
                      >
                        {category.categoryName}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("summaryPage.charts.topGroupsTitle")}
              </CardTitle>
              <CardDescription>{t("summaryPage.charts.topGroupsSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              {topGroupsData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topGroupsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="groupName" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" name={t("summaryPage.amount")} fill="#7c3aed" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t("summaryPage.drilldownTitle")}</CardTitle>
            <CardDescription>{t("summaryPage.drilldownSubtitle")}</CardDescription>
            <div className="flex flex-wrap gap-2">
              {drilldownDate ? (
                <Badge variant="secondary">
                  {t("summaryPage.activeDay")}: {drilldownDate}
                </Badge>
              ) : null}
              {drilldownCategoryId ? (
                <Badge variant="secondary">
                  {t("summaryPage.activeCategory")}: {topCategoriesData.find((item) => item.categoryId === drilldownCategoryId)?.categoryName || drilldownCategoryId}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {drilldown?.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.date")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.title")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.scope")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.category")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.group")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drilldown.items.map((item) => (
                      <tr key={`${item.scope}-${item.expense_id}`} className="border-b/60">
                        <td className="px-2 py-2">{format(parseISO(item.expense_date), "yyyy-MM-dd")}</td>
                        <td className="px-2 py-2 font-medium">{item.title}</td>
                        <td className="px-2 py-2">
                          <Badge variant={item.scope === "personal" ? "outline" : "secondary"}>
                            {item.scope === "personal" ? t("summaryPage.scopePersonal") : t("summaryPage.scopeGroup")}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">{item.category_name}</td>
                        <td className="px-2 py-2">{item.group_name || "-"}</td>
                        <td className="px-2 py-2 font-semibold">
                          {formatAmount(item.user_amount)} {item.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
