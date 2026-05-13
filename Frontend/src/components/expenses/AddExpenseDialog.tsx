import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import type { ApiPersonalExpenseCreate } from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import {
  type CurrencyEnum,
} from "@/types/enums";
import { getDefaultCategoryId } from "@/utils/category";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import CategoryPicker from "./CategoryPicker";
import type { CategorySection } from "@/types/enums";
import DialogInfoButton from "@/components/help/DialogInfoButton";

// TODO: Po dodaniu icon_key w API, umożliwić wybór ikony przy tworzeniu kategorii

type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: ApiPersonalExpenseCreate) => void;
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

export default function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  onCreateCustomCategory,
  onDeleteCustomCategory,
  isLoading,
  categories
}: AddExpenseDialogProps) {
  const { t } = useTranslation();
  const defaultCategoryId = getDefaultCategoryId(categories);

  useEffect(() => {
    if (!open || categories.length === 0) {
      return;
    }

    setFormData((previous) => {
      const hasCurrentCategory = categories.some((category) => category.id === previous.category_id);

      if (hasCurrentCategory && previous.category_id !== 0) {
        return previous;
      }

      return {
        ...previous,
        category_id: defaultCategoryId,
      };
    });
  }, [open, categories, defaultCategoryId]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    currency: 'PLN',
    category_id: defaultCategoryId,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleCurrencyChange = (value: CurrencyEnum) => {
    setFormData((prev) => ({
      ...prev,
      currency: value,
    }));
  };

  const handleSubmit = () => {
    if (formData.title && formData.amount) {

      onSubmit({
        title: formData.title,
        amount: formData.amount,
        currency: formData.currency,
        category_id: formData.category_id,
        expense_date: formData.expense_date,
        notes: formData.notes || null,
        receipt_image_url: null,
        receipt_text: null,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_interval: null,
        recurrence_ends_on: null,
      });

      onOpenChange(false);

      setFormData({
        title: '',
        amount: '',
        currency: 'PLN',
        category_id: defaultCategoryId,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dialog-scrollbar sm:max-w-md max-h-[calc(100vh-2rem)] p-4 sm:p-6 [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("addExpenseDialog.title")}</DialogTitle>
            <DialogInfoButton dialogKey="addExpense" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">{t("addExpenseDialog.titleLabel")}</Label>
              <span className="text-xs text-muted-foreground">{formData.title.length}/100</span>
            </div>
            <Input
              id="title"
              placeholder={t("addExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="amount">{t("addExpenseDialog.amount")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder={t("addExpenseDialog.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency">{t("addExpenseDialog.currency")}</Label>
              <CurrencyPicker
                id="currency"
                selectedCurrency={formData.currency}
                onCurrencyChange={handleCurrencyChange}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">{t("addExpenseDialog.category")}</Label>
            <CategoryPicker
              value={formData.category_id.toString()}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                category_id: parseInt(value, 10)
              }))}
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
            <Label htmlFor="expense_date">{t("addExpenseDialog.date")}</Label>
            <DatePicker
              id="expense_date"
              value={formData.expense_date}
              onChange={(value) => setFormData((prev) => ({ ...prev, expense_date: value }))}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">{t("addExpenseDialog.notes")}</Label>
              <span className="text-xs text-muted-foreground">{formData.notes.length}/500</span>
            </div>
            <Textarea
              id="notes"
              placeholder={t("addExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
            disabled={!formData.title || !formData.amount || isLoading}
          >
            {t("addExpenseDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}