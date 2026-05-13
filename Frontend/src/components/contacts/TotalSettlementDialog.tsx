import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";

interface TotalSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactUsername: string | undefined;
  currency: string;
  contactUserId: number | undefined;
  settleTotalCashPending: boolean;
  isPayPalButtonEnabled: boolean;
  isPayPalProcessing?: boolean;
  getPayPalUnavailableMessage: () => string;
  onCashClick: () => void;
  onPayPalCreateOrder: () => Promise<string>;
  onPayPalApprove: (data: { orderID?: string }) => Promise<void>;
  onPayPalCancel: () => void;
  onPayPalError: (error: Record<string, unknown>) => void;
}

export default function TotalSettlementDialog({
  open,
  onOpenChange,
  contactUsername,
  currency,
  contactUserId,
  settleTotalCashPending,
  isPayPalButtonEnabled,
  isPayPalProcessing,
  getPayPalUnavailableMessage,
  onCashClick,
  onPayPalCreateOrder,
  onPayPalApprove,
  onPayPalCancel,
  onPayPalError,
}: TotalSettlementDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("contactsBalancesPage.settle")}</DialogTitle>
          <DialogDescription>
            {contactUsername
              ? t("contactsBalancesPage.totalSettleDialogDescription", {
                  contact: contactUsername,
                })
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Button
            size="sm"
            variant="outline"
            disabled={settleTotalCashPending}
            onClick={onCashClick}
          >
            {settleTotalCashPending
              ? t("contactsBalancesPage.settlingTotalCash")
              : t("contactsBalancesPage.settleOutsideGroup")}
          </Button>

          {isPayPalButtonEnabled ? (
            <div className="w-[180px]">
              <PayPalCurrencyButtons
                currency={currency}
                fundingSource="paypal"
                style={{ layout: "horizontal", tagline: false, height: 34 }}
                forceReRender={[contactUserId ?? 0, currency]}
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
