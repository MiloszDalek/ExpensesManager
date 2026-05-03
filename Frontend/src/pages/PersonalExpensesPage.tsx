import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Repeat2, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, subMonths } from "date-fns";
import PageInfoButton from "@/components/help/PageInfoButton";

import AddExpenseDialog from "../components/expenses/AddExpenseDialog";
import AddRecurringExpenseDialog from "../components/expenses/AddRecurringExpenseDialog";
import EditExpenseDialog from "../components/expenses/EditExpenseDialog";
import EditRecurringExpenseDialog from "../components/expenses/EditRecurringExpenseDialog";
import ExpensesList from "../components/expenses/ExpensesList";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import SpeedDial from "@/components/ui/speed-dial";
import { useAuth } from "@/contexts/AuthContext";
import { expensesPersonalApi } from "@/api/expensesPersonalApi";
import { recurringExpensesApi } from "@/api/recurringExpensesApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";
import { formatCategoryNameForDisplay } from "@/utils/category";

import type {
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseCreate,
  ApiPersonalExpenseListParams,
  ApiRecurringExpenseResponse,
  ApiPersonalExpenseSummaryResponse,
  ApiPersonalExpenseUpdate,
  ApiRecurringExpenseUpdate,
  ApiRecurringPersonalExpenseCreate,
  PersonalExpensePeriodPreset,
  PersonalExpensesFiltersState,
} from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import type { CategorySection, RecurrenceFrequency, RecurringExpenseStatus } from "@/types/enums";

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

const getInitialFilters = (): PersonalExpensesFiltersState => {
  const thisMonthRange = getPeriodRange("this_month");

  return {
    category: "all",
    currency: "all",
    periodPreset: "this_month",
    dateFrom: thisMonthRange.dateFrom,
    dateTo: thisMonthRange.dateTo,
    sortBy: "expense_date",
    sortOrder: "desc",
  };
};

const areFiltersEqual = (
  first: PersonalExpensesFiltersState,
  second: PersonalExpensesFiltersState
) => {
  return (
    first.category === second.category &&
    first.currency === second.currency &&
    first.periodPreset === second.periodPreset &&
    first.dateFrom === second.dateFrom &&
    first.dateTo === second.dateTo &&
    first.sortBy === second.sortBy &&
    first.sortOrder === second.sortOrder
  );
};

export default function PersonalExpensesPage() {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddRecurringDialog, setShowAddRecurringDialog] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"expenses" | "recurring">("expenses");
  const [editingExpense, setEditingExpense] = useState<ApiPersonalExpenseResponse | null>(null);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<ApiRecurringExpenseResponse | null>(null);
  const [draftFilters, setDraftFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const LIMIT = 20;
  const RECURRING_LIMIT = 50;

  const { user } = useAuth();

  // Fetch categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availablePersonal,
    queryFn: () => categoriesApi.getAvailablePersonal(),
    enabled: !!user,
  });

  // Fetch expenses with pagination
  const listParams = useMemo<ApiPersonalExpenseListParams>(
    () => ({
      date_from: appliedFilters.dateFrom || undefined,
      date_to: appliedFilters.dateTo || undefined,
      category_id: appliedFilters.category === "all" ? undefined : Number(appliedFilters.category),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
      sort_by: appliedFilters.sortBy,
      sort_order: appliedFilters.sortOrder,
    }),
    [appliedFilters]
  );

  const summaryParams = useMemo<Omit<ApiPersonalExpenseListParams, "limit" | "offset" | "sort_by" | "sort_order">>(
    () => ({
      date_from: appliedFilters.dateFrom || undefined,
      date_to: appliedFilters.dateTo || undefined,
      category_id: appliedFilters.category === "all" ? undefined : Number(appliedFilters.category),
      currency: appliedFilters.currency === "all" ? undefined : appliedFilters.currency,
    }),
    [appliedFilters]
  );

  const {
    data,
    isLoading: expensesLoading,
    error: expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ApiPersonalExpenseResponse[]>({
    queryKey: queryKeys.personalExpenses.list(listParams),
    queryFn: ({ pageParam = 0 }) =>
      expensesPersonalApi.list({
        ...listParams,
        limit: LIMIT,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    initialPageParam: 0,
    enabled: !!user,
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery<ApiPersonalExpenseSummaryResponse>({
    queryKey: queryKeys.personalExpenses.summary(summaryParams),
    queryFn: () => expensesPersonalApi.summary(summaryParams),
    enabled: !!user,
  });

  const {
    data: recurringExpenses = [],
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery<ApiRecurringExpenseResponse[]>({
    queryKey: queryKeys.recurringExpenses.list({
      scope: "personal",
      limit: RECURRING_LIMIT,
      offset: 0,
    }),
    queryFn: () =>
      recurringExpensesApi.list({
        scope: "personal",
        limit: RECURRING_LIMIT,
        offset: 0,
      }),
    enabled: !!user,
  });

  const expenses = useMemo(() =>
    data?.pages.flatMap((page) => page) ?? [],
    [data]
  );

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

  const hasPendingFilters = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );

  const hasInvalidDraftDateRange =
    draftFilters.periodPreset === "custom" &&
    !!draftFilters.dateFrom &&
    !!draftFilters.dateTo &&
    draftFilters.dateFrom > draftFilters.dateTo;

  const handleApplyFilters = () => {
    if (hasInvalidDraftDateRange) {
      return;
    }

    setAppliedFilters(draftFilters);
    setIsMobileFiltersOpen(false);
  };

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

  const refetchAvailableCategories = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.categories.availablePersonal });
    await queryClient.refetchQueries({ queryKey: queryKeys.categories.availablePersonal, exact: true });
  };

  const createCategoryMutation = useMutation<
    ApiCategoryResponse,
    Error,
    { name: string; section: CategorySection }
  >({
    mutationFn: async ({ name, section }) => {
      const normalizedName = name.trim().toLowerCase();
      return categoriesApi.createPersonal({
        name: normalizedName,
        section,
      });
    },
    onError: (error) => {
      console.error("Failed to create personal category:", error);
    },
  });

  const deleteCategoryMutation = useMutation<void, Error, number>({
    mutationFn: (categoryId) => categoriesApi.deletePersonal(categoryId),
    onError: (error) => {
      console.error("Failed to delete personal category:", error);
    },
  });

  const handleCreateCustomCategory = async (payload: {
    name: string;
    section: CategorySection;
  }): Promise<ApiCategoryResponse> => {
    const created = await createCategoryMutation.mutateAsync(payload);
    await refetchAvailableCategories();
    return created;
  };

  const handleDeleteCustomCategory = async (categoryId: number): Promise<void> => {
    await deleteCategoryMutation.mutateAsync(categoryId);
    await refetchAvailableCategories();
  };

  // Create expense mutation
  const createExpenseMutation = useMutation<
    ApiPersonalExpenseResponse,
    Error,
    ApiPersonalExpenseCreate
  >({
    mutationFn: (expenseData) => expensesPersonalApi.create(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error('Failed to create expense:', error);
      // TODO: Add error toast notification in Phase 2
    }
  });

  const createRecurringExpenseMutation = useMutation<
    ApiRecurringExpenseResponse,
    Error,
    ApiRecurringPersonalExpenseCreate
  >({
    mutationFn: async (payload) => {
      const recurringExpense = await recurringExpensesApi.createPersonal(payload);
      await recurringExpensesApi.generateNow(recurringExpense.id, { up_to_date: payload.starts_on });
      return recurringExpense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
      setShowAddRecurringDialog(false);
    },
    onError: (error) => {
      console.error("Failed to create recurring expense:", error);
    },
  });

  const recurringActionDate = useMemo(() => toDateInput(new Date()), []);

  const invalidateRecurringRelatedQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
  };

  const generateNowRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) =>
      recurringExpensesApi.generateNow(recurringExpenseId, { up_to_date: recurringActionDate }),
    onSuccess: async () => {
      await invalidateRecurringRelatedQueries();
    },
  });

  const pauseRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.pause(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringRelatedQueries();
    },
  });

  const resumeRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.resume(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringRelatedQueries();
    },
  });

  const archiveRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.archive(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringRelatedQueries();
    },
  });

  const updateRecurringMutation = useMutation<
    ApiRecurringExpenseResponse,
    Error,
    { recurringExpenseId: number; payload: ApiRecurringExpenseUpdate }
  >({
    mutationFn: ({ recurringExpenseId, payload }) => recurringExpensesApi.update(recurringExpenseId, payload),
    onSuccess: async () => {
      await invalidateRecurringRelatedQueries();
      setEditingRecurringExpense(null);
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation<void, Error, number>({
    mutationFn: (expenseId) => expensesPersonalApi.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
    onError: (error) => {
      console.error('Failed to delete expense:', error);
      // TODO: Add error toast notification in Phase 2
    }
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation<
    ApiPersonalExpenseResponse,
    Error,
    { expenseId: number; payload: ApiPersonalExpenseUpdate }
  >({
    mutationFn: ({ expenseId, payload }) => expensesPersonalApi.update(expenseId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      setEditingExpense(null);
    },
    onError: (error) => {
      console.error("Failed to update expense:", error);
      // TODO: Add error toast notification in Phase 2
    },
  });

  // Handle loading states

  if (!user || categoriesLoading || expensesLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Handle error states
  if (categoriesError || expensesError || summaryError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive text-center">
          <h2 className="text-2xl font-bold mb-2">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {categoriesError?.message || expensesError?.message || summaryError?.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  const totalLabel = (summary?.totals_by_currency ?? [])
    .map((item) => `${Number(item.total_amount).toFixed(2)} ${item.currency}`)
    .join(" · ");

  const topCategory = summary?.top_categories?.[0] ?? null;
  const topCategoryName = topCategory
    ? t(`category.${topCategory.category_name}`, {
        defaultValue: formatCategoryNameForDisplay(topCategory.category_name),
      })
    : "-";

  const mapRecurringStatusLabel = (status: RecurringExpenseStatus) => {
    if (status === "active") {
      return t("recurringExpenses.statusActive", { defaultValue: "Active" });
    }
    if (status === "paused") {
      return t("recurringExpenses.statusPaused", { defaultValue: "Paused" });
    }
    if (status === "ended") {
      return t("recurringExpenses.statusEnded", { defaultValue: "Ended" });
    }

    return t("recurringExpenses.statusArchived", { defaultValue: "Archived" });
  };

  const mapRecurringFrequencyLabel = (frequency: RecurrenceFrequency) => {
    if (frequency === "daily") {
      return t("addExpenseDialog.recurringDaily", { defaultValue: "Daily" });
    }
    if (frequency === "weekly") {
      return t("addExpenseDialog.recurringWeekly", { defaultValue: "Weekly" });
    }
    if (frequency === "monthly") {
      return t("addExpenseDialog.recurringMonthly", { defaultValue: "Monthly" });
    }
    if (frequency === "quarterly") {
      return t("addExpenseDialog.recurringQuarterly", { defaultValue: "Quarterly" });
    }
    return t("addExpenseDialog.recurringYearly", { defaultValue: "Yearly" });
  };

  const recurringActiveCount = recurringExpenses.filter((series) => series.status === "active").length;

  const recurringActionsPending =
    updateRecurringMutation.isPending ||
    generateNowRecurringMutation.isPending ||
    pauseRecurringMutation.isPending ||
    resumeRecurringMutation.isPending ||
    archiveRecurringMutation.isPending;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("personalExpensesPage.title")}</h1>
              <PageInfoButton pageKey="personal" variant="icon" className="md:hidden" autoOpen={true} />
              <PageInfoButton pageKey="personal" className="hidden md:inline-flex" autoOpen={true} />
            </div>
            <p className="text-muted-foreground mt-2">
              {t("personalExpensesPage.trackSpending")}
            </p>
          </div>

          <div className="hidden md:flex md:flex-col md:items-end md:gap-2">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="inline-flex w-full justify-center shadow-lg md:w-36"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("personalExpensesPage.addExpense")}
            </Button>
            <Button
              variant="outline"
              className="inline-flex w-full justify-center md:w-36"
              onClick={() => setShowAddRecurringDialog(true)}
            >
              <Repeat2 className="w-4 h-4 mr-2" />
              {t("personalExpensesPage.addRecurringExpense", { defaultValue: "Add recurring" })}
            </Button>
            <Button
              variant="outline"
              className="inline-flex w-full justify-center md:w-36"
              onClick={() => navigate("/receipt-scan")}
            >
              <ScanSearch className="w-4 h-4 mr-2" />
              {t("personalExpensesPage.scanReceipt")}
            </Button>
          </div>
        </motion.div>

        <div className="mb-4 md:hidden">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "expenses" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("expenses")}
            >
              {t("personalExpensesPage.expenseCount", { defaultValue: "Expenses" })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "recurring" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("recurring")}
            >
              {t("globalHeader.navRecurring", { defaultValue: "Recurring" })}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="order-1 hidden md:block lg:col-span-3">
            <div className="lg:sticky lg:top-20">
              <h2 className="mb-3 text-xl font-semibold text-foreground">
                {t("personalExpensesPage.filtersTitle", { defaultValue: "Filtry" })}
              </h2>

              <ExpenseFilters
                filters={draftFilters}
                onFilterChange={setDraftFilters}
                onPeriodPresetChange={handlePeriodPresetChange}
                onApplyFilters={handleApplyFilters}
                isApplyDisabled={!hasPendingFilters || hasInvalidDraftDateRange}
                categories={categories}
                onCreateCustomCategory={handleCreateCustomCategory}
                onDeleteCustomCategory={handleDeleteCustomCategory}
              />
            </div>
          </div>

          <div className={`order-2 lg:col-span-6 ${mobileSection !== "expenses" ? "hidden md:block" : ""}`}>
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              {t("personalExpensesPage.numericSummary")}
            </h2>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4 md:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("personalExpensesPage.total")}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">{totalLabel || "0.00"}</p>
              </div>

              <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4 md:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("personalExpensesPage.expenseCount")}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">{summary?.total_count ?? 0}</p>
              </div>

              <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4 md:p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("personalExpensesPage.topCategory")}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {topCategoryName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topCategory ? Number(topCategory.total_amount).toFixed(2) : "-"}
                </p>
              </div>
            </div>

            <h2 className="mb-3 text-xl font-semibold text-foreground">
              {t("personalExpensesPage.listTitle", { defaultValue: "Lista wydatkow" })}
            </h2>

            <ExpensesList
              expenses={expenses}
              categories={categories}
              isLoading={expensesLoading}
              onDelete={(id) => deleteExpenseMutation.mutate(id)}
              onEdit={(expense) => setEditingExpense(expense)}
            />

            {hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  {isFetchingNextPage ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-primary"></div>
                  ) : null}
                  {t("personalExpensesPage.loadMore")}
                </Button>
              </div>
            )}
          </div>

          <div className={`order-3 lg:col-span-3 ${mobileSection !== "recurring" ? "hidden md:block" : ""}`}>
            <div className="p-1">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("globalHeader.navRecurring", { defaultValue: "Recurring" })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {recurringActiveCount}/{recurringExpenses.length}
                </p>
              </div>

              {recurringLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : recurringError ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
                  {(recurringError as Error).message || t("common.somethingWentWrong")}
                </p>
              ) : recurringExpenses.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {t("recurringExpenses.empty", {
                    defaultValue: "No recurring expenses yet. Create one from Add Expense / Add Group Expense dialogs.",
                  })}
                </p>
              ) : (
                <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                  {recurringExpenses.map((series) => (
                    <div
                      key={series.id}
                      className="group overflow-hidden rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Repeat2 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">{series.title}</p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("recurringExpenses.cardAmount", { defaultValue: "Amount" })}: {Number(series.amount).toFixed(2)} {series.currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardFrequency", { defaultValue: "Frequency" })}: {mapRecurringFrequencyLabel(series.frequency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardInterval", { defaultValue: "Every {{count}} periods", count: series.interval_count })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardStatus", { defaultValue: "Status" })}: {mapRecurringStatusLabel(series.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.nextDue", { defaultValue: "Next due" })}: {series.next_due_on}
                          </p>

                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 px-2 text-[11px]"
                            onClick={() => setEditingRecurringExpense(series)}
                          >
                            {t("recurringExpenses.editSeries", { defaultValue: "Edit / Manage" })}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
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
            width: "min(82vw, 20rem)",
            transform: isMobileFiltersOpen ? "translateX(0)" : "translateX(-100%)",
          }}
          aria-hidden={!isMobileFiltersOpen}
        >
          <button
            type="button"
            aria-label={
              isMobileFiltersOpen
                ? t("personalExpensesPage.closeFilters", { defaultValue: "Close filters" })
                : t("personalExpensesPage.openFilters", { defaultValue: "Open filters" })
            }
            onClick={() => setIsMobileFiltersOpen((previous) => !previous)}
            className="absolute -right-8 top-[42%] z-[43] flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm"
          >
            {isMobileFiltersOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          <div className="h-full overflow-y-auto p-4 pt-6">
            <h2 className="mb-3 text-xl font-semibold text-foreground">
              {t("personalExpensesPage.filtersTitle", { defaultValue: "Filtry" })}
            </h2>

            <ExpenseFilters
              filters={draftFilters}
              onFilterChange={setDraftFilters}
              onPeriodPresetChange={handlePeriodPresetChange}
              onApplyFilters={handleApplyFilters}
              isApplyDisabled={!hasPendingFilters || hasInvalidDraftDateRange}
              categories={categories}
              onCreateCustomCategory={handleCreateCustomCategory}
              onDeleteCustomCategory={handleDeleteCustomCategory}
            />
          </div>
        </aside>
      </div>

      <div className="md:hidden">
        {!isMobileFiltersOpen ? (
          <SpeedDial
            onAddExpense={() => setShowAddDialog(true)}
            onAddRecurringExpense={() => setShowAddRecurringDialog(true)}
            onScanReceipt={() => navigate("/receipt-scan")}
            addExpenseLabel={t("personalExpensesPage.addExpense")}
            addRecurringExpenseLabel={t("personalExpensesPage.addRecurringExpense", { defaultValue: "Add recurring" })}
            scanReceiptLabel={t("personalExpensesPage.scanReceipt")}
          />
        ) : null}
      </div>

      <AddExpenseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={(data) => {
          const expenseData: ApiPersonalExpenseCreate = {
            ...data,
            amount: data.amount.toString(),
          };

          createExpenseMutation.mutate(expenseData);
        }}
        isLoading={createExpenseMutation.isPending}
        categories={categories}
        onCreateCustomCategory={handleCreateCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
      />

      <AddRecurringExpenseDialog
        open={showAddRecurringDialog}
        onOpenChange={setShowAddRecurringDialog}
        onSubmit={(payload) => createRecurringExpenseMutation.mutate(payload)}
        categories={categories}
        isLoading={createRecurringExpenseMutation.isPending}
        onCreateCustomCategory={handleCreateCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
      />

      <EditExpenseDialog
        open={!!editingExpense}
        expense={editingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpense(null);
          }
        }}
        onSubmit={(payload) => {
          if (!editingExpense) {
            return;
          }

          updateExpenseMutation.mutate({
            expenseId: editingExpense.id,
            payload,
          });
        }}
        isLoading={updateExpenseMutation.isPending}
        categories={categories}
        onCreateCustomCategory={handleCreateCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
      />

      <EditRecurringExpenseDialog
        open={!!editingRecurringExpense}
        recurringExpense={editingRecurringExpense}
        categories={categories}
        isSaving={updateRecurringMutation.isPending}
        isActionPending={recurringActionsPending}
        onOpenChange={(open) => {
          if (!open) {
            setEditingRecurringExpense(null);
          }
        }}
        onSubmit={(payload) => {
          if (!editingRecurringExpense) {
            return;
          }

          updateRecurringMutation.mutate({
            recurringExpenseId: editingRecurringExpense.id,
            payload,
          });
        }}
        onGenerateNow={() => {
          if (!editingRecurringExpense) {
            return;
          }

          generateNowRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onPause={() => {
          if (!editingRecurringExpense) {
            return;
          }

          pauseRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onResume={() => {
          if (!editingRecurringExpense) {
            return;
          }

          resumeRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onArchive={() => {
          if (!editingRecurringExpense) {
            return;
          }

          archiveRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onCreateCustomCategory={handleCreateCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
      />
    </div>
  );
}