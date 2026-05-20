import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import PageInfoButton from "@/components/help/PageInfoButton";

import BudgetCreateForm from "@/components/budgets/BudgetCreateForm";
import BudgetTabs from "@/components/budgets/BudgetTabs";
import BudgetPeriodsSection from "@/components/budgets/BudgetPeriodsSection";
import BudgetIncomeSection from "@/components/budgets/BudgetIncomeSection";
import BudgetPoolsSection from "@/components/budgets/BudgetPoolsSection";
import BudgetGoalsSection from "@/components/budgets/BudgetGoalsSection";

import { useBudgetsPage } from "@/hooks/budgets/useBudgetsPage";
import { useBudgetCreateForm } from "@/hooks/budgets/useBudgetCreateForm";
import { useIncomeForm } from "@/hooks/budgets/useIncomeForm";
import { usePoolForm } from "@/hooks/budgets/usePoolForm";
import { useGoalsSection } from "@/hooks/budgets/useGoalsSection";

import type { BudgetTab } from "@/components/budgets/BudgetTabs";

export default function BudgetsPage() {
  const { t } = useTranslation();
  const [mobileSection, setMobileSection] = useState<BudgetTab>("periods");

  const {
    user,
    budgets,
    budgetsLoading,
    selectedBudgetId,
    setSelectedBudgetId,
    selectedBudget,
    budgetSummary,
    summaryLoading,
    incomeEntries,
    incomeLoading,
    personalCategories,
    errorMessage,
    setErrorMessage,
    successMessage,
    setSuccessMessage,
    refreshBudgetArea,
    recalculateBudgetMutation,
    closeBudgetMutation,
    runDueRolloversMutation,
    toggleGroupExpenseModeMutation,
  } = useBudgetsPage(t);

  const {
    budgetName,
    setBudgetName,
    budgetCurrency,
    setBudgetCurrency,
    periodType,
    setPeriodType,
    periodStart,
    setPeriodStart,
    periodEnd,
    setPeriodEnd,
    incomeTarget,
    setIncomeTarget,
    includeGroupExpenses,
    setIncludeGroupExpenses,
    createBudgetMutation,
    isCreateBudgetDisabled,
  } = useBudgetCreateForm(t, refreshBudgetArea, setSelectedBudgetId, setErrorMessage, setSuccessMessage);

  const {
    incomeTitle,
    setIncomeTitle,
    incomeAmount,
    setIncomeAmount,
    incomeDate,
    setIncomeDate,
    addIncomeMutation,
    deleteIncomeMutation,
    isAddIncomeDisabled,
  } = useIncomeForm(t, selectedBudget, refreshBudgetArea, setErrorMessage, setSuccessMessage);

  const {
    poolName,
    setPoolName,
    poolCategoryId,
    setPoolCategoryId,
    poolType,
    setPoolType,
    poolTarget,
    setPoolTarget,
    poolAlert,
    setPoolAlert,
    addPoolMutation,
    isAddPoolDisabled,
  } = usePoolForm(t, selectedBudget, refreshBudgetArea, setErrorMessage, setSuccessMessage);

  const {
    goalName,
    setGoalName,
    goalTarget,
    setGoalTarget,
    goalDeadline,
    setGoalDeadline,
    goalBudgetPoolId,
    setGoalBudgetPoolId,
    goalAutoAllocateAmount,
    setGoalAutoAllocateAmount,
    includeInactiveGoals,
    setIncludeInactiveGoals,
    goalAllocationAmounts,
    setGoalAllocationAmounts,
    expandedGoalHistoryId,
    setExpandedGoalHistoryId,
    editingGoalId,
    setEditingGoalId,
    goalEditDraft,
    setGoalEditDraft,
    savingsGoals,
    savingsGoalsLoading,
    expandedGoalProgress,
    expandedGoalProgressLoading,
    createGoalMutation,
    allocateGoalMutation,
    deleteGoalMutation,
    autoAllocateGoalsMutation,
    updateGoalMutation,
    toggleGoalActiveMutation,
    isCreateGoalDisabled,
  } = useGoalsSection(t, selectedBudgetId, refreshBudgetArea, setErrorMessage, setSuccessMessage);

  const selectedBudgetCurrency = selectedBudget?.currency ?? budgetCurrency;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
        >
          <div>
            <div className="flex max-w-full flex-wrap items-center justify-between gap-2">
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">
                {t("budgets.title")}
              </h1>
              <PageInfoButton pageKey="budgets" autoOpen={true} className="lg:hidden" />
            </div>
            <p className="mt-2 text-muted-foreground">{t("budgets.subtitle")}</p>
          </div>
          <PageInfoButton pageKey="budgets" autoOpen={true} className="hidden lg:inline-flex" />
        </motion.div>

        {errorMessage ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        ) : null}
        {successMessage ? (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="p-3 text-sm text-emerald-700">{successMessage}</CardContent>
          </Card>
        ) : null}
        <BudgetCreateForm
          budgetName={budgetName}
          setBudgetName={setBudgetName}
          budgetCurrency={budgetCurrency}
          setBudgetCurrency={setBudgetCurrency}
          periodType={periodType}
          setPeriodType={setPeriodType}
          periodStart={periodStart}
          setPeriodStart={setPeriodStart}
          periodEnd={periodEnd}
          setPeriodEnd={setPeriodEnd}
          incomeTarget={incomeTarget}
          setIncomeTarget={setIncomeTarget}
          includeGroupExpenses={includeGroupExpenses}
          setIncludeGroupExpenses={setIncludeGroupExpenses}
          createBudgetMutation={createBudgetMutation}
          isCreateBudgetDisabled={isCreateBudgetDisabled}
        />

        <div className="space-y-4">
          <BudgetTabs mobileSection={mobileSection} setMobileSection={setMobileSection} />

          <BudgetPeriodsSection
            mobileSection={mobileSection}
            selectedBudget={selectedBudget}
            selectedBudgetId={selectedBudgetId}
            setSelectedBudgetId={setSelectedBudgetId}
            budgets={budgets}
            budgetsLoading={budgetsLoading}
            user={user}
            recalculateBudgetMutation={recalculateBudgetMutation}
            autoAllocateGoalsMutation={autoAllocateGoalsMutation}
            toggleGroupExpenseModeMutation={toggleGroupExpenseModeMutation}
            closeBudgetMutation={closeBudgetMutation}
            runDueRolloversMutation={runDueRolloversMutation}
          />

          <BudgetIncomeSection
            mobileSection={mobileSection}
            selectedBudget={selectedBudget}
            incomeEntries={incomeEntries}
            incomeLoading={incomeLoading}
            incomeTitle={incomeTitle}
            setIncomeTitle={setIncomeTitle}
            incomeAmount={incomeAmount}
            setIncomeAmount={setIncomeAmount}
            incomeDate={incomeDate}
            setIncomeDate={setIncomeDate}
            addIncomeMutation={addIncomeMutation}
            deleteIncomeMutation={deleteIncomeMutation}
            isAddIncomeDisabled={isAddIncomeDisabled}
          />

          <BudgetPoolsSection
            mobileSection={mobileSection}
            selectedBudget={selectedBudget}
            budgetSummary={budgetSummary}
            summaryLoading={summaryLoading}
            personalCategories={personalCategories}
            poolName={poolName}
            setPoolName={setPoolName}
            poolCategoryId={poolCategoryId}
            setPoolCategoryId={setPoolCategoryId}
            poolType={poolType}
            setPoolType={setPoolType}
            poolTarget={poolTarget}
            setPoolTarget={setPoolTarget}
            poolAlert={poolAlert}
            setPoolAlert={setPoolAlert}
            addPoolMutation={addPoolMutation}
            isAddPoolDisabled={isAddPoolDisabled}
          />

          <BudgetGoalsSection
            mobileSection={mobileSection}
            selectedBudget={selectedBudget}
            selectedBudgetCurrency={selectedBudgetCurrency}
            goalName={goalName}
            setGoalName={setGoalName}
            goalTarget={goalTarget}
            setGoalTarget={setGoalTarget}
            goalDeadline={goalDeadline}
            setGoalDeadline={setGoalDeadline}
            goalBudgetPoolId={goalBudgetPoolId}
            setGoalBudgetPoolId={setGoalBudgetPoolId}
            goalAutoAllocateAmount={goalAutoAllocateAmount}
            setGoalAutoAllocateAmount={setGoalAutoAllocateAmount}
            includeInactiveGoals={includeInactiveGoals}
            setIncludeInactiveGoals={setIncludeInactiveGoals}
            goalAllocationAmounts={goalAllocationAmounts}
            setGoalAllocationAmounts={setGoalAllocationAmounts}
            expandedGoalHistoryId={expandedGoalHistoryId}
            setExpandedGoalHistoryId={setExpandedGoalHistoryId}
            editingGoalId={editingGoalId}
            setEditingGoalId={setEditingGoalId}
            goalEditDraft={goalEditDraft}
            setGoalEditDraft={setGoalEditDraft}
            savingsGoals={savingsGoals}
            savingsGoalsLoading={savingsGoalsLoading}
            expandedGoalProgress={expandedGoalProgress}
            expandedGoalProgressLoading={expandedGoalProgressLoading}
            createGoalMutation={createGoalMutation}
            allocateGoalMutation={allocateGoalMutation}
            deleteGoalMutation={deleteGoalMutation}
            updateGoalMutation={updateGoalMutation}
            toggleGoalActiveMutation={toggleGoalActiveMutation}
            isCreateGoalDisabled={isCreateGoalDisabled}
          />
        </div>
      </div>
    </div>
  );
}
