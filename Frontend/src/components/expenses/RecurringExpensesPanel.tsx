import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Repeat2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";

import type { ApiRecurringExpenseResponse } from "@/types/expense";
import type { CurrencyEnum, RecurrenceFrequency, RecurringExpenseStatus } from "@/types/enums";

type RecurringExpensesPanelProps = {
  items: ApiRecurringExpenseResponse[];
  isLoading: boolean;
  error: Error | null;
  activeCount: number;
  onEdit: (series: ApiRecurringExpenseResponse) => void;
};

export default function RecurringExpensesPanel({
  items,
  isLoading,
  error,
  activeCount,
  onEdit,
}: RecurringExpensesPanelProps) {
  const { t } = useTranslation();

  const mapRecurringStatusLabel = (status: RecurringExpenseStatus) => {
    if (status === "active") return t("recurringExpenses.statusActive");
    if (status === "paused") return t("recurringExpenses.statusPaused");
    if (status === "ended") return t("recurringExpenses.statusEnded");
    return t("recurringExpenses.statusArchived");
  };

  const mapRecurringFrequencyLabel = (frequency: RecurrenceFrequency) => {
    if (frequency === "daily") return t("addExpenseDialog.recurringDaily");
    if (frequency === "weekly") return t("addExpenseDialog.recurringWeekly");
    if (frequency === "monthly") return t("addExpenseDialog.recurringMonthly");
    if (frequency === "quarterly") return t("addExpenseDialog.recurringQuarterly");
    return t("addExpenseDialog.recurringYearly");
  };

  return (
    <div className="p-1">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground hidden md:block">
          {t("globalHeader.navRecurring")}
        </h2>
        <p className="text-xs text-muted-foreground">
          {activeCount}/{items.length}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
          {error.message || t("common.somethingWentWrong")}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          {t("recurringExpenses.empty")}
        </p>
      ) : (
        <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
          {items.map((series) => (
            <div
              key={series.id}
              className="group overflow-hidden rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md"
            >
              <div className="flex items-start gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Repeat2 className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">{series.title}</p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("recurringExpenses.cardAmount")}: {formatCurrency(Number(series.amount), series.currency as CurrencyEnum)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("recurringExpenses.cardFrequency")}: {mapRecurringFrequencyLabel(series.frequency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("recurringExpenses.cardInterval", { count: series.interval_count })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("recurringExpenses.cardStatus")}: {mapRecurringStatusLabel(series.status)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("recurringExpenses.nextDue")}: {series.next_due_on}
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 h-7 px-2 text-[11px]"
                    onClick={() => onEdit(series)}
                  >
                    {t("recurringExpenses.editSeries")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
