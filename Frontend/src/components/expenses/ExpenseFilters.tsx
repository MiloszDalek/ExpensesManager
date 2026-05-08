import { useState } from "react";
import { useTranslation } from "react-i18next";
import DatePicker from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiCategoryResponse } from "@/types/category";
import type {
  PersonalExpensePeriodPreset,
  PersonalExpensesFiltersState,
} from "@/types/expense";
import { type CurrencyEnum } from "@/types/enums";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import CategoryPicker from "./CategoryPicker";
import type { CategorySection } from "@/types/enums";

type ExpenseFiltersProps = {
  filters: PersonalExpensesFiltersState;
  onFilterChange: (next: PersonalExpensesFiltersState) => void;
  onPeriodPresetChange: (preset: PersonalExpensePeriodPreset) => void;
  onApplyFilters: () => void;
  isApplyDisabled?: boolean;
  categories: ApiCategoryResponse[];
  onCreateCustomCategory?: (payload: { name: string; section: CategorySection }) => Promise<ApiCategoryResponse>;
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
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value });
  };

  const handleCurrencyChange = (value: CurrencyEnum | "all") => {
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

  const handleDateFromChange = (value: string) => {
    onFilterChange({
      ...filters,
      periodPreset: "custom",
      dateFrom: value,
    });

    // Validate if dateTo is earlier than new dateFrom
    if (filters.dateTo && value && new Date(filters.dateTo) < new Date(value)) {
      setDateValidationError(t("expenseFilters.dateToBeforeDateFrom"));
    } else {
      setDateValidationError(null);
    }
  };

  const handleDateToChange = (value: string) => {
    onFilterChange({
      ...filters,
      periodPreset: "custom",
      dateTo: value,
    });

    // Validate if dateTo is earlier than dateFrom
    if (filters.dateFrom && value && new Date(value) < new Date(filters.dateFrom)) {
      setDateValidationError(t("expenseFilters.dateToBeforeDateFrom"));
    } else {
      setDateValidationError(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-card/80 p-4 text-card-foreground backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <Label>{t("expenseFilters.category")}</Label>
          <CategoryPicker
            value={filters.category}
            onValueChange={handleCategoryChange}
            categories={categories}
            onCreateCustomCategory={onCreateCustomCategory}
            onDeleteCustomCategory={onDeleteCustomCategory}
            allowAllSelection
            trigger="button"
            mobileInset={true}
            showLabel={false}
          />
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.currency")}</Label>
          <CurrencyPicker<CurrencyEnum | "all">
            selectedCurrency={filters.currency as CurrencyEnum | "all"}
            onCurrencyChange={handleCurrencyChange}
            allowAll
            className="w-full"
          />
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
        <div className="mt-4 grid grid-cols-1 gap-4">
          <div className="space-y-1">
            <Label htmlFor="date-from">{t("expenseFilters.from")}</Label>
            <DatePicker
              id="date-from"
              value={filters.dateFrom}
              onChange={handleDateFromChange}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="date-to">{t("expenseFilters.to")}</Label>
            <DatePicker
              id="date-to"
              value={filters.dateTo}
              onChange={handleDateToChange}
            />
          </div>

          {dateValidationError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{dateValidationError}</span>
            </div>
          )}
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