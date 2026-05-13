import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DialogInfoButton from "@/components/help/DialogInfoButton";
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";

interface GroupSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string | undefined;
  currency: string;
  groupId: number;
  userId: number | undefined;
  settleCashPending: boolean;
  isPayPalButtonEnabled: boolean;
  isPayPalProcessing?: boolean;
  getPayPalUnavailableMessage: () => string;
  onCashClick: () => void;
  onPayPalCreateOrder: () => Promise<string>;
  onPayPalApprove: (data: { orderID?: string }) => Promise<void>;
  onPayPalCancel: () => void;
  onPayPalError: (error: Record<string, unknown>) => void;
}

export default function GroupSettlementDialog({
  open,
  onOpenChange,
  memberName,
  currency,
  groupId,
  userId,
  settleCashPending,
  isPayPalButtonEnabled,
  isPayPalProcessing,
  getPayPalUnavailableMessage,
  onCashClick,
  onPayPalCreateOrder,
  onPayPalApprove,
  onPayPalCancel,
  onPayPalError,
}: GroupSettlementDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("groupDetailPage.settle")}</DialogTitle>
            <DialogInfoButton dialogKey="groupSettlement" autoOpen={true} />
          </div>
          <DialogDescription>
            {memberName ? t("groupDetailPage.settlementDialogDescription", { member: memberName }) : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-row gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-[34px] rounded-sm"
            disabled={!userId || settleCashPending}
            onClick={onCashClick}
          >
            {settleCashPending ? t("groupDetailPage.settlingCash") : t("groupDetailPage.settleOutsideApp")}
          </Button>

          {isPayPalButtonEnabled ? (
            <div className="flex-1">
              <PayPalCurrencyButtons
                currency={currency}
                fundingSource="paypal"
                style={{ layout: "horizontal", tagline: false, height: 34 }}
                forceReRender={[userId ?? 0, groupId]}
                disabled={isPayPalProcessing}
                createOrder={onPayPalCreateOrder}
                onApprove={onPayPalApprove}
                onCancel={onPayPalCancel}
                onError={onPayPalError}
              />
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
              {getPayPalUnavailableMessage()}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
