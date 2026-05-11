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

interface TotalSettlementConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactUsername: string | undefined;
  settleTotalCashPending: boolean;
  onConfirm: () => void;
}

export default function TotalSettlementConfirmDialog({
  open,
  onOpenChange,
  contactUsername,
  settleTotalCashPending,
  onConfirm,
}: TotalSettlementConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("contactsBalancesPage.totalSettleConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {contactUsername
              ? t("contactsBalancesPage.totalSettleConfirmDescription", {
                  contact: contactUsername,
                })
              : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={settleTotalCashPending}>
            {t("contactsBalancesPage.totalSettleCancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={settleTotalCashPending}
            onClick={onConfirm}
          >
            {settleTotalCashPending
              ? t("contactsBalancesPage.totalSettleConfirming")
              : t("contactsBalancesPage.totalSettleConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
