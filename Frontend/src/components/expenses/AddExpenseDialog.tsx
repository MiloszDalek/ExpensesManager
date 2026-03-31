import { useEffect, useMemo, useState } from "react";
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
import type { ApiPersonalExpenseCreate } from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import {
  getCurrenciesWithRecentFirst,
  getRecentCurrencies,
  rememberRecentCurrency,
  removeRecentCurrency,
} from "@/utils/currency";
import CategoryPicker from "./CategoryPicker";

// TODO: Po dodaniu icon_key w API, umożliwić wybór ikony przy tworzeniu kategorii

type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: ApiPersonalExpenseCreate) => void;
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
  const defaultCategoryId = categories[0]?.id || 0;
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);

  useEffect(() => {
    if (open) {
      setRecentCurrencies(getRecentCurrencies());
    }
  }, [open]);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    currency: 'PLN',
    category_id: defaultCategoryId,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleSubmit = () => {
    if (formData.title && formData.amount) {
      setRecentCurrencies(rememberRecentCurrency(formData.currency));

      onSubmit({
        title: formData.title,
        amount: formData.amount,
        currency: formData.currency,
        category_id: formData.category_id,
        expense_date: formData.expense_date,
        notes: formData.notes || null,
      });
      
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

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addExpenseDialog.title")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">{t("addExpenseDialog.titleLabel")}</Label>
            <Input
              id="title"
              placeholder={t("addExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    currency: value as CurrencyEnum,
                  }))
                }
              >
                <SelectTrigger id="currency" className="w-full">
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
                                className="ml-auto mr-4 rounded p-0.5 text-gray-400 opacity-0 transition-opacity hover:text-red-600 focus:text-red-600 focus:opacity-100 group-hover:opacity-100"
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onClick={(event) => {
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
                    {SUPPORTED_CURRENCIES.filter((currency) => !recentCurrencySet.has(currency)).map((currency) => (
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
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">{t("addExpenseDialog.notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("addExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
            disabled={!formData.title || !formData.amount || isLoading}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            {t("addExpenseDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}