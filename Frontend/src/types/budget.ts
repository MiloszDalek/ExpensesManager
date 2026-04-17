import type { DecimalLike, ISODateTimeString } from "./common";
import type {
  BudgetAllocationStrategy,
  BudgetPeriodType,
  BudgetPoolType,
  BudgetStatus,
  CurrencyEnum,
  OverspendingStrategy,
} from "./enums";

export interface ApiIncomeEntryCreate {
  title: string;
  source?: string | null;
  amount: DecimalLike;
  currency?: CurrencyEnum;
  income_date: ISODateTimeString;
  notes?: string | null;
}

export interface ApiIncomeEntryResponse extends ApiIncomeEntryCreate {
  id: number;
  user_id: number;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface ApiIncomeListParams {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  currency?: CurrencyEnum;
  sort_by?: "income_date" | "amount" | "created_at";
  sort_order?: "asc" | "desc";
}

export interface ApiIncomeSummaryCurrency {
  currency: CurrencyEnum;
  total_amount: DecimalLike;
}

export interface ApiIncomeSummaryResponse {
  totals_by_currency: ApiIncomeSummaryCurrency[];
}

export interface ApiBudgetPoolCreate {
  name: string;
  category_id: number;
  pool_type: BudgetPoolType;
  target_value: DecimalLike;
  alert_threshold?: DecimalLike;
  rollover_enabled?: boolean;
  rollover_negative_enabled?: boolean;
}

export interface ApiBudgetPoolUpdate {
  name?: string | null;
  category_id?: number | null;
  pool_type?: BudgetPoolType | null;
  target_value?: DecimalLike | null;
  alert_threshold?: DecimalLike | null;
  rollover_enabled?: boolean | null;
  rollover_negative_enabled?: boolean | null;
}

export interface ApiBudgetPoolResponse {
  id: number;
  budget_id: number;
  name: string;
  category_id: number;
  pool_type: BudgetPoolType;
  target_value: DecimalLike;
  alert_threshold: DecimalLike;
  allocated_amount: DecimalLike;
  spent_amount: DecimalLike;
  remaining_amount: DecimalLike;
  rollover_amount: DecimalLike;
  rollover_enabled: boolean;
  rollover_negative_enabled: boolean;
  last_recalculated_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface ApiBudgetPlanCreate {
  name: string;
  currency?: CurrencyEnum;
  period_type: BudgetPeriodType;
  allocation_strategy?: BudgetAllocationStrategy;
  period_start: string;
  period_end: string;
  income_target?: DecimalLike | null;
  include_group_expenses?: boolean;
  use_template_50_30_20?: boolean;
  pools?: ApiBudgetPoolCreate[];
}

export interface ApiBudgetPlanUpdate {
  name?: string | null;
  allocation_strategy?: BudgetAllocationStrategy | null;
  income_target?: DecimalLike | null;
  include_group_expenses?: boolean | null;
  status?: BudgetStatus | null;
}

export interface ApiBudgetPlanResponse {
  id: number;
  user_id: number;
  name: string;
  currency: CurrencyEnum;
  period_type: BudgetPeriodType;
  allocation_strategy: BudgetAllocationStrategy;
  period_start: string;
  period_end: string;
  income_target: DecimalLike | null;
  include_group_expenses: boolean;
  status: BudgetStatus;
  template_key: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  pools: ApiBudgetPoolResponse[];
}

export interface ApiBudgetPoolSummaryResponse {
  pool_id: number;
  pool_name: string;
  category_id: number;
  category_name: string;
  pool_type: BudgetPoolType;
  configured_value: DecimalLike;
  allocated_amount: DecimalLike;
  target_amount: DecimalLike;
  spent_amount: DecimalLike;
  remaining_amount: DecimalLike;
  utilization_percent: number | null;
  alert_threshold: DecimalLike;
  status: "on_track" | "warning" | "exceeded";
}

export interface ApiBudgetSummaryResponse {
  budget_id: number;
  period_start: string;
  period_end: string;
  currency: CurrencyEnum;
  include_group_expenses: boolean;
  income_total: DecimalLike;
  spent_total: DecimalLike;
  saved_total: DecimalLike;
  savings_rate: number | null;
  overspending_strategy: OverspendingStrategy;
  pools: ApiBudgetPoolSummaryResponse[];
}

export interface ApiBudgetRolloverExecutionResponse {
  from_budget_id: number;
  to_budget_id: number;
  rolled_pools_count: number;
  total_rollover_amount: DecimalLike;
  closed_at: string;
}

export interface ApiBudgetRolloverRunDueResponse {
  processed_budgets_count: number;
  created_budgets_count: number;
}
