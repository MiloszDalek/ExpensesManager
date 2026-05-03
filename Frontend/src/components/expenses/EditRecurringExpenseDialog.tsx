import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import DialogInfoButton from "@/components/help/DialogInfoButton";

import type { ApiCategoryResponse } from "@/types/category";
import type {
  ApiRecurringExpenseResponse,
  ApiRecurringExpenseUpdate,
} from "@/types/expense";
import type {
  CategorySection,
  CurrencyEnum,
  RecurrenceFrequency,
} from "@/types/enums";

type EditRecurringExpenseDialogProps = {
  open: boolean;
  recurringExpense: ApiRecurringExpenseResponse | null;
  categories: ApiCategoryResponse[];
  isSaving?: boolean;
  isActionPending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiRecurringExpenseUpdate) => void;
  onGenerateNow: () => void;
  onPause: () => void;
  onResume: () => void;
  onArchive: () => void;
  onCreateCustomCategory?: (payload: { name: string; section: CategorySection }) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
};

type FormData = {
  title: string;
  amount: string;
  currency: CurrencyEnum;
  category_id: string;
  frequency: RecurrenceFrequency;
  interval_count: string;
  starts_on: string;
  ends_on: string;
  notes: string;
};

const DEFAULT_FORM_DATA: FormData = {
  title: "",
  amount: "",
  currency: "PLN",
  category_id: "",
  frequency: "monthly",
  interval_count: "1",
  starts_on: "",
  ends_on: "",
  notes: "",
};

export default function EditRecurringExpenseDialog({
  open,
  recurringExpense,
  categories,
  isSaving,
  isActionPending,
  onOpenChange,
  onSubmit,
  onGenerateNow,
  onPause,
  onResume,
  onArchive,
  onCreateCustomCategory,
  onDeleteCustomCategory,
}: EditRecurringExpenseDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);

  useEffect(() => {
    if (!open || !recurringExpense) {
      return;
    }

    setFormData({
      title: recurringExpense.title,
      amount: recurringExpense.amount.toString(),
      currency: recurringExpense.currency,
      category_id: recurringExpense.category_id.toString(),
      frequency: recurringExpense.frequency,
      interval_count: recurringExpense.interval_count.toString(),
      starts_on: recurringExpense.starts_on,
      ends_on: recurringExpense.ends_on ?? "",
      notes: recurringExpense.notes ?? "",
    });
  }, [open, recurringExpense]);

  const handleSubmit = () => {
    if (!recurringExpense) {
      return;
    }

    const parsedCategoryId = Number(formData.category_id);
    const parsedInterval = Number(formData.interval_count);

    if (!formData.title.trim() || !formData.amount || !parsedCategoryId || parsedInterval <= 0) {
      return;
    }

    onSubmit({
      title: formData.title.trim(),
      amount: formData.amount,
      currency: formData.currency,
      category_id: parsedCategoryId,
      frequency: formData.frequency,
      interval_count: parsedInterval,
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
              {t("recurringExpenses.editDialogTitle", { defaultValue: "Edit recurring series" })}
            </DialogTitle>
            <DialogInfoButton dialogKey="editRecurringExpense" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="recurring-edit-title">{t("addExpenseDialog.titleLabel")}</Label>
            <Input
              id="recurring-edit-title"
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
              <Label htmlFor="recurring-edit-amount">{t("addExpenseDialog.amount")}</Label>
              <Input
                id="recurring-edit-amount"
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
              <Label htmlFor="recurring-edit-currency">{t("addExpenseDialog.currency")}</Label>
              <Input
                id="recurring-edit-currency"
                value={formData.currency}
                disabled
                readOnly
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="recurring-edit-category">{t("addExpenseDialog.category")}</Label>
            <CategoryPicker
              value={formData.category_id}
              onValueChange={(value) =>
                setFormData((previous) => ({
                  ...previous,
                  category_id: value,
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
              <Label htmlFor="recurring-edit-frequency">
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
                <SelectTrigger id="recurring-edit-frequency" className="w-full">
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
              <Label htmlFor="recurring-edit-interval">
                {t("addExpenseDialog.recurringInterval", { defaultValue: "Every N periods" })}
              </Label>
              <Input
                id="recurring-edit-interval"
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
              <Label htmlFor="recurring-edit-starts-on">{t("recurringExpenses.startsOn", { defaultValue: "Starts on" })}</Label>
              <DatePicker
                id="recurring-edit-starts-on"
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
              <Label htmlFor="recurring-edit-ends-on">{t("addExpenseDialog.recurringEndsOn", { defaultValue: "End date (optional)" })}</Label>
              <DatePicker
                id="recurring-edit-ends-on"
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
            <Label htmlFor="recurring-edit-notes">{t("addExpenseDialog.notes")}</Label>
            <Textarea
              id="recurring-edit-notes"
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

          <div className="rounded-md border border-border p-3">
            <p className="mb-2 text-sm font-medium text-foreground">
              {t("recurringExpenses.actionsTitle", { defaultValue: "Series actions" })}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onGenerateNow} disabled={isActionPending}>
                {t("recurringExpenses.generateNow", { defaultValue: "Generate now" })}
              </Button>

              {recurringExpense?.status === "active" ? (
                <Button size="sm" variant="outline" onClick={onPause} disabled={isActionPending}>
                  {t("recurringExpenses.pause", { defaultValue: "Pause" })}
                </Button>
              ) : null}

              {recurringExpense?.status === "paused" ? (
                <Button size="sm" variant="outline" onClick={onResume} disabled={isActionPending}>
                  {t("recurringExpenses.resume", { defaultValue: "Resume" })}
                </Button>
              ) : null}

              {recurringExpense?.status !== "archived" ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isActionPending}>
                      {t("recurringExpenses.archive", { defaultValue: "Archive" })}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("recurringExpenses.archiveWarningTitle", {
                          defaultValue: "Archive this recurring series?",
                        })}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("recurringExpenses.archiveWarningDescription", {
                          defaultValue:
                            "Archived recurring series stay in the system, but they are treated as no longer active. Make sure you want to archive this series.",
                        })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {t("recurringExpenses.archiveCancel", { defaultValue: "Keep series" })}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={onArchive}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("recurringExpenses.archiveConfirm", { defaultValue: "Archive now" })}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addExpenseDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !recurringExpense ||
              !formData.title.trim() ||
              !formData.amount ||
              !formData.category_id ||
              !formData.interval_count ||
              !formData.starts_on ||
              isSaving
            }
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("recurringExpenses.saveChanges", { defaultValue: "Save changes" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
