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
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/currency";
import type { CurrencyEnum } from "@/types/enums";

interface GroupSettlementConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  userId: number | undefined;
  settleCashPending: boolean;
  onConfirm: () => void;
}

export default function GroupSettlementConfirmDialog({
  open,
  onOpenChange,
  amount,
  currency,
  userId,
  settleCashPending,
  onConfirm,
}: GroupSettlementConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("groupDetailPage.settlementOutsideConfirmTitle")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("groupDetailPage.settlementOutsideConfirmDescription", {
              amount: formatCurrency(amount, currency as CurrencyEnum),
              currency,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={!userId || settleCashPending}
            onClick={onConfirm}
          >
            {settleCashPending ? t("groupDetailPage.settlingCash") : t("groupDetailPage.settlementOutsideConfirmAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
