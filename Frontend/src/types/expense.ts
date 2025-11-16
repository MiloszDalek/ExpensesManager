import { categoryIcons } from "./categoryIcons";

export interface ExpenseSplit {
  user_email: string;
  amount: number;
}

export interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string; // lub Date, zależnie od backendu
  category: keyof typeof categoryIcons;
  paid_by: string;
  is_personal?: boolean;
  splits?: ExpenseSplit[];
}