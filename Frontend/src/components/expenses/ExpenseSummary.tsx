import { useTranslation } from "react-i18next";

type ExpenseSummaryProps = {
  totalLabel: string;
  count: number;
};

export default function ExpenseSummary({ totalLabel, count }: ExpenseSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4 md:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("personalExpensesPage.total")}
        </p>
        <p className="mt-1 text-xl font-bold text-foreground">{totalLabel || "0.00"}</p>
      </div>

      <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm p-4 md:p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("personalExpensesPage.expenseCount")}
        </p>
        <p className="mt-1 text-xl font-bold text-foreground">{count}</p>
      </div>
    </div>
  );
}
