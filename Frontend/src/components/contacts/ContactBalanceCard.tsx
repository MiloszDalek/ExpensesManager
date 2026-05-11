import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { formatSignedCurrency, formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";
import type { ContactBalanceRow, GroupSettlementTarget } from "@/types";

interface ContactBalanceCardProps {
  row: ContactBalanceRow;
  isExpanded: boolean;
  onToggle: () => void;
  onSettleTotal: (target: { contactUserId: number; contactUsername: string; currency: string }) => void;
  onSettleGroup: (target: GroupSettlementTarget) => void;
  expandedBreakdownLoading: boolean;
  expandedBreakdownError: boolean;
  expandedGroupRows: {
    groupId: number;
    amount: number;
    absoluteAmount: number;
    groupName: string;
    groupCurrency: string;
  }[];
}

export default function ContactBalanceCard({
  row,
  isExpanded,
  onToggle,
  onSettleTotal,
  onSettleGroup,
  expandedBreakdownLoading,
  expandedBreakdownError,
  expandedGroupRows,
}: ContactBalanceCardProps) {
  const { t } = useTranslation();

  const balanceLabel = Object.entries(row.currencyTotals)
    .filter(([, amount]) => amount !== 0)
    .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]))
    .map(([currency, amount]) => formatSignedCurrency(amount, currency as CurrencyEnum, { showPlus: true }))
    .join(" · ");

  const hasPositive = Object.values(row.currencyTotals).some((amount) => amount > 0);
  const hasNegative = Object.values(row.currencyTotals).some((amount) => amount < 0);

  const rowBreakdown = Object.entries(row.currencyTotals)
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => ({ currency, amount }));

  const payableCurrency =
    Object.keys(row.currencyTotals).find((currency) => (row.currencyTotals[currency] ?? 0) < 0) ?? "PLN";
  const payableGroupCount = rowBreakdown.filter((item) => item.amount < 0).length;
  const canSettleTotal = hasNegative && payableGroupCount > 1;

  return (
    <div className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.contact.username}</p>
          <p className="truncate text-xs text-muted-foreground">{row.contact.email}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p
              className={`text-sm font-semibold ${
                hasPositive && !hasNegative
                  ? "text-emerald-700"
                  : hasNegative && !hasPositive
                    ? "text-rose-700"
                    : "text-foreground"
              }`}
            >
              {balanceLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasPositive && hasNegative
                ? t("contactsBalancesPage.mixedDirections")
                : hasPositive
                  ? t("contactsBalancesPage.contactOwesYou")
                  : hasNegative
                    ? t("contactsBalancesPage.youOweContact")
                    : t("contactsBalancesPage.settled")}
            </p>
          </div>

          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-3 py-3">
          {canSettleTotal ? (
            <div className="mb-3 flex flex-col gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onSettleTotal({
                    contactUserId: row.contact.contact_id,
                    contactUsername: row.contact.username,
                    currency: payableCurrency,
                  });
                }}
              >
                {t("contactsBalancesPage.settle")}
              </Button>
            </div>
          ) : null}

          {expandedBreakdownLoading ? (
            <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.loadingBreakdown")}</p>
          ) : expandedBreakdownError ? (
            <p className="text-sm text-destructive">{t("contactsBalancesPage.errorBreakdown")}</p>
          ) : expandedGroupRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.noGroupRows")}</p>
          ) : (
            <div className="space-y-2">
              {expandedGroupRows.map((groupRow) => (
                <div
                  key={groupRow.groupId}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{groupRow.groupName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {groupRow.amount > 0
                        ? t("contactsBalancesPage.contactOwesYou")
                        : t("contactsBalancesPage.youOweContact")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {groupRow.amount < 0 ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          onSettleGroup({
                            contactUserId: row.contact.contact_id,
                            contactUsername: row.contact.username,
                            groupId: groupRow.groupId,
                            groupName: groupRow.groupName,
                            amount: groupRow.absoluteAmount,
                            currency: groupRow.groupCurrency,
                          });
                        }}
                      >
                        {t("contactsBalancesPage.settle")}
                      </Button>
                    ) : null}
                    <p
                      className={`whitespace-nowrap text-sm font-semibold ${
                        groupRow.amount > 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {formatCurrency(groupRow.absoluteAmount, groupRow.groupCurrency as CurrencyEnum)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
