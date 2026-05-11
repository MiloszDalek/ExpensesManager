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
  contactUsername: string | undefined;
  groupName: string | undefined;
  amount: number;
  currency: string;
  settleGroupCashPending: boolean;
  onConfirm: () => void;
}

export default function GroupSettlementConfirmDialog({
  open,
  onOpenChange,
  contactUsername,
  groupName,
  amount,
  currency,
  settleGroupCashPending,
  onConfirm,
}: GroupSettlementConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("contactsBalancesPage.groupSettleConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {contactUsername && groupName
              ? t("contactsBalancesPage.groupSettleConfirmDescription", {
                  contact: contactUsername,
                  group: groupName,
                  amount: formatCurrency(amount, currency as CurrencyEnum),
                  currency,
                })
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={settleGroupCashPending}>
            {t("contactsBalancesPage.groupSettleCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={settleGroupCashPending}
            onClick={onConfirm}
          >
            {settleGroupCashPending
              ? t("contactsBalancesPage.groupSettleConfirming")
              : t("contactsBalancesPage.groupSettleConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
