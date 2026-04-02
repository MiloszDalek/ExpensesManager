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

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGroupFormData) => void;
  isLoading?: boolean;
};

export default function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
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
    if (formData.name.trim()) {
      setRecentCurrencies(rememberRecentCurrency(formData.currency));
      onSubmit(formData);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createGroupDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">{t("createGroupDialog.name")}</Label>
            <Input
              id="name"
              placeholder={t("createGroupDialog.namePlaceholder")}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">{t("createGroupDialog.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("createGroupDialog.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
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
                              className="ml-auto mr-4 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100 cursor-pointer"
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

        <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}