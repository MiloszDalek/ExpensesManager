import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

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
  // ApiPersonalExpenseUpdate
} from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import type { CurrencyEnum } from "@/types/enums";

export default function PersonalExpensesPage() {
  const { t } = useTranslation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState({ category: 'all' });
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
  const {
    data,
    isLoading: expensesLoading,
    error: expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ApiPersonalExpenseResponse[]>({
    queryKey: queryKeys.personalExpenses.all,
    queryFn: ({ pageParam = 0 }) => expensesPersonalApi.list(LIMIT, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    initialPageParam: 0,
    enabled: !!user,
  });

  const expenses = useMemo(() =>
    data?.pages.flatMap((page) => page) ?? [],
    [data]
  );

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

  if (!user || categoriesLoading || expensesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Handle error states
  if (categoriesError || expensesError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 text-center">
          <h2 className="text-2xl font-bold mb-2">{t("common.errorLoadingData")}</h2>
          <p className="text-gray-600">
            {categoriesError?.message || expensesError?.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  // Filter expenses based on selected category
  const filteredExpenses = filters.category === 'all'
    ? expenses
    : expenses.filter(e => e.category_id === Number(filters.category));

  // Calculate total spending from filtered expenses
  const totalSpending = filteredExpenses.reduce((sum, e) => {
    const amount = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
    return sum + amount;
  }, 0);

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
              {t("personalExpensesPage.trackSpending")} · {t("personalExpensesPage.total")}: <span className="font-semibold text-purple-600">${totalSpending.toFixed(2)}</span>
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
          filters={filters}
          onFilterChange={setFilters}
          categories={categories}
        />

        <ExpensesList
          expenses={filteredExpenses}
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
          // Ensure amount is a string as required by the API
          const expenseData: ApiPersonalExpenseCreate = {
            ...data,
            amount: data.amount.toString(),
            currency: "PLN" as CurrencyEnum // We'll make this configurable in Phase 2
          };
          createExpenseMutation.mutate(expenseData);
        }}
        isLoading={createExpenseMutation.isPending}
        categories={categories}
      />
    </div>
  );
}