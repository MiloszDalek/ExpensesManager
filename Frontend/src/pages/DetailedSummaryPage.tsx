import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
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
import CategoryPicker from "@/components/expenses/CategoryPicker";
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
  balancesApi,
  budgetsApi,
  categoriesApi,
  contactsApi,
  expensesSummaryApi,
  groupsApi,
  queryKeys,
  recurringExpensesApi,
  savingsGoalsApi,
} from "@/api";
import {
  type ApiContactResponse,
  type ApiRecurringForecastResponse,
  type ApiSavingsGoalResponse,
  type ApiUserBalanceItem,
  type PersonalExpensePeriodPreset,
  type ExpenseSummaryScope,
  type ApiExpenseSummaryDrilldownParams,
} from "@/types";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";

type SummaryFiltersState = {
  scope: ExpenseSummaryScope;
  budgetId: string;
  groupId: string;
  categoryId: string;
  currency: CurrencyEnum | "all";
  periodPreset: PersonalExpensePeriodPreset;
  dateFrom: string;
  dateTo: string;
};

type ExportFormat = "csv" | "xlsx" | "pdf";
type TrendGranularity = "daily" | "weekly" | "monthly";

type ExportSection =
  | "transactions"
  | "category_summary"
  | "budgets"
  | "goals"
  | "recurring_expenses"
  | "group_settlements";

type ExportMutationVariables = {
  format: ExportFormat;
  sections: ExportSection[];
};

const EXPORT_SECTION_OPTIONS: Array<{ id: ExportSection; labelKey: string; defaultLabel: string }> = [
  { id: "transactions", labelKey: "summaryPage.exportSections.transactions", defaultLabel: "Transactions" },
  { id: "category_summary", labelKey: "summaryPage.exportSections.categorySummary", defaultLabel: "Category summary" },
  { id: "budgets", labelKey: "summaryPage.exportSections.budgets", defaultLabel: "Budgets" },
  { id: "goals", labelKey: "summaryPage.exportSections.goals", defaultLabel: "Goals" },
  { id: "recurring_expenses", labelKey: "summaryPage.exportSections.recurring", defaultLabel: "Recurring expenses" },
  { id: "group_settlements", labelKey: "summaryPage.exportSections.groupSettlements", defaultLabel: "Group settlements" },
];

const EXPORT_ALLOWED_SECTIONS: Record<ExportFormat, ExportSection[]> = {
  csv: ["transactions", "category_summary", "budgets"],
  xlsx: EXPORT_SECTION_OPTIONS.map((section) => section.id),
  pdf: ["category_summary", "budgets"],
};

const EXPORT_DEFAULT_SECTIONS: Record<ExportFormat, ExportSection[]> = {
  csv: ["transactions", "category_summary"],
  xlsx: ["transactions", "category_summary", "budgets"],
  pdf: ["category_summary", "budgets"],
};

const normalizeExportSections = (format: ExportFormat, sections: ExportSection[]) => {
  const allowedSet = new Set(EXPORT_ALLOWED_SECTIONS[format]);
  const filtered = sections.filter((section) => allowedSet.has(section));

  if (filtered.length > 0) {
    return filtered;
  }

  return EXPORT_DEFAULT_SECTIONS[format];
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
    budgetId: "all",
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
    first.budgetId === second.budgetId &&
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
const CONTACTS_LIMIT = 100;

export default function DetailedSummaryPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [draftFilters, setDraftFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [trendCurrency, setTrendCurrency] = useState<CurrencyEnum | null>(null);
  const [trendGranularity, setTrendGranularity] = useState<TrendGranularity>("daily");
  const [showIncomeOverlay, setShowIncomeOverlay] = useState(false);
  const [drilldownDate, setDrilldownDate] = useState<string | null>(null);
  const [drilldownCategoryId, setDrilldownCategoryId] = useState<number | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [selectedExportSections, setSelectedExportSections] = useState<ExportSection[]>(
    EXPORT_DEFAULT_SECTIONS.csv
  );
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);

  const appliedGroupId = appliedFilters.groupId === "all" ? undefined : Number(appliedFilters.groupId);

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    error: budgetsError,
  } = useQuery({
    queryKey: queryKeys.budgets.list("active"),
    queryFn: () => budgetsApi.listBudgets("active"),
    enabled: !!user,
  });

  const activeBudgets = useMemo(
    () => budgets.filter((budget) => budget.status === "active"),
    [budgets]
  );

  const selectedBudgetId = useMemo(() => {
    if (appliedFilters.budgetId !== "all") {
      return Number(appliedFilters.budgetId);
    }

    return activeBudgets[0]?.id ?? null;
  }, [activeBudgets, appliedFilters.budgetId]);

  const {
    data: budgetSummary,
    isLoading: budgetSummaryLoading,
    error: budgetSummaryError,
  } = useQuery({
    queryKey: selectedBudgetId ? queryKeys.budgets.summary(selectedBudgetId) : ["budgets", "summary", "none"],
    queryFn: () => budgetsApi.getBudgetSummary(selectedBudgetId as number),
    enabled: !!user && !!selectedBudgetId,
  });

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
      granularity: trendGranularity,
      category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
      group_id: appliedGroupId,
      compare_previous: true,
    }),
    queryFn: () =>
      expensesSummaryApi.trends({
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        scope: appliedFilters.scope,
        granularity: trendGranularity,
        category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
        currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
        group_id: appliedGroupId,
        compare_previous: true,
      }),
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

  const topExpensesParams = useMemo<ApiExpenseSummaryDrilldownParams>(
    () => ({
      limit: 8,
      offset: 0,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
      sort_by: "amount",
      sort_order: "desc",
    }),
    [appliedFilters, appliedGroupId]
  );

  const {
    data: topExpenses,
    isLoading: topExpensesLoading,
    error: topExpensesError,
  } = useQuery({
    queryKey: queryKeys.summaries.drilldown(topExpensesParams),
    queryFn: () => expensesSummaryApi.drilldown(topExpensesParams),
    enabled: !!user,
  });

  const recurringForecastParams = useMemo(
    () => ({
      date_from: appliedFilters.dateFrom,
      date_to: appliedFilters.dateTo,
      scope: appliedFilters.scope,
      group_id: appliedGroupId,
    }),
    [appliedFilters, appliedGroupId]
  );

  const {
    data: recurringForecast,
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery<ApiRecurringForecastResponse>({
    queryKey: queryKeys.recurringExpenses.forecast(recurringForecastParams),
    queryFn: () => recurringExpensesApi.forecast(recurringForecastParams),
    enabled: !!user,
  });

  const {
    data: savingsGoals = [],
    isLoading: goalsLoading,
    error: goalsError,
  } = useQuery<ApiSavingsGoalResponse[]>({
    queryKey: queryKeys.savingsGoals.list({ include_inactive: false }),
    queryFn: () => savingsGoalsApi.list({ include_inactive: false }),
    enabled: !!user,
  });

  const {
    data: contactBalances = [],
    isLoading: balancesLoading,
    error: balancesError,
  } = useQuery<ApiUserBalanceItem[]>({
    queryKey: queryKeys.balances.contacts,
    queryFn: () => balancesApi.getContacts(),
    enabled: !!user,
  });

  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery<ApiContactResponse[]>({
    queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    queryFn: () => contactsApi.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    enabled: !!user,
  });

  const exportMutation = useMutation<{ blob: Blob; filename: string }, Error, ExportMutationVariables>({
    mutationFn: ({ format, sections }) => {
      const baseParams: ApiExpenseSummaryDrilldownParams & { sections?: string } = {
        scope: appliedFilters.scope,
        group_id: appliedGroupId,
        date_from: appliedFilters.dateFrom,
        date_to: appliedFilters.dateTo,
        category_id: appliedFilters.categoryId === "all" ? undefined : Number(appliedFilters.categoryId),
        currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
        sort_by: "expense_date",
        sort_order: "desc",
        sections: normalizeExportSections(format, sections).join(","),
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

  const incomeOverlayTotal = toNumber(budgetSummary?.income_total);

  const trendChartData = useMemo(() => {
    if (!activeTrendSeries) {
      return [];
    }

    const incomeTargetPerBucket =
      showIncomeOverlay && activeTrendSeries.current.length > 0
        ? incomeOverlayTotal / activeTrendSeries.current.length
        : 0;

    return activeTrendSeries.current.map((point, index) => {
      const parsedDate = parseISO(point.date);
      const previousPoint = activeTrendSeries.previous[index];
      const label =
        trendGranularity === "monthly"
          ? format(parsedDate, "MMM yyyy")
          : trendGranularity === "weekly"
            ? `Wk ${format(parsedDate, "dd MMM")}`
            : format(parsedDate, "dd MMM");

      return {
        label,
        rawDate: point.date,
        personal: toNumber(point.personal_amount),
        group: toNumber(point.group_amount),
        total: toNumber(point.total_amount),
        previousTotal: toNumber(previousPoint?.total_amount ?? 0),
        incomeTarget: incomeTargetPerBucket,
      };
    });
  }, [activeTrendSeries, incomeOverlayTotal, showIncomeOverlay, trendGranularity]);

  const ownVsGroupChartData = useMemo(
    () =>
      (overview?.own_vs_group ?? []).map((item) => ({
        currency: item.currency,
        personal: toNumber(item.personal_amount),
        group: toNumber(item.group_amount),
      })),
    [overview]
  );

  const topCategoriesData = useMemo(() => {
    const raw = (overview?.top_categories ?? []).map((category) => ({
      categoryId: category.category_id,
      categoryName: category.category_name,
      amount: toNumber(category.total_amount),
      isOther: false,
    }));

    if (raw.length <= 5) {
      return raw;
    }

    const topFive = raw.slice(0, 5);
    const otherAmount = raw.slice(5).reduce((sum, item) => sum + item.amount, 0);

    return [
      ...topFive,
      {
        categoryId: -1,
        categoryName: t("summaryPage.otherCategory", { defaultValue: "Other" }),
        amount: otherAmount,
        isOther: true,
      },
    ];
  }, [overview, t]);

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
    setIsMobileFiltersOpen(false);
    setDrilldownDate(null);
    setDrilldownCategoryId(null);
  };

  const clearDrilldown = () => {
    setDrilldownDate(null);
    setDrilldownCategoryId(null);
  };

  const handleExportFormatChange = (nextFormat: ExportFormat) => {
    setExportFormat(nextFormat);
    setSelectedExportSections((previous) => normalizeExportSections(nextFormat, previous));
  };

  const handleToggleExportSection = (section: ExportSection) => {
    if (!EXPORT_ALLOWED_SECTIONS[exportFormat].includes(section)) {
      return;
    }

    setSelectedExportSections((previous) => {
      if (previous.includes(section)) {
        const remaining = previous.filter((current) => current !== section);
        return normalizeExportSections(exportFormat, remaining);
      }

      return normalizeExportSections(exportFormat, [...previous, section]);
    });
  };

  const handleExportSubmit = () => {
    const normalizedSections = normalizeExportSections(exportFormat, selectedExportSections);
    exportMutation.mutate({
      format: exportFormat,
      sections: normalizedSections,
    });
    setIsExportDialogOpen(false);
  };

  const budgetKpis = useMemo(() => {
    const income = toNumber(budgetSummary?.income_total);
    const expenses = toNumber(budgetSummary?.spent_total);
    const savings = toNumber(budgetSummary?.saved_total);
    const remaining = income - expenses;
    const overspending =
      (budgetSummary?.pools ?? []).some((pool) => pool.status === "exceeded" || toNumber(pool.remaining_amount) < 0) ||
      remaining < 0;

    return {
      income,
      expenses,
      savings,
      remaining,
      overspending,
      currency: budgetSummary?.currency,
    };
  }, [budgetSummary]);

  const selectedBudget = useMemo(
    () => (selectedBudgetId ? activeBudgets.find((budget) => budget.id === selectedBudgetId) ?? null : null),
    [activeBudgets, selectedBudgetId]
  );

  const selectedBudgetPoolIds = useMemo(
    () => new Set((selectedBudget?.pools ?? []).map((pool) => pool.id)),
    [selectedBudget]
  );

  const budgetPoolRows = useMemo(
    () =>
      (budgetSummary?.pools ?? []).map((pool) => {
        const target = toNumber(pool.target_amount || pool.allocated_amount);
        const spent = toNumber(pool.spent_amount);
        const percent = target > 0 ? Math.min(100, (spent / target) * 100) : 0;

        return {
          ...pool,
          target,
          spent,
          percent,
        };
      }),
    [budgetSummary]
  );

  const filteredGoals = useMemo(() => {
    if (appliedFilters.budgetId === "all") {
      return savingsGoals;
    }

    return savingsGoals.filter(
      (goal) => goal.budget_pool_id !== null && selectedBudgetPoolIds.has(goal.budget_pool_id)
    );
  }, [appliedFilters.budgetId, savingsGoals, selectedBudgetPoolIds]);

  const recurringUpcoming = useMemo(
    () => recurringForecast?.items.slice(0, 8) ?? [],
    [recurringForecast]
  );

  const contactLabelMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const contact of contacts) {
      map.set(contact.contact_id, contact.username || contact.email);
    }
    return map;
  }, [contacts]);

  const balancesOverview = useMemo(() => {
    let owedToUser = 0;
    let owedByUser = 0;

    const ranked = [...contactBalances].sort(
      (first, second) => Math.abs(toNumber(second.amount)) - Math.abs(toNumber(first.amount))
    );

    for (const balance of contactBalances) {
      const amount = toNumber(balance.amount);
      if (amount >= 0) {
        owedToUser += amount;
      } else {
        owedByUser += Math.abs(amount);
      }
    }

    return {
      owedToUser,
      owedByUser,
      net: owedToUser - owedByUser,
      topItems: ranked.slice(0, 6),
    };
  }, [contactBalances]);

  const renderFiltersContent = () => (
    <div className="rounded-xl border border-border bg-card/80 p-4 text-card-foreground backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          <Label>{t("summaryPage.budget", { defaultValue: "Budget" })}</Label>
          <Select
            value={draftFilters.budgetId}
            onValueChange={(value) => setDraftFilters((previous) => ({ ...previous, budgetId: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("summaryPage.budgetAll", { defaultValue: "All active budgets" })}</SelectItem>
              {activeBudgets.map((budget) => (
                <SelectItem key={budget.id} value={String(budget.id)}>
                  {budget.name}
                </SelectItem>
              ))}
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
          <Label>{t("summaryPage.category")}</Label>
          <CategoryPicker
            value={draftFilters.categoryId}
            onValueChange={(value) => setDraftFilters((previous) => ({ ...previous, categoryId: value }))}
            categories={categories}
            allowAllSelection
            trigger="button"
            mobileInset
            showLabel={false}
          />
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
            <SelectTrigger className="w-full">
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
      </div>

      {draftFilters.periodPreset === "custom" ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
    </div>
  );

  const jumpToDrilldown = () => {
    const target = document.getElementById("summary-drilldown");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleTopExpenseClick = (expenseDate: string, categoryId: number) => {
    setDrilldownDate(format(parseISO(expenseDate), "yyyy-MM-dd"));
    setDrilldownCategoryId(categoryId);
    jumpToDrilldown();
  };

  const handleBudgetPoolClick = (categoryId: number) => {
    setDrilldownDate(null);
    setDrilldownCategoryId(categoryId);
    jumpToDrilldown();
  };

  const handleRecurringClick = (occurrenceDate: string, categoryId: number) => {
    setDrilldownDate(occurrenceDate);
    setDrilldownCategoryId(categoryId);
    jumpToDrilldown();
  };

  if (
    !user ||
    groupsLoading ||
    categoriesLoading ||
    budgetsLoading ||
    overviewLoading ||
    trendsLoading ||
    drilldownLoading ||
    (selectedBudgetId !== null && budgetSummaryLoading)
  ) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (groupsError || categoriesError || budgetsError || overviewError || trendsError || drilldownError || budgetSummaryError) {
    return (
      <div className="flex h-screen items-center justify-center px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {groupsError?.message ||
              categoriesError?.message ||
              budgetsError?.message ||
              overviewError?.message ||
              trendsError?.message ||
              drilldownError?.message ||
              budgetSummaryError?.message ||
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
              <PageInfoButton pageKey="summaries" variant="icon" className="md:hidden" autoOpen={true} />
              <PageInfoButton pageKey="summaries" className="hidden md:inline-flex" autoOpen={true} />
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.totalIncome", { defaultValue: "Total income" })}</CardDescription>
              <CardTitle className="text-3xl text-emerald-600">
                {formatAmount(budgetKpis.income)} {budgetKpis.currency ?? ""}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.totalExpenses", { defaultValue: "Total expenses" })}</CardDescription>
              <CardTitle className="text-3xl text-rose-600">
                {formatAmount(budgetKpis.expenses)} {budgetKpis.currency ?? ""}
              </CardTitle>
              <CardDescription>
                {activeComparison
                  ? `${formatAmount(activeComparison.delta_amount)} ${activeComparison.currency}`
                  : t("summaryPage.notAvailable")}
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.savings", { defaultValue: "Savings" })}</CardDescription>
              <CardTitle className="text-3xl text-sky-600">
                {formatAmount(budgetKpis.savings)} {budgetKpis.currency ?? ""}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.remainingBudget", { defaultValue: "Remaining budget" })}</CardDescription>
              <CardTitle
                className={`text-3xl ${budgetKpis.remaining < 0 ? "text-rose-600" : "text-emerald-600"}`}
              >
                {formatAmount(budgetKpis.remaining)} {budgetKpis.currency ?? ""}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t("summaryPage.cards.overspending", { defaultValue: "Overspending" })}</CardDescription>
              <CardTitle className="flex items-center gap-2 text-2xl">
                {budgetKpis.overspending
                  ? t("summaryPage.cards.overspendingYes", { defaultValue: "Warning" })
                  : t("summaryPage.cards.overspendingNo", { defaultValue: "On track" })}
                {budgetKpis.overspending ? (
                  <ArrowDownRight className="h-5 w-5 text-rose-500" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-emerald-500" />
                )}
              </CardTitle>
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
              <div className="flex flex-wrap items-center justify-end gap-2">
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

                <Select
                  value={trendGranularity}
                  onValueChange={(value) => setTrendGranularity(value as TrendGranularity)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("summaryPage.charts.granularityDaily", { defaultValue: "Daily" })}</SelectItem>
                    <SelectItem value="weekly">{t("summaryPage.charts.granularityWeekly", { defaultValue: "Weekly" })}</SelectItem>
                    <SelectItem value="monthly">{t("summaryPage.charts.granularityMonthly", { defaultValue: "Monthly" })}</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={showIncomeOverlay ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowIncomeOverlay((previous) => !previous)}
                  disabled={incomeOverlayTotal <= 0}
                >
                  {t("summaryPage.charts.incomeOverlay", { defaultValue: "Income overlay" })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trendChartData.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendChartData}
                      onClick={(state) => {
                        const clicked = (state as {
                          activePayload?: Array<{
                            payload?: {
                              rawDate?: string;
                            };
                          }>;
                        }).activePayload?.[0]?.payload;
                        if (trendGranularity === "daily" && clicked?.rawDate) {
                          setDrilldownDate(clicked.rawDate);
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
                      {showIncomeOverlay ? (
                        <Line
                          type="monotone"
                          dataKey="incomeTarget"
                          name={t("summaryPage.charts.incomeOverlay")}
                          stroke="#16a34a"
                          strokeDasharray="4 4"
                          strokeWidth={2}
                          dot={false}
                        />
                      ) : null}
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
              <CardTitle>{t("summaryPage.budgetVsActualTitle", { defaultValue: "Budget vs actual" })}</CardTitle>
              <CardDescription>
                {t("summaryPage.budgetVsActualSubtitle", { defaultValue: "Allocated, spent and remaining per budget pool" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedBudgetId ? (
                <p className="py-8 text-center text-muted-foreground">
                  {t("summaryPage.noActiveBudget", { defaultValue: "No active budget available." })}
                </p>
              ) : budgetPoolRows.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="space-y-4">
                  {budgetPoolRows.map((pool) => {
                    const statusColor =
                      pool.status === "exceeded"
                        ? "bg-rose-500"
                        : pool.status === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                    return (
                      <button
                        key={pool.pool_id}
                        type="button"
                        onClick={() => handleBudgetPoolClick(pool.category_id)}
                        className="w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{pool.pool_name}</p>
                          <Badge variant="outline">{pool.status.toUpperCase()}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pool.category_name || t("summaryPage.noData")}
                        </p>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${statusColor}`}
                            style={{ width: `${pool.percent}%` }}
                          />
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <span>
                            {t("summaryPage.allocated", { defaultValue: "Allocated" })}: {formatAmount(pool.target)}
                          </span>
                          <span>
                            {t("summaryPage.spent", { defaultValue: "Spent" })}: {formatAmount(pool.spent)}
                          </span>
                          <span>
                            {t("summaryPage.remaining", { defaultValue: "Remaining" })}: {formatAmount(pool.remaining_amount)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("summaryPage.topExpensesTitle", { defaultValue: "Top expenses" })}</CardTitle>
              <CardDescription>
                {t("summaryPage.topExpensesSubtitle", { defaultValue: "Highest expenses for selected range" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topExpensesLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : topExpensesError ? (
                <p className="py-8 text-center text-destructive">{topExpensesError.message}</p>
              ) : !(topExpenses?.items?.length) ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {topExpenses.items.map((item) => (
                    <button
                      key={`top-expense-${item.scope}-${item.expense_id}`}
                      type="button"
                      onClick={() => handleTopExpenseClick(item.expense_date, item.category_id)}
                      className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{item.title}</p>
                        <span className="font-semibold">
                          {formatAmount(item.user_amount)} {item.currency}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.category_name}</span>
                        <span>•</span>
                        <span>{format(parseISO(item.expense_date), "yyyy-MM-dd")}</span>
                      </div>
                    </button>
                  ))}
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
                      category.isOther ? (
                        <Badge key={category.categoryId} variant="outline" className="h-9 px-3">
                          {category.categoryName}
                        </Badge>
                      ) : (
                        <Button
                          key={category.categoryId}
                          variant={drilldownCategoryId === category.categoryId ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDrilldownCategoryId(category.categoryId)}
                        >
                          {category.categoryName}
                        </Button>
                      )
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("summaryPage.recurringTitle", { defaultValue: "Recurring expenses" })}</CardTitle>
              <CardDescription>
                {t("summaryPage.recurringSubtitle", { defaultValue: "Upcoming scheduled payments" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recurringLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : recurringError ? (
                <p className="py-8 text-center text-destructive">{recurringError.message}</p>
              ) : recurringUpcoming.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="space-y-2">
                  {recurringUpcoming.map((item) => (
                    <button
                      key={`recurring-${item.recurring_expense_id}-${item.occurrence_date}`}
                      type="button"
                      onClick={() => handleRecurringClick(item.occurrence_date, item.category_id)}
                      className="w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{item.title}</p>
                        <span className="font-semibold">
                          {formatAmount(item.user_amount)} {item.currency}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.occurrence_date} • {item.scope === "personal" ? t("summaryPage.scopePersonal") : t("summaryPage.scopeGroup")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("summaryPage.goalsTitle", { defaultValue: "Savings goals" })}</CardTitle>
              <CardDescription>
                {t("summaryPage.goalsSubtitle", { defaultValue: "Progress toward your active goals" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : goalsError ? (
                <p className="py-8 text-center text-destructive">{goalsError.message}</p>
              ) : filteredGoals.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="space-y-4">
                  {filteredGoals.slice(0, 8).map((goal) => {
                    const target = toNumber(goal.target_amount);
                    const current = toNumber(goal.current_amount);
                    const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

                    return (
                      <div key={goal.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{goal.name}</p>
                          <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-sky-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatAmount(current)} / {formatAmount(target)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t("summaryPage.groupBalancesTitle", { defaultValue: "Group balances" })}</CardTitle>
              <CardDescription>
                {t("summaryPage.groupBalancesSubtitle", { defaultValue: "Who owes you and what you owe" })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {balancesLoading || contactsLoading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : balancesError || contactsError ? (
                <p className="py-8 text-center text-destructive">{balancesError?.message || contactsError?.message}</p>
              ) : balancesOverview.topItems.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">{t("summaryPage.noData")}</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md border p-2">
                      <p className="text-muted-foreground">{t("summaryPage.totalOwedToYou", { defaultValue: "Owed to you" })}</p>
                      <p className="font-semibold text-emerald-600">{formatAmount(balancesOverview.owedToUser)}</p>
                    </div>
                    <div className="rounded-md border p-2">
                      <p className="text-muted-foreground">{t("summaryPage.totalYouOwe", { defaultValue: "You owe" })}</p>
                      <p className="font-semibold text-rose-600">{formatAmount(balancesOverview.owedByUser)}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {balancesOverview.topItems.map((entry) => {
                      const amount = toNumber(entry.amount);
                      const label = contactLabelMap.get(entry.user_id) || `User #${entry.user_id}`;

                      return (
                        <div key={entry.user_id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span>{label}</span>
                          <span className={amount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-rose-600"}>
                            {amount >= 0 ? "+" : "-"}{formatAmount(Math.abs(amount))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card id="summary-drilldown" className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
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
                <Label>{t("summaryPage.exportSectionsLabel", { defaultValue: "Sections" })}</Label>
                <div className="space-y-2 rounded-md border p-3">
                  {EXPORT_SECTION_OPTIONS.map((section) => {
                    const isAllowed = EXPORT_ALLOWED_SECTIONS[exportFormat].includes(section.id);
                    const isChecked = selectedExportSections.includes(section.id);

                    return (
                      <label
                        key={section.id}
                        className={`flex items-center gap-3 rounded-sm px-1 py-1 ${
                          isAllowed ? "text-foreground" : "cursor-not-allowed text-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isAllowed && isChecked}
                          disabled={!isAllowed}
                          onChange={() => handleToggleExportSection(section.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm">
                          {t(section.labelKey, { defaultValue: section.defaultLabel })}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {exportFormat === "pdf" ? (
                  <p className="text-xs text-muted-foreground">
                    {t("summaryPage.exportPdfHint", {
                      defaultValue: "PDF includes summary sections only. Raw transaction tables are excluded.",
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
