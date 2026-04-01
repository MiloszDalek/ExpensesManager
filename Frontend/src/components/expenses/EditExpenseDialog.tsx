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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { format } from "date-fns";
import type {
  ApiPersonalExpenseResponse,
  ApiPersonalExpenseUpdate,
} from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import {
  getCurrenciesWithRecentFirst,
  getRecentCurrencies,
  rememberRecentCurrency,
  removeRecentCurrency,
} from "@/utils/currency";
import CategoryPicker from "./CategoryPicker";

type EditExpenseDialogProps = {
  open: boolean;
  expense: ApiPersonalExpenseResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiPersonalExpenseUpdate) => void;
  onCreateCustomCategory?: (name: string) => Promise<ApiCategoryResponse>;
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
  const defaultCategoryId = categories[0]?.id || 0;
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);

  useEffect(() => {
    if (open) {
      setRecentCurrencies(getRecentCurrencies());
    }
  }, [open]);

  const orderedCurrencies = getCurrenciesWithRecentFirst(recentCurrencies);
  const recentCurrencySet = new Set(recentCurrencies);

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

  const handleCurrencyChange = (value: string) => {
    setFormData((prev) => ({ ...prev, currency: value as CurrencyEnum }));
    setRecentCurrencies(rememberRecentCurrency(value as CurrencyEnum));
  };

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));
  };

  const handleSubmit = () => {
    if (!expense || !formData.title || !formData.amount) {
      return;
    }

    setRecentCurrencies(rememberRecentCurrency(formData.currency));

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
          <DialogTitle>{t("expensesList.editExpenseTitle", { defaultValue: "Edit expense" })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-title">{t("addExpenseDialog.titleLabel")}</Label>
            <Input
              id="edit-title"
              placeholder={t("addExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
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
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger id="edit-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recentCurrencies.length > 0 && (
                    <>
                      <SelectGroup>
                        <SelectLabel>{t("addExpenseDialog.recentCurrencies")}</SelectLabel>
                        {orderedCurrencies
                          .filter((currency) => recentCurrencySet.has(currency))
                          .map((currency) => (
                            <SelectItem key={`recent-${currency}`} value={currency} className="group pr-12">
                              <span>{currency}</span>
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={t("addExpenseDialog.removeRecentCurrency")}
                                className="ml-auto mr-4 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100 cursor-pointer"
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onPointerUp={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleRemoveRecentCurrency(currency);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                      <SelectSeparator />
                    </>
                  )}

                  <SelectGroup>
                    {recentCurrencies.length > 0 && (
                      <SelectLabel>{t("addExpenseDialog.allCurrencies")}</SelectLabel>
                    )}
                    {SUPPORTED_CURRENCIES
                      .filter((currency) => !recentCurrencySet.has(currency))
                      .map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
            <Input
              id="edit-expense-date"
              type="date"
              value={formData.expense_date}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  expense_date: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-notes">{t("addExpenseDialog.notes")}</Label>
            <Textarea
              id="edit-notes"
              placeholder={t("addExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              rows={2}
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
