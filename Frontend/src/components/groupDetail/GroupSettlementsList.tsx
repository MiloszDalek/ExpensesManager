import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";
import type { ApiSettlementResponse } from "@/types";

interface GroupSettlementsListProps {
  settlements: ApiSettlementResponse[];
  settlementsLoading: boolean;
  settlementsError: Error | null;
  getMemberDisplayName: (userId: number) => string;
  getSettlementMethodLabel: (paymentMethod: import("@/types/enums").PaymentMethod) => string;
}

export default function GroupSettlementsList({
  settlements,
  settlementsLoading,
  settlementsError,
  getMemberDisplayName,
  getSettlementMethodLabel,
}: GroupSettlementsListProps) {
  const { t } = useTranslation();

  if (settlementsLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((item) => (
          <div key={item} className="h-14 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  if (settlementsError) {
    return <p className="text-sm text-destructive">{t("groupDetailPage.settlementsLoadError")}</p>;
  }

  if (settlements.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        {t("groupDetailPage.settlementsEmpty")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((settlement) => (
        <div key={settlement.id} className="rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <p className="text-sm font-medium text-foreground">
            {t("groupDetailPage.settlementItem", {
              from: getMemberDisplayName(settlement.from_user_id),
              to: getMemberDisplayName(settlement.to_user_id),
            })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(Number(settlement.amount), settlement.currency as CurrencyEnum)} ·{" "}
            {getSettlementMethodLabel(settlement.payment_method)} ·{" "}
            {format(new Date(settlement.created_at), "MMM d, yyyy HH:mm")}
          </p>
        </div>
      ))}
    </div>
  );
}
