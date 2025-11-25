import { categoryIcons } from "./categoryIcons";
import type { ExpenseShare } from "./expenseShare";

export interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string; // lub Date, zależnie od backendu
  category: keyof typeof categoryIcons;
  paid_by: string;
  is_personal?: boolean;
  splits?: ExpenseShare[];
}