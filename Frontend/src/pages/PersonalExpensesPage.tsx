import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, subMonths } from "date-fns";

import AddExpenseDialog from "../components/expenses/AddExpenseDialog";
import ExpensesList from "../components/expenses/ExpensesList";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { expensesPersonalApi } from "@/api/expensesPersonalApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";

import type {
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseCreate,
  ApiPersonalExpenseListParams,
  ApiPersonalExpenseSummaryResponse,
  PersonalExpensePeriodPreset,
  PersonalExpensesFiltersState,
} from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";

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
  const [draftFilters, setDraftFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);
  const queryClient = useQueryClient();
  const LIMIT = 20;

  const { user } = useAuth();

  // Fetch categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.personal,
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
    queryKey: queryKeys.personalExpenses.summary(listParams),
    queryFn: () => expensesPersonalApi.summary(listParams),
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
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error('Failed to create expense:', error);
      // TODO: Add error toast notification in Phase 2
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation<void, Error, number>({
    mutationFn: (expenseId) => expensesPersonalApi.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
    },
    onError: (error) => {
      console.error('Failed to delete expense:', error);
      // TODO: Add error toast notification in Phase 2
    }
  });

  // Handle loading states

  if (!user || categoriesLoading || expensesLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Handle error states
  if (categoriesError || expensesError || summaryError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">{t("common.errorLoadingData")}</h2>
          <p className="text-gray-600">
            {categoriesError?.message || expensesError?.message || summaryError?.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  const totalLabel = (summary?.totals_by_currency ?? [])
    .map((item) => `${Number(item.total_amount).toFixed(2)} ${item.currency}`)
    .join(" · ");

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{t("personalExpensesPage.title")}</h1>
            <p className="text-gray-500 mt-2">
              {t("personalExpensesPage.trackSpending")} · {t("personalExpensesPage.total")}: <span className="font-semibold text-purple-600">{totalLabel || "0.00"}</span>
            </p>
          </div>
          <div className="flex flex-row items-center gap-4 w-full md:w-auto justify-end">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("personalExpensesPage.addExpense")}
            </Button>
            <LanguageSwitcher />
          </div>
        </motion.div>

        <ExpenseFilters
          filters={draftFilters}
          onFilterChange={setDraftFilters}
          onPeriodPresetChange={handlePeriodPresetChange}
          onApplyFilters={handleApplyFilters}
          isApplyDisabled={!hasPendingFilters || hasInvalidDraftDateRange}
          categories={categories}
        />

        <ExpensesList
          expenses={expenses}
          categories={categories}
          isLoading={expensesLoading}
          onDelete={(id) => deleteExpenseMutation.mutate(id)}
        />

        {hasNextPage && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className="w-full md:w-auto"
            >
              {isFetchingNextPage ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
              ) : null}
              {t("personalExpensesPage.loadMore")}
            </Button>
          </div>
        )}
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
      />
    </div>
  );
}