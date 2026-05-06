import { useEffect, useMemo, useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import DialogInfoButton from "@/components/help/DialogInfoButton";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import { getCurrenciesWithRecentFirst, getRecentCurrencies, rememberRecentCurrency, removeRecentCurrency } from "@/utils/currency";
import type { ApiGroupResponse, ApiGroupUpdate } from "@/types";

const GROUP_NAME_MAX_LENGTH = 120;
const GROUP_DESCRIPTION_MAX_LENGTH = 500;

type EditGroupDialogProps = {
  open: boolean;
  group: ApiGroupResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApiGroupUpdate) => void;
  onArchive: () => void;
  isLoading?: boolean;
  isArchiving?: boolean;
  errorMessage?: string | null;
};

type FormData = {
  name: string;
  description: string;
  currency: CurrencyEnum;
};

export default function EditGroupDialog({
  open,
  group,
  onOpenChange,
  onSubmit,
  onArchive,
  isLoading,
  isArchiving,
  errorMessage,
}: EditGroupDialogProps) {
  const { t } = useTranslation();
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    currency: "PLN",
  });

  useEffect(() => {
    if (open) {
      setRecentCurrencies(getRecentCurrencies());
    }
  }, [open]);

  useEffect(() => {
    if (!open || !group) {
      return;
    }

    setFormData({
      name: group.name ?? "",
      description: group.description ?? "",
      currency: group.currency ?? "PLN",
    });
  }, [open, group]);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);
  const hasExpenses = (group?.expenses_count ?? 0) > 0;
  const isArchived = group?.status === "archived";

  const resetForm = () => {
    if (!group) {
      setFormData({
        name: "",
        description: "",
        currency: "PLN",
      });
      return;
    }

    setFormData({
      name: group.name ?? "",
      description: group.description ?? "",
      currency: group.currency ?? "PLN",
    });
  };

  const handleCurrencyChange = (value: string) => {
    setFormData((previous) => ({
      ...previous,
      currency: value as CurrencyEnum,
    }));
    setRecentCurrencies(rememberRecentCurrency(value as CurrencyEnum));
  };

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    const nextName = formData.name.trim();
    const nextDescription = formData.description.trim();

    if (!nextName) {
      return;
    }

    setRecentCurrencies(rememberRecentCurrency(formData.currency));
    onSubmit({
      name: nextName,
      description: nextDescription.length > 0 ? nextDescription : null,
      currency: formData.currency,
    });
  };

  const handleArchive = () => {
    onArchive();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full min-w-0 max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-lg [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("groupEditDialog.title")}</DialogTitle>
            <DialogInfoButton dialogKey="editGroup" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {errorMessage && (
            <p className="max-w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="group-name">{t("groupEditDialog.name")}</Label>
            <Input
              id="group-name"
              placeholder={t("createGroupDialog.namePlaceholder")}
              value={formData.name}
              className="w-full min-w-0 max-w-full"
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value.slice(0, GROUP_NAME_MAX_LENGTH),
                }))
              }
            />
            <p className="text-right text-xs text-muted-foreground">
              {formData.name.length}/{GROUP_NAME_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-description">{t("groupEditDialog.description")}</Label>
            <Textarea
              id="group-description"
              placeholder={t("createGroupDialog.descriptionPlaceholder")}
              value={formData.description}
              className="w-full min-w-0 max-w-full overflow-x-hidden whitespace-pre-wrap [field-sizing:fixed] [overflow-wrap:anywhere]"
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  description: event.target.value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH),
                }))
              }
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {formData.description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-1">
            <Label>{t("groupEditDialog.currency")}</Label>
            <Select
              value={formData.currency}
              onValueChange={handleCurrencyChange}
              disabled={hasExpenses}
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {recentCurrencies.length > 0 && (
                  <>
                    <SelectGroup>
                      <SelectLabel>{t("createGroupDialog.recentCurrencies")}</SelectLabel>
                      {orderedCurrencies
                        .filter((currency) => recentCurrencySet.has(currency))
                        .map((currency) => (
                          <SelectItem key={`recent-${currency}`} value={currency} className="group pr-12">
                            <span>{currency}</span>
                            <button
                              type="button"
                              tabIndex={-1}
                              aria-label={t("createGroupDialog.removeRecentCurrency")}
                              className="ml-auto mr-4 cursor-pointer rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100"
                              onPointerDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                              onPointerUp={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRemoveRecentCurrency(currency);
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectSeparator />
                  </>
                )}

                <SelectGroup>
                  {recentCurrencies.length > 0 && (
                    <SelectLabel>{t("createGroupDialog.allCurrencies")}</SelectLabel>
                  )}
                  {SUPPORTED_CURRENCIES.filter((currency) => !recentCurrencySet.has(currency)).map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {hasExpenses && (
              <p className="text-xs text-muted-foreground">
                {t("groupEditDialog.currencyLockedNotice")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="min-w-0 flex-wrap">
          {!isArchived && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isArchiving || isLoading}>
                  {t("groupEditDialog.archive")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("groupEditDialog.archiveWarningTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("groupEditDialog.archiveWarningDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("groupEditDialog.archiveCancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleArchive}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isArchiving ? t("groupEditDialog.archiving") : t("groupEditDialog.archiveConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("createGroupDialog.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name.trim() || isLoading || isArchiving}>
            {isLoading ? t("createGroupDialog.creating") : t("groupEditDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
