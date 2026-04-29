import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import { getDefaultCategoryId } from "@/utils/category";
import DialogInfoButton from "@/components/help/DialogInfoButton";

import type { ApiCategoryResponse } from "@/types/category";
import type { ApiRecurringPersonalExpenseCreate } from "@/types/expense";
import type { CategorySection, CurrencyEnum, RecurrenceFrequency } from "@/types/enums";
import { SUPPORTED_CURRENCIES } from "@/types/enums";

type AddRecurringExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiRecurringPersonalExpenseCreate) => void;
  categories: ApiCategoryResponse[];
  isLoading?: boolean;
  onCreateCustomCategory?: (payload: { name: string; section: CategorySection }) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
};

type FormData = {
  title: string;
  amount: string;
  currency: CurrencyEnum;
  category_id: number;
  frequency: RecurrenceFrequency;
  interval_count: string;
  starts_on: string;
  ends_on: string;
  notes: string;
};

const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

const buildInitialFormData = (defaultCategoryId: number): FormData => ({
  title: "",
  amount: "",
  currency: "PLN",
  category_id: defaultCategoryId,
  frequency: "monthly",
  interval_count: "1",
  starts_on: toDateInput(new Date()),
  ends_on: "",
  notes: "",
});

export default function AddRecurringExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  categories,
  isLoading,
  onCreateCustomCategory,
  onDeleteCustomCategory,
}: AddRecurringExpenseDialogProps) {
  const { t } = useTranslation();
  const defaultCategoryId = getDefaultCategoryId(categories);

  const [formData, setFormData] = useState<FormData>(() => buildInitialFormData(defaultCategoryId));

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(buildInitialFormData(defaultCategoryId));
  }, [open, defaultCategoryId]);

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

  const handleSubmit = () => {
    const parsedInterval = Number.parseInt(formData.interval_count || "1", 10);
    const normalizedInterval = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 1;

    if (!formData.title.trim() || !formData.amount || !formData.category_id || !formData.starts_on) {
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      amount: formData.amount,
      currency: formData.currency,
      category_id: formData.category_id,
      frequency: formData.frequency,
      interval_count: normalizedInterval,
      starts_on: formData.starts_on,
      ends_on: formData.ends_on || null,
      notes: formData.notes.trim() ? formData.notes.trim() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>
              {t("addRecurringExpenseDialog.title", { defaultValue: "Add recurring expense" })}
            </DialogTitle>
            <DialogInfoButton dialogKey="addRecurringExpense" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="recurring-create-title">{t("addExpenseDialog.titleLabel")}</Label>
            <Input
              id="recurring-create-title"
              value={formData.title}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="recurring-create-amount">{t("addExpenseDialog.amount")}</Label>
              <Input
                id="recurring-create-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    amount: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="recurring-create-currency">{t("addExpenseDialog.currency")}</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    currency: value as CurrencyEnum,
                  }))
                }
              >
                <SelectTrigger id="recurring-create-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recurring-create-category">{t("addExpenseDialog.category")}</Label>
            <CategoryPicker
              value={String(formData.category_id)}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  category_id: Number(value),
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="recurring-create-frequency">
                {t("addExpenseDialog.recurringFrequency", { defaultValue: "Frequency" })}
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    frequency: value as RecurrenceFrequency,
                  }))
                }
              >
                <SelectTrigger id="recurring-create-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("addExpenseDialog.recurringDaily", { defaultValue: "Daily" })}</SelectItem>
                  <SelectItem value="weekly">{t("addExpenseDialog.recurringWeekly", { defaultValue: "Weekly" })}</SelectItem>
                  <SelectItem value="monthly">{t("addExpenseDialog.recurringMonthly", { defaultValue: "Monthly" })}</SelectItem>
                  <SelectItem value="quarterly">{t("addExpenseDialog.recurringQuarterly", { defaultValue: "Quarterly" })}</SelectItem>
                  <SelectItem value="yearly">{t("addExpenseDialog.recurringYearly", { defaultValue: "Yearly" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="recurring-create-interval">
                {t("addExpenseDialog.recurringInterval", { defaultValue: "Every N periods" })}
              </Label>
              <Input
                id="recurring-create-interval"
                type="number"
                min="1"
                step="1"
                value={formData.interval_count}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    interval_count: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="recurring-create-starts-on">{t("recurringExpenses.startsOn", { defaultValue: "Starts on" })}</Label>
              <DatePicker
                id="recurring-create-starts-on"
                value={formData.starts_on}
                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    starts_on: value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="recurring-create-ends-on">{t("addExpenseDialog.recurringEndsOn", { defaultValue: "End date (optional)" })}</Label>
              <DatePicker
                id="recurring-create-ends-on"
                value={formData.ends_on}
                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    ends_on: value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recurring-create-notes">{t("addExpenseDialog.notes")}</Label>
            <Textarea
              id="recurring-create-notes"
              rows={3}
              value={formData.notes}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  notes: event.target.value,
                }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addExpenseDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !formData.title.trim() ||
              !formData.amount ||
              !formData.category_id ||
              !formData.interval_count ||
              !formData.starts_on ||
              isLoading
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading
              ? t("addRecurringExpenseDialog.submitting", { defaultValue: "Adding..." })
              : t("addRecurringExpenseDialog.submit", { defaultValue: "Add recurring" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
