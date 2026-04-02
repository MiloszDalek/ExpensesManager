// import { categoryIcons } from "./categoryIcons";
// import type { ExpenseShare } from "./expenseShare";

// export interface Expense {
//   id: number;
//   group_id: number | null;
//   payer_id: number;
//   title: string;
//   amount: number;
//   is_personal: boolean;
//   currency: string;
//   category: string | null;
//   created_at: string;
//   receipt_image_url: string | null;
//   receipt_text: string | null;

//   // FRONTEND-ONLY FIELDS:
//   payer_name?: string;
//   category_icon?: keyof typeof categoryIcons;
//   shares?: ExpenseShare[];
// }

import type { DecimalLike, ISODateTimeString } from "./common";
import type { CurrencyEnum, SplitType } from "./enums";

export type PersonalExpenseSortBy = "expense_date" | "amount" | "created_at";
export type PersonalExpenseSortOrder = "asc" | "desc";
export type PersonalExpensePeriodPreset = "this_month" | "previous_month" | "custom";

export interface ApiPersonalExpenseListParams {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  category_id?: number;
  category_ids?: number[];
  currency?: CurrencyEnum;
  sort_by?: PersonalExpenseSortBy;
  sort_order?: PersonalExpenseSortOrder;
}

export interface PersonalExpensesFiltersState {
  category: string;
  currency: CurrencyEnum | "all";
  periodPreset: PersonalExpensePeriodPreset;
  dateFrom: string;
  dateTo: string;
  sortBy: PersonalExpenseSortBy;
  sortOrder: PersonalExpenseSortOrder;
}

export interface ApiExpenseShare {
  user_id: number;
  share_amount: DecimalLike;
}

export interface ApiPersonalExpenseCreate {
  title: string;
  amount: DecimalLike;
  currency?: CurrencyEnum;
  expense_date: ISODateTimeString;
  category_id: number;
  notes?: string | null;
  receipt_image_url?: string | null;
  receipt_text?: string | null;
}

export interface ApiPersonalExpenseUpdate {
  title?: string | null;
  amount?: DecimalLike | null;
  currency?: CurrencyEnum | null;
  expense_date?: ISODateTimeString | null;
  category_id?: number | null;
  notes?: string | null;
  receipt_image_url?: string | null;
  receipt_text?: string | null;
}

export interface ApiPersonalExpenseResponse extends ApiPersonalExpenseCreate {
  id: number;
  created_at: ISODateTimeString;
}

export interface ApiPersonalExpenseSummaryCurrency {
  currency: CurrencyEnum;
  total_amount: DecimalLike;
}

export interface ApiPersonalExpenseSummaryCategory {
  category_id: number;
  category_name: string;
  total_amount: DecimalLike;
}

export interface ApiPersonalExpenseSummaryResponse {
  total_count: number;
  totals_by_currency: ApiPersonalExpenseSummaryCurrency[];
  top_categories: ApiPersonalExpenseSummaryCategory[];
}

export interface ApiGroupExpenseCreate extends ApiPersonalExpenseCreate {
  split_type: SplitType;
  shares: ApiExpenseShare[];
}

export interface ApiGroupExpenseUpdate {
  title?: string | null;
  amount?: DecimalLike | null;
  currency?: CurrencyEnum | null;
  expense_date?: ISODateTimeString | null;
  category_id?: number | null;
  notes?: string | null;
  receipt_image_url?: string | null;
  receipt_text?: string | null;
  split_type?: SplitType | null;
  shares?: ApiExpenseShare[] | null;
}

export interface ApiGroupExpenseResponse extends ApiGroupExpenseCreate {
  id: number;
  user_id: number;
  created_at: ISODateTimeString;
}