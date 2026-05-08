import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import { SUPPORTED_CURRENCIES } from "@/types/enums";
import { resolveCategoryGroup } from "@/utils/category";
import type {
  PersonalExpensePeriodPreset,
  ExpenseSummaryScope,
  CurrencyEnum,
  CategorySection,
} from "@/types";
import type { ApiCategoryResponse } from "@/types/category";
import type { SummaryFiltersState } from "@/hooks/useSummaryFilters";

interface GroupOption {
  id: number;
  name: string;
  status: string;
}

interface SummaryFiltersProps {
  draftFilters: SummaryFiltersState;
  categories: ApiCategoryResponse[];
  activeGroups: GroupOption[];
  hasPendingFilters: boolean;
  hasInvalidDraftDateRange: boolean;
  onScopeChange: (scope: ExpenseSummaryScope) => void;
  onGroupChange: (groupId: string) => void;
  onCurrencyChange: (currency: CurrencyEnum) => void;
  onPeriodPresetChange: (preset: PersonalExpensePeriodPreset) => void;
  onSortChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onToggleSection: (section: CategorySection, categoriesBySection: [CategorySection, ApiCategoryResponse[]][]) => void;
  onToggleCategory: (categoryId: number, section: CategorySection, categoriesBySection: [CategorySection, ApiCategoryResponse[]][]) => void;
  onApply: () => void;
}

export default function SummaryFilters({
  draftFilters,
  categories,
  activeGroups,
  hasPendingFilters,
  hasInvalidDraftDateRange,
  onScopeChange,
  onGroupChange,
  onCurrencyChange,
  onPeriodPresetChange,
  onSortChange,
  onDateFromChange,
  onDateToChange,
  onToggleSection,
  onToggleCategory,
  onApply,
}: SummaryFiltersProps) {
  const { t } = useTranslation();

  const categoriesBySection = useMemo(() => {
    const map = new Map<CategorySection, ApiCategoryResponse[]>();
    for (const cat of categories) {
      const section = cat.section ?? resolveCategoryGroup(cat);
      if (!map.has(section)) {
        map.set(section, []);
      }
      map.get(section)!.push(cat);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [categories]);

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 text-card-foreground backdrop-blur-sm space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-1">
          <Label>{t("summaryPage.scope")}</Label>
          <Select value={draftFilters.scope} onValueChange={(value) => onScopeChange(value as ExpenseSummaryScope)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("summaryPage.scopeAll")}</SelectItem>
              <SelectItem value="personal">{t("summaryPage.scopePersonal")}</SelectItem>
              <SelectItem value="group">{t("summaryPage.scopeGroup")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("summaryPage.group")}</Label>
          <Select
            value={draftFilters.groupId}
            onValueChange={(value) => onGroupChange(value)}
            disabled={draftFilters.scope === "personal"}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("summaryPage.groupAll")}</SelectItem>
              {activeGroups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.currency")}</Label>
          <Select
            value={draftFilters.currency}
            onValueChange={(value) => onCurrencyChange(value as CurrencyEnum)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label>{t("expenseFilters.period")}</Label>
          <Select value={draftFilters.periodPreset} onValueChange={(value) => onPeriodPresetChange(value as PersonalExpensePeriodPreset)}>
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
          <Label>{t("summaryPage.sorting", { defaultValue: "Sorting" })}</Label>
          <Select
            value={`${draftFilters.sortBy}-${draftFilters.sortOrder}`}
            onValueChange={onSortChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense_date-desc">{t("summaryPage.sortNewest", { defaultValue: "Newest" })}</SelectItem>
              <SelectItem value="expense_date-asc">{t("summaryPage.sortOldest", { defaultValue: "Oldest" })}</SelectItem>
              <SelectItem value="amount-desc">{t("summaryPage.sortHighest", { defaultValue: "Highest amount" })}</SelectItem>
              <SelectItem value="amount-asc">{t("summaryPage.sortLowest", { defaultValue: "Lowest amount" })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {draftFilters.periodPreset === "custom" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="summary-date-from">{t("expenseFilters.from")}</Label>
            <DatePicker
              id="summary-date-from"
              value={draftFilters.dateFrom}
              onChange={onDateFromChange}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="summary-date-to">{t("expenseFilters.to")}</Label>
            <DatePicker
              id="summary-date-to"
              value={draftFilters.dateTo}
              onChange={onDateToChange}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>{t("summaryPage.categories", { defaultValue: "Categories" })}</Label>
        <div className="flex flex-wrap gap-1.5">
          {categoriesBySection.map(([section]) => (
            <Button
              key={section}
              type="button"
              variant={draftFilters.categorySections.includes(section) ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => onToggleSection(section, categoriesBySection)}
            >
              {t(`categoryGroups.${section}`)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
          {categoriesBySection.map(([section, sectionCats]) =>
            sectionCats.map((cat) => {
              const selected = draftFilters.categoryIds.includes(cat.id);
              return (
                <Button
                  key={cat.id}
                  type="button"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onToggleCategory(cat.id, section, categoriesBySection)}
                >
                  {t(`category.${cat.name}`, { defaultValue: cat.name })}
                </Button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          {t("summaryPage.filtersHint")}
        </div>
        <div className="flex gap-2">
          <Button onClick={onApply} disabled={!hasPendingFilters || hasInvalidDraftDateRange}>
            {t("expenseFilters.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
