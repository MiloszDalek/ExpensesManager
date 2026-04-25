export const SUPPORTED_CURRENCIES = [
	"AED",
	"AUD",
	"CAD",
	"CHF",
	"CNY",
	"CZK",
	"DKK",
	"PLN",
	"EUR",
	"GBP",
	"HKD",
	"HUF",
	"ILS",
	"JPY",
	"NOK",
	"NZD",
	"RON",
	"SEK",
	"SGD",
	"TRY",
	"USD",
	"ZAR",
] as const;

export type CurrencyEnum = (typeof SUPPORTED_CURRENCIES)[number];
export type SplitType = "equal" | "percent" | "exact";

export type GroupStatus = "active" | "archived";
export type SystemUserRole = "user" | "admin";
export type GroupMemberRole = "admin" | "member";
export type GroupMemberStatus = "active" | "left";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled" | "archived";
export type InvitationType = "contact" | "group";

export type NotificationType =
	// Invitations
	| "invitation_received"
	| "invitation_accepted"
	| "invitation_rejected"
	// Budget alerts
	| "budget_near_limit"
	| "budget_exceeded"
	| "budget_reset"
	// Expenses
	| "new_expense_added"
	| "expense_updated"
	| "expense_deleted"
	// Recurring expenses
	| "recurring_due_soon"
	| "recurring_executed"
	| "recurring_failed"
	// Settlements
	| "settlement_pending"
	| "settlement_completed"
	| "settlement_failed"
	// Goals
	| "goal_progress"
	| "goal_completed"
	// Insights
	| "unusual_spending"
	| "high_spending_category"
	// Legacy support
	| "invitation"
	| "budget_overspending"
	| "upcoming_recurring_expense";

export type NotificationStatus = "unread" | "read" | "archived";

export type NotificationContextType =
	| "budget"
	| "expense"
	| "group"
	| "settlement"
	| "goal"
	| "recurring"
	| "invitation";

export type NotificationSeverity = "info" | "warning" | "urgent";

export type PaymentMethod = "cash" | "paypal" | "offset_applied" | "offset_forgiven";
export type SettlementStatus = "pending" | "pending_paypal" | "completed" | "failed";
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
export type RecurringExpenseStatus = "active" | "paused" | "ended" | "archived";
export type BudgetPeriodType = "weekly" | "monthly";
export type BudgetPoolType = "fixed_amount" | "percent_income";
export type BudgetStatus = "active" | "archived";
export type BudgetAllocationStrategy = "fixed" | "percent_income" | "zero_based";
export type OverspendingStrategy = "allow_negative" | "block" | "auto_reallocate";

export type CategorySection =
	| "food"
	| "transport"
	| "home"
	| "bills"
	| "lifestyle"
	| "health"
	| "finance"
	| "education"
	| "family"
	| "other";

