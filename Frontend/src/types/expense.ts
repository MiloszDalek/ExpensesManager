import { categoryIcons } from "./categoryIcons";
import type { ExpenseShare } from "./expenseShare";

export interface Expense {
  id: number;
  group_id: number | null;
  payer_id: number;
  title: string;
  amount: number;
  is_personal: boolean;
  currency: string;
  category: string | null;
  created_at: string;
  receipt_image_url: string | null;
  receipt_text: string | null;

  // FRONTEND-ONLY FIELDS:
  payer_name?: string;
  category_icon?: keyof typeof categoryIcons;
  shares?: ExpenseShare[];
}