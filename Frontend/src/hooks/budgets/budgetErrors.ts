import type { TFunction } from "i18next";

const BUDGET_ERROR_TRANSLATIONS: Record<string, string> = {
  "period_start cannot be greater than period_end": "budgets.errors.periodRangeInvalid",
  "Weekly budget period must have exactly 7 days": "budgets.errors.weeklyPeriodMustBeSevenDays",
  "Monthly budget period must start on first day of month": "budgets.errors.monthlyStartInvalid",
  "Monthly budget period must end on last day of month": "budgets.errors.monthlyEndInvalid",
  "income_target must be greater than 0": "budgets.errors.incomeTargetInvalid",
  "Budget period overlaps with existing active budget": "budgets.errors.periodOverlap",
  "Budget requires at least one pool": "budgets.errors.poolRequired",
  "Pool target value must be greater than 0": "budgets.errors.poolTargetInvalid",
  "Pool alert threshold must be in range (0, 100]": "budgets.errors.poolAlertRangeInvalid",
  "Percent pool target cannot be greater than 100": "budgets.errors.poolPercentRangeInvalid",
  "Percent pools total cannot exceed 100": "budgets.errors.poolPercentTotalInvalid",
  "Fixed pools total cannot exceed income_target": "budgets.errors.poolFixedTotalTooHigh",
  "No available personal categories for budget template": "budgets.errors.noCategoriesForTemplate",
  "Budget not found": "budgets.errors.budgetNotFound",
  "Budget pool not found": "budgets.errors.poolNotFound",
  "Amount must be greater than 0": "budgets.errors.amountInvalid",
  "date_from cannot be greater than date_to": "budgets.errors.dateRangeInvalid",
  "Income entry not found": "budgets.errors.incomeNotFound",
  "Category not found": "budgets.errors.categoryNotFound",
  "Not a personal category": "budgets.errors.categoryNotPersonal",
  "target_amount must be greater than 0": "budgets.errors.goalTargetInvalid",
  "auto_allocate_amount cannot be negative": "budgets.errors.goalAutoAllocateInvalid",
  "Savings goal not found": "budgets.errors.goalNotFound",
  "Insufficient remaining amount in selected budget pool": "budgets.errors.goalPoolBalanceInsufficient",
  "Budget period has not ended yet": "budgets.errors.budgetPeriodNotEnded",
  "Budget rollover already executed": "budgets.errors.rolloverAlreadyExecuted",
  "Next budget period overlaps with existing active budget": "budgets.errors.rolloverPeriodOverlap",
  "Not authorized": "budgets.errors.notAuthorized",
};

export function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "";
}

export function localizeBudgetError(message: string, t: TFunction): string {
  const normalizedMessage = message.trim().replace(/\.$/, "");
  const key = BUDGET_ERROR_TRANSLATIONS[normalizedMessage];
  if (key) {
    return t(key);
  }
  return normalizedMessage || t("budgets.errors.generic");
}
