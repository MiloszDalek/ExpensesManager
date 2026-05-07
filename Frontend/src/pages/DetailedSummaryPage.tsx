import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageInfoButton from "@/components/help/PageInfoButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DatePicker from "@/components/ui/date-picker";
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
import { SUPPORTED_CURRENCIES, type CurrencyEnum, type CategorySection } from "@/types/enums";
import { resolveCategoryGroup } from "@/utils/category";

type SummaryFiltersState = {
  scope: ExpenseSummaryScope;
  groupId: string;
  categoryIds: number[];
  categorySections: CategorySection[];
  currency: CurrencyEnum;
  periodPreset: PersonalExpensePeriodPreset;
  dateFrom: string;
  dateTo: string;
  sortBy: "expense_date" | "amount";
  sortOrder: "asc" | "desc";
};

type ExportFormat = "csv" | "xlsx" | "pdf";

type ExportContent = "charts" | "transactions" | "charts_transactions";

const EXPORT_CONTENT_OPTIONS = [
  { id: "charts" as const, labelKey: "summaryPage.exportContentCharts", defaultLabel: "Charts only" },
  { id: "transactions" as const, labelKey: "summaryPage.exportContentTransactions", defaultLabel: "Transactions only" },
  { id: "charts_transactions" as const, labelKey: "summaryPage.exportContentBoth", defaultLabel: "Charts + Transactions" },
];

const getExportSections = (format: ExportFormat, content: ExportContent): string[] => {
  if (format === "pdf") {
    return ["category_summary"];
  }
  switch (content) {
    case "charts": return ["category_summary"];
    case "transactions": return ["transactions"];
    case "charts_transactions": return ["transactions", "category_summary"];
    default: return ["category_summary"];
  }
};

type ExportMutationVariables = {
  format: ExportFormat;
};

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
    categoryIds: [],
    categorySections: [],
    currency: "PLN",
    periodPreset: "this_month",
    dateFrom: thisMonthRange.dateFrom,
    dateTo: thisMonthRange.dateTo,
    sortBy: "expense_date",
    sortOrder: "desc",
  };
};

const arraysEqual = <T,>(a: T[], b: T[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const areFiltersEqual = (first: SummaryFiltersState, second: SummaryFiltersState) => {
  return (
    first.scope === second.scope &&
    first.groupId === second.groupId &&
    arraysEqual(first.categoryIds, second.categoryIds) &&
    arraysEqual(first.categorySections, second.categorySections) &&
    first.currency === second.currency &&
    first.periodPreset === second.periodPreset &&
    first.dateFrom === second.dateFrom &&
    first.dateTo === second.dateTo &&
    first.sortBy === second.sortBy &&
    first.sortOrder === second.sortOrder
  );
};

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

const formatAmount = (value: number | string | null | undefined) => toNumber(value).toFixed(2);

export default function DetailedSummaryPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [draftFilters, setDraftFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [showComparePrevious, setShowComparePrevious] = useState(false);
  const [mobileView, setMobileView] = useState<"charts" | "transactions">("charts");
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportContent, setExportContent] = useState<ExportContent>("charts_transactions");
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
    queryKey: queryKeys.summaries.overview(summaryParams),
    queryFn: () => expensesSummaryApi.overview(summaryParams),
    enabled: !!user,
  });

  const {
    data: trends,
    isLoading: trendsLoading,
    error: trendsError,
  } = useQuery({
    queryKey: queryKeys.summaries.trends({
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      scope: appliedFilters.scope,
      granularity: "daily" as const,
      category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
      currency: appliedFilters.currency,
      group_id: appliedGroupId,
      compare_previous: true,
    }),
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
      limit: 100,
      offset: 0,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
      currency: appliedFilters.currency,
      sort_by: appliedFilters.sortBy,
      sort_order: appliedFilters.sortOrder,
    }),
    [appliedFilters, appliedGroupId]
  );

  const {
    data: transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useQuery({
    queryKey: queryKeys.summaries.drilldown(transactionParams),
    queryFn: () => expensesSummaryApi.drilldown(transactionParams),
    enabled: !!user,
  });

  const exportMutation = useMutation<{ blob: Blob; filename: string }, Error, ExportMutationVariables>({
    mutationFn: ({ format }) => {
      const sections = getExportSections(format, exportContent);
      const baseParams: ApiExpenseSummaryDrilldownParams & { sections?: string } = {
        scope: appliedFilters.scope,
        group_id: appliedGroupId,
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        category_ids: appliedFilters.categoryIds.length > 0 ? appliedFilters.categoryIds : undefined,
        currency: appliedFilters.currency,
        sort_by: appliedFilters.sortBy,
        sort_order: appliedFilters.sortOrder,
        sections: sections.join(","),
      };
      const activeLocale = i18n.resolvedLanguage || i18n.language || "en";

      if (format === "xlsx") {
        return expensesSummaryApi.exportXlsx(baseParams, activeLocale);
      }

      if (format === "pdf") {
        return expensesSummaryApi.exportPdf(baseParams, activeLocale);
      }

      return expensesSummaryApi.exportCsv(baseParams);
    },
    onMutate: ({ format }) => {
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
  }, []);

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
          categoryIds: [],
          categorySections: [],
        };
      }

      return {
        ...previous,
        scope,
        categoryIds: [],
        categorySections: [],
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

  const totalLabel = (overview?.totals_by_currency ?? [])
    .map((item) => `${formatAmount(item.total_amount)} ${item.currency}`)
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

    return currentData.map((current, index) => ({
      day: index + 1,
      current,
      previous: previousData[index] ?? 0,
    }));
  }, [trends, appliedFilters.currency]);

  const COLORS = [
    "#3b82f6", "#10b981", "#eab308", "#ef4444", "#a855f7",
    "#ec4899", "#6366f1", "#f97316", "#14b8a6", "#8b5cf6",
  ];

  const categoryPieData = useMemo(() => {
    if (!overview?.top_categories?.length) return [];
    const total = overview.top_categories.reduce(
      (sum, cat) => sum + toNumber(cat.total_amount),
      0
    );
    return overview.top_categories.map((cat) => {
      const amount = toNumber(cat.total_amount);
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      const name = t(`category.${cat.category_name}`, { defaultValue: cat.category_name });
      return { name, rawName: cat.category_name, value: amount, percentage };
    });
  }, [overview, t]);

  const handleApplyFilters = () => {
    if (hasInvalidDraftDateRange) {
      return;
    }

    setAppliedFilters(draftFilters);
    setIsMobileFiltersOpen(false);
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-") as [
      SummaryFiltersState["sortBy"],
      SummaryFiltersState["sortOrder"],
    ];
    setDraftFilters((previous) => ({ ...previous, sortBy, sortOrder }));
  };

  const categoriesBySection = useMemo(() => {
    const map = new Map<CategorySection, typeof categories>();
    for (const cat of categories) {
      const section = cat.section ?? resolveCategoryGroup(cat);
      if (!map.has(section)) {
        map.set(section, []);
      }
      map.get(section)!.push(cat);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [categories]);

  const allCategoryIdsInSection = (section: CategorySection) => {
    const sectionCats = categoriesBySection.find(([s]) => s === section)?.[1] ?? [];
    return sectionCats.map((c) => c.id);
  };

  const toggleSection = (section: CategorySection) => {
    const sectionIds = allCategoryIdsInSection(section);
    setDraftFilters((previous) => {
      const isSelected = previous.categorySections.includes(section);
      if (isSelected) {
        return {
          ...previous,
          categoryIds: previous.categoryIds.filter((id) => !sectionIds.includes(id)),
          categorySections: previous.categorySections.filter((s) => s !== section),
        };
      }
      return {
        ...previous,
        categoryIds: Array.from(new Set([...previous.categoryIds, ...sectionIds])),
        categorySections: [...previous.categorySections, section],
      };
    });
  };

  const toggleCategory = (categoryId: number, section: CategorySection) => {
    setDraftFilters((previous) => {
      const sectionIds = allCategoryIdsInSection(section);
      const hasCategory = previous.categoryIds.includes(categoryId);
      const nextIds = hasCategory
        ? previous.categoryIds.filter((id) => id !== categoryId)
        : [...previous.categoryIds, categoryId];
      const allSectionSelected = sectionIds.every((id) => nextIds.includes(id));
      const nextSections = allSectionSelected
        ? Array.from(new Set([...previous.categorySections, section]))
        : previous.categorySections.filter((s) => s !== section);
      return { ...previous, categoryIds: nextIds, categorySections: nextSections };
    });
  };

  const handleExportFormatChange = (nextFormat: ExportFormat) => {
    setExportFormat(nextFormat);
  };

  const handleExportSubmit = () => {
    exportMutation.mutate({ format: exportFormat });
    setIsExportDialogOpen(false);
  };


  const renderFiltersContent = () => (
    <div className="rounded-xl border border-border bg-card/80 p-4 text-card-foreground backdrop-blur-sm space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <Label>{t("summaryPage.scope")}</Label>
          <Select value={draftFilters.scope} onValueChange={(value) => handleScopeChange(value as ExpenseSummaryScope)}>
            <SelectTrigger className="w-full">
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
            onValueChange={(value) =>
              setDraftFilters((previous) => ({
                ...previous,
                groupId: value,
                categoryIds: [],
                categorySections: [],
              }))
            }
            disabled={draftFilters.scope === "personal"}
          >
            <SelectTrigger className="w-full">
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
          <Label>{t("expenseFilters.currency")}</Label>
          <Select
            value={draftFilters.currency}
            onValueChange={(value) =>
              setDraftFilters((previous) => ({
                ...previous,
                currency: value as CurrencyEnum,
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">{t("expenseFilters.thisMonth")}</SelectItem>
              <SelectItem value="previous_month">{t("expenseFilters.previousMonth")}</SelectItem>
              <SelectItem value="custom">{t("expenseFilters.customRange")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("summaryPage.sorting", { defaultValue: "Sorting" })}</Label>
          <Select
            value={`${draftFilters.sortBy}-${draftFilters.sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense_date-desc">{t("summaryPage.sortNewest", { defaultValue: "Newest" })}</SelectItem>
              <SelectItem value="expense_date-asc">{t("summaryPage.sortOldest", { defaultValue: "Oldest" })}</SelectItem>
              <SelectItem value="amount-desc">{t("summaryPage.sortHighest", { defaultValue: "Highest amount" })}</SelectItem>
              <SelectItem value="amount-asc">{t("summaryPage.sortLowest", { defaultValue: "Lowest amount" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {draftFilters.periodPreset === "custom" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="summary-date-from">{t("expenseFilters.from")}</Label>
            <DatePicker
              id="summary-date-from"
              value={draftFilters.dateFrom}
              onChange={(value) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  periodPreset: "custom",
                  dateFrom: value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="summary-date-to">{t("expenseFilters.to")}</Label>
            <DatePicker
              id="summary-date-to"
              value={draftFilters.dateTo}
              onChange={(value) =>
                setDraftFilters((previous) => ({
                  ...previous,
                  periodPreset: "custom",
                  dateTo: value,
                }))
              }
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>{t("summaryPage.categories", { defaultValue: "Categories" })}</Label>
        <div className="flex flex-wrap gap-1.5">
          {categoriesBySection.map(([section]) => (
            <Button
              key={section}
              type="button"
              variant={draftFilters.categorySections.includes(section) ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => toggleSection(section)}
            >
              {t(`categoryGroups.${section}`)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
          {categoriesBySection.map(([section, sectionCats]) =>
            sectionCats.map((cat) => {
              const selected = draftFilters.categoryIds.includes(cat.id);
              return (
                <Button
                  key={cat.id}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => toggleCategory(cat.id, section)}
                >
                  {cat.name}
                </Button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {t("summaryPage.filtersHint")}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleApplyFilters} disabled={!hasPendingFilters || hasInvalidDraftDateRange}>
            {t("expenseFilters.apply")}
          </Button>
        </div>
      </div>
    </div>
  );

  if (
    !user ||
    groupsLoading ||
    categoriesLoading ||
    overviewLoading ||
    trendsLoading ||
    transactionsLoading
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
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
    <div className="min-h-screen p-4 md:p-8">
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
              className="shadow-lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {pendingExportFormat ? t("summaryPage.exporting") : t("summaryPage.export", { defaultValue: "Export" })}
            </Button>

            <Button
              onClick={() => setIsMobileFiltersOpen((previous) => !previous)}
              variant="outline"
              className="md:hidden"
            >
              <ListFilter className="mr-2 h-4 w-4" />
              {t("summaryPage.filtersTitle")}
            </Button>
          </div>
        </motion.div>

        <div className="hidden md:block">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-foreground">
            <ListFilter className="h-5 w-5 text-primary" />
            {t("summaryPage.filtersTitle")}
          </h2>
          {renderFiltersContent()}
        </div>

        <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileView("charts")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mobileView === "charts"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("summaryPage.mobile.charts", { defaultValue: "Charts" })}
          </button>
          <button
            type="button"
            onClick={() => setMobileView("transactions")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              mobileView === "transactions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("summaryPage.mobile.transactions", { defaultValue: "Transactions" })}
          </button>
        </div>

        <div className={`${mobileView === "charts" ? "block" : "hidden"} lg:block`}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  {t("summaryPage.charts.trendTitle")}
                </CardTitle>
                <CardDescription>
                  {t("summaryPage.charts.trendSubtitle", { defaultValue: "Cumulative spending trend" })}
                </CardDescription>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showComparePrevious}
                  onChange={(e) => setShowComparePrevious(e.target.checked)}
                  className="rounded border-border"
                />
                {t("summaryPage.charts.comparePrevious", { defaultValue: "Compare previous period" })}
              </label>
            </CardHeader>
            <CardContent>
              {cumulativeTrendData.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cumulativeTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="current"
                        name={t("summaryPage.charts.currentPeriod", { defaultValue: "Current" })}
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        fill="url(#currentFill)"
                      />
                      {showComparePrevious && (
                        <Area
                          type="monotone"
                          dataKey="previous"
                          name={t("summaryPage.charts.previousPeriod", { defaultValue: "Previous" })}
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
              {categoryPieData.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{d.name}</p>
                                <p className="text-sm">{formatAmount(d.value)} {appliedFilters.currency}</p>
                                <p className="text-sm text-muted-foreground">{d.percentage.toFixed(1)}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="middle"
                        align="right"
                        layout="vertical"
                        formatter={(value: string, entry: any) => (
                          <span className="text-sm">
                            {value} ({entry.payload.percentage.toFixed(1)}%)
                          </span>
                        )}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>

        <div className={`${mobileView === "transactions" ? "block" : "hidden"} lg:block`}>
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              {t("summaryPage.transactionsTitle", { defaultValue: "Transactions" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions?.items?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">
                        <span className="inline-flex items-center gap-1">
                          {t("summaryPage.table.date")}
                          {appliedFilters.sortBy === "expense_date" && (
                            appliedFilters.sortOrder === "desc" ? (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            )
                          )}
                        </span>
                      </th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.title")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.scope")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.category")}</th>
                      <th className="px-2 py-2 font-medium">{t("summaryPage.table.group")}</th>
                      <th className="px-2 py-2 font-medium">
                        <span className="inline-flex items-center gap-1">
                          {t("summaryPage.table.amount")}
                          {appliedFilters.sortBy === "amount" && (
                            appliedFilters.sortOrder === "desc" ? (
                              <ArrowDown className="h-3 w-3 text-primary" />
                            ) : (
                              <ArrowUp className="h-3 w-3 text-primary" />
                            )
                          )}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.items.map((item) => (
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

        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("summaryPage.export", { defaultValue: "Export" })}</DialogTitle>
              <DialogDescription>
                {t("summaryPage.exportCurrentViewHint", {
                  defaultValue: "Export always uses the filters from your current view.",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("summaryPage.exportFormatLabel", { defaultValue: "Format" })}</Label>
                <Select value={exportFormat} onValueChange={(value) => handleExportFormatChange(value as ExportFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t("summaryPage.exportContentLabel", { defaultValue: "Content" })}</Label>
                <Select value={exportContent} onValueChange={(value) => setExportContent(value as ExportContent)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_CONTENT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {t(option.labelKey, { defaultValue: option.defaultLabel })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {exportFormat === "pdf" && exportContent !== "charts" ? (
                  <p className="text-xs text-muted-foreground">
                    {t("summaryPage.exportPdfHint", {
                      defaultValue: "PDF supports charts only. Transactions will be excluded.",
                    })}
                  </p>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={handleExportSubmit} disabled={exportMutation.isPending}>
                <Download className="mr-2 h-4 w-4" />
                {pendingExportFormat ? t("summaryPage.exporting") : t("summaryPage.export", { defaultValue: "Export" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            {renderFiltersContent()}
          </div>
        </aside>
      </div>
    </div>
  );
}
