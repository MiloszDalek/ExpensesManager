import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/contexts/AuthContext";
import { expensesPersonalApi } from "@/api/expensesPersonalApi";
import { recurringExpensesApi } from "@/api/recurringExpensesApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";
import { formatCurrency } from "@/utils/currency";
import { toDateInput, getPeriodRange, areFiltersEqual, getInitialFilters } from "@/utils/expenseFilters";

import type { CurrencyEnum } from "@/types/enums";
import type { CategorySection } from "@/types/enums";
import type { ApiCategoryResponse } from "@/types/category";
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

const LIMIT = 20;
const RECURRING_LIMIT = 50;

export function usePersonalExpensesPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddRecurringDialog, setShowAddRecurringDialog] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<"expenses" | "recurring">(
    searchParams.get("tab") === "recurring" ? "recurring" : "expenses"
  );
  const [editingExpense, setEditingExpense] = useState<ApiPersonalExpenseResponse | null>(null);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<ApiRecurringExpenseResponse | null>(null);
  const [draftFilters, setDraftFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<PersonalExpensesFiltersState>(getInitialFilters);

  const { user } = useAuth();

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availablePersonal,
    queryFn: () => categoriesApi.getAvailablePersonal(),
    enabled: !!user,
  });

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

  const expenses = useMemo(() => data?.pages.flatMap((page) => page) ?? [], [data]);

  const handlePeriodPresetChange = useCallback((preset: PersonalExpensePeriodPreset) => {
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
  }, []);

  const hasPendingFilters = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );

  const hasInvalidDraftDateRange =
    draftFilters.periodPreset === "custom" &&
    !!draftFilters.dateFrom &&
    !!draftFilters.dateTo &&
    draftFilters.dateFrom > draftFilters.dateTo;

  const handleApplyFilters = useCallback(() => {
    if (hasInvalidDraftDateRange) {
      return;
    }
    setAppliedFilters(draftFilters);
    setIsMobileFiltersOpen(false);
  }, [draftFilters, hasInvalidDraftDateRange]);

  useEffect(() => {
    if (!isMobileFiltersOpen) return;
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
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refetchAvailableCategories = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.categories.availablePersonal });
    await queryClient.refetchQueries({ queryKey: queryKeys.categories.availablePersonal, exact: true });
  }, [queryClient]);

  const createCategoryMutation = useMutation<ApiCategoryResponse, Error, { name: string; section: CategorySection }>({
    mutationFn: async ({ name, section }) => {
      const normalizedName = name.trim().toLowerCase();
      return categoriesApi.createPersonal({ name: normalizedName, section });
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

  const handleCreateCustomCategory = useCallback(
    async (payload: { name: string; section: CategorySection }): Promise<ApiCategoryResponse> => {
      const created = await createCategoryMutation.mutateAsync(payload);
      await refetchAvailableCategories();
      return created;
    },
    [createCategoryMutation, refetchAvailableCategories]
  );

  const handleDeleteCustomCategory = useCallback(
    async (categoryId: number): Promise<void> => {
      await deleteCategoryMutation.mutateAsync(categoryId);
      await refetchAvailableCategories();
    },
    [deleteCategoryMutation, refetchAvailableCategories]
  );

  const createExpenseMutation = useMutation<ApiPersonalExpenseResponse, Error, ApiPersonalExpenseCreate>({
    mutationFn: (expenseData) => expensesPersonalApi.create(expenseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      setShowAddDialog(false);
    },
    onError: (error) => {
      console.error("Failed to create expense:", error);
    },
  });

  const createRecurringExpenseMutation = useMutation<ApiRecurringExpenseResponse, Error, ApiRecurringPersonalExpenseCreate>({
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

  const invalidateRecurringRelatedQueries = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
  }, [queryClient]);

  const generateNowRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) =>
      recurringExpensesApi.generateNow(recurringExpenseId, { up_to_date: recurringActionDate }),
    onSuccess: async () => {
      await invalidateRecurringRelatedQueries();
    },
  });

  const pauseRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.pause(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringRelatedQueries();
    },
  });

  const resumeRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.resume(recurringExpenseId),
    onSuccess: async (updatedRecurringExpense) => {
      setEditingRecurringExpense(updatedRecurringExpense);
      await invalidateRecurringRelatedQueries();
    },
  });

  const archiveRecurringMutation = useMutation<ApiRecurringExpenseResponse, Error, number>({
    mutationFn: (recurringExpenseId) => recurringExpensesApi.archive(recurringExpenseId),
    onSuccess: async () => {
      setEditingRecurringExpense(null);
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

  const deleteExpenseMutation = useMutation<void, Error, number>({
    mutationFn: (expenseId) => expensesPersonalApi.delete(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
    onError: (error) => {
      console.error("Failed to delete expense:", error);
    },
  });

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
    },
  });

  const totalLabel = useMemo(
    () =>
      (summary?.totals_by_currency ?? [])
        .map((item) => formatCurrency(Number(item.total_amount), item.currency as CurrencyEnum))
        .join(" · "),
    [summary]
  );

  const recurringActiveCount = useMemo(
    () => recurringExpenses.filter((series) => series.status === "active").length,
    [recurringExpenses]
  );

  const recurringActionsPending =
    updateRecurringMutation.isPending ||
    generateNowRecurringMutation.isPending ||
    pauseRecurringMutation.isPending ||
    resumeRecurringMutation.isPending ||
    archiveRecurringMutation.isPending;

  const isLoading = !user || categoriesLoading || expensesLoading || summaryLoading;
  const isError = categoriesError || expensesError || summaryError;

  return {
    // data
    user,
    categories,
    expenses,
    summary,
    recurringExpenses,
    totalLabel,
    recurringActiveCount,
    recurringActionsPending,
    draftFilters,
    appliedFilters,
    hasPendingFilters,
    hasInvalidDraftDateRange,
    mobileSection,
    isMobileFiltersOpen,
    editingExpense,
    editingRecurringExpense,
    showAddDialog,
    showAddRecurringDialog,
    isLoading,
    isError,
    categoriesError,
    expensesError,
    summaryError,
    recurringLoading,
    recurringError,
    hasNextPage,
    isFetchingNextPage,

    // actions
    setShowAddDialog,
    setShowAddRecurringDialog,
    setIsMobileFiltersOpen,
    setMobileSection,
    setEditingExpense,
    setEditingRecurringExpense,
    setDraftFilters,
    handlePeriodPresetChange,
    handleApplyFilters,
    handleCreateCustomCategory,
    handleDeleteCustomCategory,
    createExpenseMutation,
    createRecurringExpenseMutation,
    deleteExpenseMutation,
    updateExpenseMutation,
    updateRecurringMutation,
    generateNowRecurringMutation,
    pauseRecurringMutation,
    resumeRecurringMutation,
    archiveRecurringMutation,
    fetchNextPage,
    navigate,
    t,
  };
}
