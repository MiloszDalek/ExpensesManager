import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import {
  getCurrenciesWithRecentFirst,
  getRecentCurrencies,
  rememberRecentCurrency,
  removeRecentCurrency,
} from "@/utils/currency";

type CreateGroupFormData = {
  name: string;
  description: string;
  currency: CurrencyEnum;
};

const GROUP_NAME_MAX_LENGTH = 120;
const GROUP_DESCRIPTION_MAX_LENGTH = 500;

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGroupFormData) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export default function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  errorMessage,
}: CreateGroupDialogProps) {
  const { t } = useTranslation();
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "PLN" as CurrencyEnum,
  });

  useEffect(() => {
    if (open) {
      setRecentCurrencies(getRecentCurrencies());
    }
  }, [open]);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      currency: "PLN",
    });
  };

  const handleCurrencyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
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
    if (
      formData.name.trim() &&
      formData.name.length <= GROUP_NAME_MAX_LENGTH &&
      formData.description.length <= GROUP_DESCRIPTION_MAX_LENGTH
    ) {
      setRecentCurrencies(rememberRecentCurrency(formData.currency));
      onSubmit(formData);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full min-w-0 max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-md">
        <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4 p-6">
          <DialogHeader>
            <DialogTitle>{t("createGroupDialog.title")}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {errorMessage && (
              <p className="max-w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive [overflow-wrap:anywhere]">
                {errorMessage}
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">{t("createGroupDialog.name")}</Label>
              <Input
                id="name"
                placeholder={t("createGroupDialog.namePlaceholder")}
                value={formData.name}
                className="w-full min-w-0 max-w-full"
                maxLength={GROUP_NAME_MAX_LENGTH}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value.slice(0, GROUP_NAME_MAX_LENGTH),
                  }))
                }
              />
              <p className="text-right text-xs text-muted-foreground">
                {formData.name.length}/{GROUP_NAME_MAX_LENGTH}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">{t("createGroupDialog.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("createGroupDialog.descriptionPlaceholder")}
                value={formData.description}
                className="w-full min-w-0 max-w-full overflow-x-hidden whitespace-pre-wrap [field-sizing:fixed] [overflow-wrap:anywhere]"
                maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH),
                  }))
                }
                rows={2}
              />
              <p className="text-right text-xs text-muted-foreground">
                {formData.description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
              </p>
            </div>

            <div>
              <Label>{t("createGroupDialog.currency")}</Label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
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
                    {SUPPORTED_CURRENCIES.filter((currency) => !recentCurrencySet.has(currency)).map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="min-w-0 shrink-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t("createGroupDialog.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isLoading}
            >
              {isLoading ? t("createGroupDialog.creating") : t("createGroupDialog.submit")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}