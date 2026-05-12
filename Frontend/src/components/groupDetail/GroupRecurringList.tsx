import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Repeat2 } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";
import type { ApiRecurringExpenseResponse } from "@/types";

interface GroupRecurringListProps {
  recurringExpenses: ApiRecurringExpenseResponse[];
  recurringLoading: boolean;
  recurringError: Error | null;
  mapFrequencyLabel: (frequency: ApiRecurringExpenseResponse["frequency"]) => string;
  mapStatusLabel: (status: ApiRecurringExpenseResponse["status"]) => string;
  formatDate: (dateValue: string) => string;
  onEdit: (series: ApiRecurringExpenseResponse) => void;
}

export default function GroupRecurringList({
  recurringExpenses,
  recurringLoading,
  recurringError,
  mapFrequencyLabel,
  mapStatusLabel,
  formatDate,
  onEdit,
}: GroupRecurringListProps) {
  const { t } = useTranslation();

  if (recurringLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (recurringError) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
        {(recurringError as Error).message || t("common.somethingWentWrong")}
      </p>
    );
  }

  if (recurringExpenses.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        {t("recurringExpenses.empty")}
      </p>
    );
  }

  return (
    <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
      {recurringExpenses.map((series) => (
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
                {t("recurringExpenses.cardFrequency")}: {mapFrequencyLabel(series.frequency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("recurringExpenses.cardInterval", { count: series.interval_count })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("recurringExpenses.cardStatus")}: {mapStatusLabel(series.status)}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("recurringExpenses.nextDue")}: {formatDate(series.next_due_on)}
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
  );
}
