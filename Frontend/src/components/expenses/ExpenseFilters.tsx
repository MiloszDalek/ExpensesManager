import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import type { ApiCategoryResponse } from "@/types/category";
import type {
  PersonalExpensePeriodPreset,
  PersonalExpensesFiltersState,
} from "@/types/expense";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import {
  getCurrenciesWithRecentFirst,
  getRecentCurrencies,
  rememberRecentCurrency,
  removeRecentCurrency,
} from "@/utils/currency";
import CategoryPicker from "./CategoryPicker";
import { X } from "lucide-react";

type ExpenseFiltersProps = {
  filters: PersonalExpensesFiltersState;
  onFilterChange: (next: PersonalExpensesFiltersState) => void;
  onPeriodPresetChange: (preset: PersonalExpensePeriodPreset) => void;
  onApplyFilters: () => void;
  isApplyDisabled?: boolean;
  categories: ApiCategoryResponse[];
  onCreateCustomCategory?: (name: string) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
};

export default function ExpenseFilters({
  filters,
  onFilterChange,
  onPeriodPresetChange,
  onApplyFilters,
  isApplyDisabled,
  categories,
  onCreateCustomCategory,
  onDeleteCustomCategory,
}: ExpenseFiltersProps) {
  const { t } = useTranslation();
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);
  const [isCurrencySelectOpen, setIsCurrencySelectOpen] = useState(false);
  const ignoredCurrencySelectionRef = useRef<CurrencyEnum | null>(null);

  useEffect(() => {
    setRecentCurrencies(getRecentCurrencies());
  }, []);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);

  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value });
  };

  const handleCurrencyChange = (value: string) => {
    if (value !== "all" && value === ignoredCurrencySelectionRef.current) {
      ignoredCurrencySelectionRef.current = null;
      return;
    }

    ignoredCurrencySelectionRef.current = null;

    if (value !== "all") {
      setRecentCurrencies(rememberRecentCurrency(value as CurrencyEnum));
    }

    onFilterChange({
      ...filters,
      currency: value as PersonalExpensesFiltersState["currency"],
    });
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(":") as [
      PersonalExpensesFiltersState["sortBy"],
      PersonalExpensesFiltersState["sortOrder"],
    ];

    onFilterChange({ ...filters, sortBy, sortOrder });
  };

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));

    if (filters.currency === currency) {
      ignoredCurrencySelectionRef.current = currency;
      onFilterChange({
        ...filters,
        currency: "all",
      });
      setIsCurrencySelectOpen(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-card/80 p-4 text-card-foreground backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <Label>{t("expenseFilters.category")}</Label>
          <CategoryPicker
            value={filters.category}
            onValueChange={handleCategoryChange}
            categories={categories}
            onCreateCustomCategory={onCreateCustomCategory}
            onDeleteCustomCategory={onDeleteCustomCategory}
            trigger="button"
            mobileInset={true}
            showLabel={false}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.currency")}</Label>
          <Select
            value={filters.currency}
            onValueChange={handleCurrencyChange}
            open={isCurrencySelectOpen}
            onOpenChange={setIsCurrencySelectOpen}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">{t("expenseFilters.allCurrencies")}</SelectItem>
              </SelectGroup>

              {recentCurrencies.length > 0 && (
                <>
                  <SelectGroup>
                    <SelectLabel>{t("expenseFilters.recentCurrencies")}</SelectLabel>
                    {orderedCurrencies
                      .filter((currency) => recentCurrencySet.has(currency))
                      .map((currency) => (
                        <SelectItem key={`recent-${currency}`} value={currency} className="group pr-12">
                          <span>{currency}</span>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-label={t("expenseFilters.removeRecentCurrency")}
                            className="ml-auto mr-4 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100"
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
                    {currency}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.period")}</Label>
          <Select
            value={filters.periodPreset}
            onValueChange={(value) => onPeriodPresetChange(value as PersonalExpensePeriodPreset)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">{t("expenseFilters.thisMonth")}</SelectItem>
              <SelectItem value="previous_month">{t("expenseFilters.previousMonth")}</SelectItem>
              <SelectItem value="custom">{t("expenseFilters.customRange")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.sort")}</Label>
          <Select
            value={`${filters.sortBy}:${filters.sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense_date:desc">{t("expenseFilters.sortNewest")}</SelectItem>
              <SelectItem value="expense_date:asc">{t("expenseFilters.sortOldest")}</SelectItem>
              <SelectItem value="amount:desc">{t("expenseFilters.sortAmountDesc")}</SelectItem>
              <SelectItem value="amount:asc">{t("expenseFilters.sortAmountAsc")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filters.periodPreset === "custom" && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="date-from">{t("expenseFilters.from")}</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) =>
                onFilterChange({
                  ...filters,
                  periodPreset: "custom",
                  dateFrom: event.target.value,
                })
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="date-to">{t("expenseFilters.to")}</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) =>
                onFilterChange({
                  ...filters,
                  periodPreset: "custom",
                  dateTo: event.target.value,
                })
              }
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <Button onClick={onApplyFilters} disabled={isApplyDisabled}>
          {t("expenseFilters.apply")}
        </Button>
      </div>
    </div>
  );
}