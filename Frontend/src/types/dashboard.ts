import type { Expense } from "./expense";
import type { Group } from "./group";

export interface CategorySpending {
  category: string;
  total: number;
}

export interface DashboardSummaryResponse {
  statistics: {
    total_owed: number;
    total_receivable: number;
    personal_spending: number;
    active_groups: number;
  };

  recent_expenses: Expense[];
  category_spending: CategorySpending[];
  group_list: Group[];

  // dict in Python → record in TS
  group_balances: Record<string, number>;
}
