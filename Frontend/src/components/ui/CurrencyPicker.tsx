import { useState, useEffect, useRef, useMemo } from "react";
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
import { 
  getRecentCurrencies, 
  rememberRecentCurrency, 
  getCurrenciesWithRecentFirst,
  removeRecentCurrency 
} from "@/utils/currency";
import { useTranslation } from "react-i18next";
import { getCurrencySymbol } from "@/utils/currency";
import { type CurrencyEnum } from "@/types/enums";
import { SUPPORTED_CURRENCIES } from "@/types/enums";
import { X } from "lucide-react";

interface CurrencyPickerProps<TValue extends CurrencyEnum | "all" = CurrencyEnum> {
  selectedCurrency: TValue;
  onCurrencyChange: (currency: TValue) => void;
  className?: string;
  allowAll?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function CurrencyPicker<TValue extends CurrencyEnum | "all" = CurrencyEnum>({
  selectedCurrency,
  onCurrencyChange,
  className,
  allowAll,
  placeholder,
  disabled,
  id,
}: CurrencyPickerProps<TValue>) {
  const { t } = useTranslation();
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const ignoredCurrencySelectionRef = useRef<TValue | null>(null);

  useEffect(() => {
    setRecentCurrencies(getRecentCurrencies());
  }, []);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);

  const handleCurrencySelect = (currency: TValue) => {
    if (currency === ignoredCurrencySelectionRef.current) {
      ignoredCurrencySelectionRef.current = null;
      return;
    }

    ignoredCurrencySelectionRef.current = null;
    onCurrencyChange(currency);

    if (currency !== "all") {
      setRecentCurrencies(rememberRecentCurrency(currency as unknown as CurrencyEnum));
    }
  };

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));

    if (selectedCurrency === (currency as unknown as TValue)) {
      ignoredCurrencySelectionRef.current = currency as unknown as TValue;
      // Change to the first available currency
      const remainingCurrencies = removeRecentCurrency(currency);
      if (remainingCurrencies.length > 0) {
        onCurrencyChange(remainingCurrencies[0] as unknown as TValue);
      } else {
        // Fallback to PLN if no recent currencies
        onCurrencyChange("PLN" as unknown as TValue);
      }
      setIsSelectOpen(false);
    }
  };

  return (
    <Select
      value={selectedCurrency}
      onValueChange={handleCurrencySelect}
      open={isSelectOpen}
      onOpenChange={setIsSelectOpen}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={`gap-2 ${className}`}>
        <SelectValue placeholder={placeholder ?? "Select currency"} />
      </SelectTrigger>
      <SelectContent className="w-48">
        {allowAll && (
          <>
            <SelectGroup>
              <SelectItem value="all">
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="font-medium">All</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              </SelectItem>
            </SelectGroup>
            {recentCurrencies.length > 0 && <SelectSeparator />}
          </>
        )}
        {recentCurrencies.length > 0 && (
          <>
            <SelectGroup>
              <SelectLabel>{t("expenseFilters.recentCurrencies")}</SelectLabel>
              {orderedCurrencies
                .filter((currency) => recentCurrencySet.has(currency))
                .map((currency) => (
                  <SelectItem key={`recent-${currency}`} value={currency} className="group pr-12">
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span className="font-medium">{currency}</span>
                      <span className="text-muted-foreground">{getCurrencySymbol(currency)}</span>
                    </div>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label="Remove recent currency"
                      className="ml-auto mr-4 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100 cursor-pointer"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onPointerUp={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
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
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="font-medium">{currency}</span>
                <span className="text-muted-foreground">{getCurrencySymbol(currency)}</span>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
