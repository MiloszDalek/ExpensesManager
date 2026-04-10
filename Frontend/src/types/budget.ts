import type { DecimalLike, ISODateTimeString } from "./common";
import type { BudgetPeriodType, BudgetPoolType, BudgetStatus, CurrencyEnum } from "./enums";

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
}

export interface ApiBudgetPoolUpdate {
  name?: string | null;
  category_id?: number | null;
  pool_type?: BudgetPoolType | null;
  target_value?: DecimalLike | null;
  alert_threshold?: DecimalLike | null;
}

export interface ApiBudgetPoolResponse {
  id: number;
  budget_id: number;
  name: string;
  category_id: number;
  pool_type: BudgetPoolType;
  target_value: DecimalLike;
  alert_threshold: DecimalLike;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface ApiBudgetPlanCreate {
  name: string;
  currency?: CurrencyEnum;
  period_type: BudgetPeriodType;
  period_start: string;
  period_end: string;
  income_target?: DecimalLike | null;
  use_template_50_30_20?: boolean;
  pools?: ApiBudgetPoolCreate[];
}

export interface ApiBudgetPlanUpdate {
  name?: string | null;
  income_target?: DecimalLike | null;
  status?: BudgetStatus | null;
}

export interface ApiBudgetPlanResponse {
  id: number;
  user_id: number;
  name: string;
  currency: CurrencyEnum;
  period_type: BudgetPeriodType;
  period_start: string;
  period_end: string;
  income_target: DecimalLike | null;
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
  income_total: DecimalLike;
  spent_total: DecimalLike;
  saved_total: DecimalLike;
  savings_rate: number | null;
  pools: ApiBudgetPoolSummaryResponse[];
}
