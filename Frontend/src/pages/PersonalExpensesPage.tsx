import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Repeat2, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import PageInfoButton from "@/components/help/PageInfoButton";
import { LoadingSpinner, LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";

import AddExpenseDialog from "../components/expenses/AddExpenseDialog";
import AddRecurringExpenseDialog from "../components/expenses/AddRecurringExpenseDialog";
import EditExpenseDialog from "../components/expenses/EditExpenseDialog";
import EditRecurringExpenseDialog from "../components/expenses/EditRecurringExpenseDialog";
import ExpensesList from "../components/expenses/ExpensesList";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import ExpenseSummary from "../components/expenses/ExpenseSummary";
import RecurringExpensesPanel from "../components/expenses/RecurringExpensesPanel";
import SpeedDial from "@/components/ui/speed-dial";
import { usePersonalExpensesPage } from "@/hooks/expenses/usePersonalExpensesPage";

import type { ApiPersonalExpenseCreate } from "@/types/expense";

export default function PersonalExpensesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const page = usePersonalExpensesPage();

  if (page.isLoading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if (page.isError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive text-center">
          <h2 className="text-2xl font-bold mb-2">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {page.categoriesError?.message || page.expensesError?.message || page.summaryError?.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start"
        >
          <div>
            <div className="flex max-w-full flex-wrap items-center justify-between gap-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("personalExpensesPage.title")}</h1>
              <PageInfoButton pageKey="personal" autoOpen={true} className="lg:hidden" />
            </div>
            <p className="text-muted-foreground mt-2">{t("personalExpensesPage.trackSpending")}</p>
          </div>

          <div className="hidden md:flex md:flex-row md:items-start md:justify-end md:gap-2">
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <Button
                onClick={() => page.setShowAddDialog(true)}
                className="inline-flex w-full justify-center shadow-lg md:w-36"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("personalExpensesPage.addExpense")}
              </Button>
              <Button
                variant="outline"
                className="inline-flex w-full justify-center md:w-36 border border-border bg-card/80"
                onClick={() => page.setShowAddRecurringDialog(true)}
              >
                <Repeat2 className="w-4 h-4 mr-2" />
                {t("personalExpensesPage.addRecurringExpense")}
              </Button>
              <Button
                variant="outline"
                className="inline-flex w-full justify-center md:w-36 border border-border bg-card/80"
                onClick={() => navigate("/receipt-scan")}
              >
                <ScanSearch className="w-4 h-4 mr-2" />
                {t("personalExpensesPage.scanReceipt")}
              </Button>
            </div>
            <PageInfoButton pageKey="personal" autoOpen={true} className="hidden lg:inline-flex" />
          </div>
        </motion.div>

        <div className="mb-4 md:hidden">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              size="sm"
              variant={page.mobileSection === "expenses" ? "default" : "outline"}
              className={`h-8 px-2 text-sm border border-border ${
                page.mobileSection === "expenses" ? "bg-primary text-primary-foreground" : "bg-card/80"
              }`}
              onClick={() => page.setMobileSection("expenses")}
            >
              {t("personalExpensesPage.expenseCount")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={page.mobileSection === "recurring" ? "default" : "outline"}
              className={`h-8 px-2 text-sm border border-border ${
                page.mobileSection === "recurring" ? "bg-primary text-primary-foreground" : "bg-card/80"
              }`}
              onClick={() => page.setMobileSection("recurring")}
            >
              {t("globalHeader.navRecurring")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="order-1 hidden md:block lg:col-span-3">
            <div className="lg:sticky lg:top-20">
              <h2 className="mb-3 text-xl font-semibold text-foreground">{t("personalExpensesPage.filtersTitle")}</h2>
              <ExpenseFilters
                filters={page.draftFilters}
                onFilterChange={page.setDraftFilters}
                onPeriodPresetChange={page.handlePeriodPresetChange}
                onApplyFilters={page.handleApplyFilters}
                isApplyDisabled={!page.hasPendingFilters || page.hasInvalidDraftDateRange}
                categories={page.categories}
                onCreateCustomCategory={page.handleCreateCustomCategory}
                onDeleteCustomCategory={page.handleDeleteCustomCategory}
              />
            </div>
          </div>

          <div className={`order-2 lg:col-span-6 ${page.mobileSection !== "expenses" ? "hidden md:block" : ""}`}>
            <h2 className="mb-3 text-xl font-semibold text-foreground">{t("personalExpensesPage.numericSummary")}</h2>
            <ExpenseSummary totalLabel={page.totalLabel} count={page.summary?.total_count ?? 0} />

            <h2 className="mb-3 text-xl font-semibold text-foreground">{t("personalExpensesPage.listTitle")}</h2>
            <ExpensesList
              expenses={page.expenses}
              categories={page.categories}
              isLoading={false}
              onDelete={(id) => page.deleteExpenseMutation.mutate(id)}
              onEdit={(expense) => page.setEditingExpense(expense)}
            />

            {page.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={() => page.fetchNextPage()}
                  disabled={page.isFetchingNextPage}
                  variant="outline"
                  className="w-full md:w-auto border border-border bg-card/80"
                >
                  {page.isFetchingNextPage ? <LoadingSpinner className="mr-2 h-4 w-4" /> : null}
                  {t("personalExpensesPage.loadMore")}
                </Button>
              </div>
            )}
          </div>

          <div className={`order-3 lg:col-span-3 ${page.mobileSection !== "recurring" ? "hidden md:block" : ""}`}>
            <RecurringExpensesPanel
              items={page.recurringExpenses}
              isLoading={page.recurringLoading}
              error={page.recurringError}
              activeCount={page.recurringActiveCount}
              onEdit={(series) => page.setEditingRecurringExpense(series)}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-[41] bg-black/35 transition-opacity duration-300 ${
            page.isMobileFiltersOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => page.setIsMobileFiltersOpen(false)}
          aria-hidden="true"
        />
        <aside
          className="fixed left-0 top-0 z-[42] h-screen border-r border-border bg-background/95 shadow-xl backdrop-blur-sm transition-transform duration-300 ease-out"
          style={{
            width: "min(82vw, 20rem)",
            transform: page.isMobileFiltersOpen ? "translateX(0)" : "translateX(-100%)",
          }}
          aria-hidden={!page.isMobileFiltersOpen}
        >
          <button
            type="button"
            aria-label={page.isMobileFiltersOpen ? t("personalExpensesPage.closeFilters") : t("personalExpensesPage.openFilters")}
            onClick={() => page.setIsMobileFiltersOpen((previous) => !previous)}
            className="absolute -right-8 top-[42%] z-[43] flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-r-full border border-l-0 border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm"
          >
            {page.isMobileFiltersOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div className="h-full overflow-y-auto p-4 pt-6">
            <h2 className="mb-3 text-xl font-semibold text-foreground">{t("personalExpensesPage.filtersTitle")}</h2>
            <ExpenseFilters
              filters={page.draftFilters}
              onFilterChange={page.setDraftFilters}
              onPeriodPresetChange={page.handlePeriodPresetChange}
              onApplyFilters={page.handleApplyFilters}
              isApplyDisabled={!page.hasPendingFilters || page.hasInvalidDraftDateRange}
              categories={page.categories}
              onCreateCustomCategory={page.handleCreateCustomCategory}
              onDeleteCustomCategory={page.handleDeleteCustomCategory}
            />
          </div>
        </aside>
      </div>

      <div className="md:hidden">
        {!page.isMobileFiltersOpen ? (
          <SpeedDial
            onAddExpense={() => page.setShowAddDialog(true)}
            onAddRecurringExpense={() => page.setShowAddRecurringDialog(true)}
            onScanReceipt={() => navigate("/receipt-scan")}
            addExpenseLabel={t("personalExpensesPage.addExpense")}
            addRecurringExpenseLabel={t("personalExpensesPage.addRecurringExpense")}
            scanReceiptLabel={t("personalExpensesPage.scanReceipt")}
          />
        ) : null}
      </div>

      <AddExpenseDialog
        open={page.showAddDialog}
        onOpenChange={page.setShowAddDialog}
        onSubmit={(data) => {
          const expenseData: ApiPersonalExpenseCreate = {
            ...data,
            amount: data.amount.toString(),
          };
          page.createExpenseMutation.mutate(expenseData);
        }}
        isLoading={page.createExpenseMutation.isPending}
        categories={page.categories}
        onCreateCustomCategory={page.handleCreateCustomCategory}
        onDeleteCustomCategory={page.handleDeleteCustomCategory}
      />

      <AddRecurringExpenseDialog
        open={page.showAddRecurringDialog}
        onOpenChange={page.setShowAddRecurringDialog}
        onSubmit={(payload) => page.createRecurringExpenseMutation.mutate(payload)}
        categories={page.categories}
        isLoading={page.createRecurringExpenseMutation.isPending}
        onCreateCustomCategory={page.handleCreateCustomCategory}
        onDeleteCustomCategory={page.handleDeleteCustomCategory}
      />

      <EditExpenseDialog
        open={!!page.editingExpense}
        expense={page.editingExpense}
        onOpenChange={(open) => {
          if (!open) page.setEditingExpense(null);
        }}
        onSubmit={(payload) => {
          if (!page.editingExpense) return;
          page.updateExpenseMutation.mutate({ expenseId: page.editingExpense.id, payload });
        }}
        isLoading={page.updateExpenseMutation.isPending}
        categories={page.categories}
        onCreateCustomCategory={page.handleCreateCustomCategory}
        onDeleteCustomCategory={page.handleDeleteCustomCategory}
      />

      <EditRecurringExpenseDialog
        open={!!page.editingRecurringExpense}
        recurringExpense={page.editingRecurringExpense}
        categories={page.categories}
        isSaving={page.updateRecurringMutation.isPending}
        isActionPending={page.recurringActionsPending}
        onOpenChange={(open) => {
          if (!open) page.setEditingRecurringExpense(null);
        }}
        onSubmit={(payload) => {
          if (!page.editingRecurringExpense) return;
          page.updateRecurringMutation.mutate({ recurringExpenseId: page.editingRecurringExpense.id, payload });
        }}
        onGenerateNow={() => {
          if (!page.editingRecurringExpense) return;
          page.generateNowRecurringMutation.mutate(page.editingRecurringExpense.id);
        }}
        onPause={() => {
          if (!page.editingRecurringExpense) return;
          page.pauseRecurringMutation.mutate(page.editingRecurringExpense.id);
        }}
        onResume={() => {
          if (!page.editingRecurringExpense) return;
          page.resumeRecurringMutation.mutate(page.editingRecurringExpense.id);
        }}
        onArchive={() => {
          if (!page.editingRecurringExpense) return;
          page.archiveRecurringMutation.mutate(page.editingRecurringExpense.id);
        }}
        onCreateCustomCategory={page.handleCreateCustomCategory}
        onDeleteCustomCategory={page.handleDeleteCustomCategory}
      />
    </div>
  );
}
