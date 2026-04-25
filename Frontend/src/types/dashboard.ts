import type { NotificationSeverity } from "./enums";

export type AggregationPeriod = "daily" | "weekly" | "monthly" | "yearly";
export type InsightType =
  | "budget_warning"
  | "budget_exceeded"
  | "spending_spike"
  | "high_category_usage"
  | "low_savings_rate"
  | "upcoming_payment"
  | "group_debt";

export interface PeriodComparison {
  income_change_percent: number | null;
  expenses_change_percent: number | null;
  savings_change_percent: number | null;
}

export interface KPISummary {
  total_income: number;
  total_expenses: number;
  total_savings: number;
  remaining_budget: number;
  overspend_flag: boolean;
  budget_id: number | null;
  budget_name: string | null;
  period_start: string | null;
  period_end: string | null;
  previous_period_comparison: PeriodComparison | null;
}

export interface AttentionItem {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: NotificationSeverity;
  action_url: string | null;
  priority: number;
  reference_id: number | null;
}

export interface TrendDataPoint {
  period: string;
  amount: number;
  label: string | null;
}

export interface TrendData {
  period_type: AggregationPeriod;
  data_points: TrendDataPoint[];
  total: number;
  average: number;
  currency: string;
}

export interface CategoryBreakdownItem {
  category_id: number;
  category_name: string;
  amount: number;
  percentage: number;
  budget_allocated: number | null;
  budget_remaining: number | null;
}

export interface CategoryBreakdown {
  items: CategoryBreakdownItem[];
  total: number;
  currency: string;
}

export interface BudgetPoolStatus {
  pool_id: number;
  category_id: number | null;
  category_name: string;
  pool_type: string;
  target_value: number;
  allocated: number;
  spent: number;
  remaining: number;
  usage_percentage: number | null;
  status: string;
  alert_threshold: number;
}

export interface BudgetStatus {
  budget_id: number;
  budget_name: string;
  pools: BudgetPoolStatus[];
  period_start: string;
  period_end: string;
  currency: string;
}

export interface SettlementSnapshot {
  total_owed_to_me: number;
  total_i_owe: number;
  net_balance: number;
  pending_settlements_count: number;
  currency: string;
}
