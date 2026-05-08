import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import type {
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseUpdate,
} from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import { type CurrencyEnum } from "@/types/enums";
import { getDefaultCategoryId } from "@/utils/category";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import CategoryPicker from "./CategoryPicker";
import type { CategorySection } from "@/types/enums";
import DialogInfoButton from "@/components/help/DialogInfoButton";

type EditExpenseDialogProps = {
  open: boolean;
  expense: ApiPersonalExpenseResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiPersonalExpenseUpdate) => void;
  onCreateCustomCategory?: (payload: { name: string; section: CategorySection }) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
  isLoading?: boolean;
  categories: ApiCategoryResponse[];
};

type FormData = {
  title: string;
  amount: string;
  currency: CurrencyEnum;
  category_id: number;
  expense_date: string;
  notes: string;
};

export default function EditExpenseDialog({
  open,
  expense,
  onOpenChange,
  onSubmit,
  onCreateCustomCategory,
  onDeleteCustomCategory,
  isLoading,
  categories,
}: EditExpenseDialogProps) {
  const { t } = useTranslation();
  const defaultCategoryId = getDefaultCategoryId(categories);

  const [formData, setFormData] = useState<FormData>({
    title: "",
    amount: "",
    currency: "PLN",
    category_id: defaultCategoryId,
    expense_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  useEffect(() => {
    if (!open || !expense) {
      return;
    }

    setFormData({
      title: expense.title ?? "",
      amount: expense.amount?.toString() ?? "",
      currency: (expense.currency ?? "PLN") as CurrencyEnum,
      category_id: expense.category_id ?? defaultCategoryId,
      expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
      notes: expense.notes ?? "",
    });
  }, [open, expense, defaultCategoryId]);

  const handleCurrencyChange = (value: CurrencyEnum) => {
    setFormData((prev) => ({ ...prev, currency: value }));
  };

  const handleSubmit = () => {
    if (!expense || !formData.title || !formData.amount) {
      return;
    }


    onSubmit({
      title: formData.title,
      amount: formData.amount,
      currency: formData.currency,
      category_id: formData.category_id,
      expense_date: formData.expense_date,
      notes: formData.notes || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("expensesList.editExpenseTitle", { defaultValue: "Edit expense" })}</DialogTitle>
            <DialogInfoButton dialogKey="editExpense" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-title">{t("addExpenseDialog.titleLabel")}</Label>
              <span className="text-xs text-muted-foreground">{formData.title.length}/100</span>
            </div>
            <Input
              id="edit-title"
              placeholder={t("addExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-amount">{t("addExpenseDialog.amount")}</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                placeholder={t("addExpenseDialog.amountPlaceholder")}
                value={formData.amount}
                onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-currency">{t("addExpenseDialog.currency")}</Label>
              <CurrencyPicker
                id="edit-currency"
                selectedCurrency={formData.currency}
                onCurrencyChange={handleCurrencyChange}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-category">{t("addExpenseDialog.category")}</Label>
            <CategoryPicker
              value={formData.category_id.toString()}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  category_id: parseInt(value, 10),
                }))
              }
              categories={categories}
              onCreateCustomCategory={onCreateCustomCategory}
              onDeleteCustomCategory={onDeleteCustomCategory}
              trigger="button"
              showLabel={false}
              mobileInset={false}
              showSelectedGroupPrefix
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-expense-date">{t("addExpenseDialog.date")}</Label>
            <DatePicker
              id="edit-expense-date"
              value={formData.expense_date}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  expense_date: value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-notes">{t("addExpenseDialog.notes")}</Label>
              <span className="text-xs text-muted-foreground">{formData.notes.length}/500</span>
            </div>
            <Textarea
              id="edit-notes"
              placeholder={t("addExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addExpenseDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!expense || !formData.title || !formData.amount || isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("expensesList.save", { defaultValue: "Save changes" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
