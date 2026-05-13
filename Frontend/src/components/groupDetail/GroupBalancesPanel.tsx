import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";
import type { BalanceRow, UserBalanceSummary } from "@/types";

interface GroupBalancesPanelProps {
  userBalanceSummary: UserBalanceSummary;
  balanceRows: BalanceRow[];
  groupSettlementFeedback: { tone: "success" | "error" | "info"; message: string } | null;
  balancesLoading: boolean;
  balancesError: Error | null;
  currency: string;
  onSettle: (target: { userId: number; memberName: string; absoluteAmount: number }) => void;
}

export default function GroupBalancesPanel({
  userBalanceSummary,
  balanceRows,
  groupSettlementFeedback,
  balancesLoading,
  balancesError,
  currency,
  onSettle,
}: GroupBalancesPanelProps) {
  const { t } = useTranslation();

  if (balancesLoading) {
    return <p className="text-sm text-muted-foreground">{t("groupDetailPage.balanceSummaryLoading")}</p>;
  }

  if (balancesError) {
    return <p className="text-sm text-destructive">{t("groupDetailPage.balanceSummaryError")}</p>;
  }

  return (
    <>
      <div
        className={`mb-4 rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur-sm ${
          userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
            ? "border-rose-200 bg-rose-50"
            : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
              ? "border-emerald-200 bg-emerald-50"
              : "border-border bg-background/60"
        }`}
      >
        <p className="text-sm text-muted-foreground">
          {userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
            ? t("groupDetailPage.balanceYouOwe")
            : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
              ? t("groupDetailPage.balanceOthersOweYou")
              : t("groupDetailPage.balanceAllSettled")}
        </p>
        <p
          className={`mt-1 text-2xl font-bold ${
            userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
              ? "text-rose-700"
              : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
                ? "text-emerald-700"
                : "text-foreground"
          }`}
        >
          {formatCurrency(
            Math.abs(userBalanceSummary.othersOweMe - userBalanceSummary.iOweOthers),
            currency as CurrencyEnum
          )}
        </p>
      </div>

      <p className="mb-3 text-sm text-muted-foreground">
        {userBalanceSummary.unsettledCount === 0
          ? t("groupDetailPage.balanceAllSettled")
          : t("groupDetailPage.balanceOpenCount", { count: userBalanceSummary.unsettledCount })}
      </p>

      {groupSettlementFeedback ? (
        <p
          className={`mb-3 text-sm ${
            groupSettlementFeedback.tone === "error"
              ? "text-destructive"
              : groupSettlementFeedback.tone === "info"
                ? "text-blue-600"
                : "text-emerald-700"
          }`}
        >
          {groupSettlementFeedback.message}
        </p>
      ) : null}

      {balanceRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("groupDetailPage.balanceNoBreakdownRows")}</p>
      ) : (
        <div className="space-y-2">
          {balanceRows.map((row) => (
            <div
              key={row.userId}
              className="rounded-lg border border-border bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.memberName}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.relationLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  {row.amount < 0 ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        onSettle({
                          userId: row.userId,
                          memberName: row.memberName,
                          absoluteAmount: row.absoluteAmount,
                        })
                      }
                    >
                      {t("groupDetailPage.settle")}
                    </Button>
                  ) : null}
                  <p
                    className={`whitespace-nowrap text-sm font-semibold ${
                      row.amount > 0 ? "text-emerald-700" : row.amount < 0 ? "text-rose-700" : "text-foreground"
                    }`}
                  >
                    {formatCurrency(row.absoluteAmount, currency as CurrencyEnum)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
