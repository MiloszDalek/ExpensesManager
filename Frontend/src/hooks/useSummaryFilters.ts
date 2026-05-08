import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import type { PersonalExpensePeriodPreset, ExpenseSummaryScope, CurrencyEnum, CategorySection } from "@/types";

type SummaryFiltersState = {
  scope: ExpenseSummaryScope;
  groupId: string;
  categoryIds: number[];
  categorySections: CategorySection[];
  currency: CurrencyEnum;
  periodPreset: PersonalExpensePeriodPreset;
  dateFrom: string;
  dateTo: string;
  sortBy: "expense_date" | "amount";
  sortOrder: "asc" | "desc";
};

const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

const getPeriodRange = (preset: Exclude<PersonalExpensePeriodPreset, "custom">) => {
  const now = new Date();

  if (preset === "previous_month") {
    const previousMonth = subMonths(now, 1);
    const start = startOfMonth(previousMonth);
    const end = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

    return {
      dateFrom: toDateInput(start),
      dateTo: toDateInput(end),
    };
  }

  return {
    dateFrom: toDateInput(startOfMonth(now)),
    dateTo: toDateInput(now),
  };
};

const getInitialFilters = (): SummaryFiltersState => {
  const thisMonthRange = getPeriodRange("this_month");

  return {
    scope: "all",
    groupId: "all",
    categoryIds: [],
    categorySections: [],
    currency: "PLN",
    periodPreset: "this_month",
    dateFrom: thisMonthRange.dateFrom,
    dateTo: thisMonthRange.dateTo,
    sortBy: "expense_date",
    sortOrder: "desc",
  };
};

const arraysEqual = <T extends number | string>(a: T[], b: T[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
};

const areFiltersEqual = (first: SummaryFiltersState, second: SummaryFiltersState) => {
  return (
    first.scope === second.scope &&
    first.groupId === second.groupId &&
    arraysEqual(first.categoryIds, second.categoryIds) &&
    arraysEqual(first.categorySections, second.categorySections) &&
    first.currency === second.currency &&
    first.periodPreset === second.periodPreset &&
    first.dateFrom === second.dateFrom &&
    first.dateTo === second.dateTo &&
    first.sortBy === second.sortBy &&
    first.sortOrder === second.sortOrder
  );
};

export type { SummaryFiltersState };

export function useSummaryFilters() {
  const [draftFilters, setDraftFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<SummaryFiltersState>(getInitialFilters);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const hasPendingFilters = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [draftFilters, appliedFilters]
  );

  const hasInvalidDraftDateRange =
    draftFilters.periodPreset === "custom" &&
    !!draftFilters.dateFrom &&
    !!draftFilters.dateTo &&
    draftFilters.dateFrom > draftFilters.dateTo;

  const appliedGroupId = appliedFilters.groupId === "all" ? undefined : Number(appliedFilters.groupId);

  const handlePeriodPresetChange = (preset: PersonalExpensePeriodPreset) => {
    if (preset === "custom") {
      setDraftFilters((previous) => ({ ...previous, periodPreset: preset }));
      return;
    }

    const range = getPeriodRange(preset);
    setDraftFilters((previous) => ({
      ...previous,
      periodPreset: preset,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    }));
  };

  const handleScopeChange = (scope: ExpenseSummaryScope) => {
    setDraftFilters((previous) => {
      if (scope === "personal") {
        return {
          ...previous,
          scope,
          groupId: "all",
          categoryIds: [],
          categorySections: [],
        };
      }

      return {
        ...previous,
        scope,
        categoryIds: [],
        categorySections: [],
      };
    });
  };

  const handleApplyFilters = () => {
    if (hasInvalidDraftDateRange) {
      return;
    }

    setAppliedFilters(draftFilters);
    setIsMobileFiltersOpen(false);
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split("-") as [
      SummaryFiltersState["sortBy"],
      SummaryFiltersState["sortOrder"],
    ];
    setDraftFilters((previous) => ({ ...previous, sortBy, sortOrder }));
  };

  const setDraftCurrency = (currency: CurrencyEnum) => {
    setDraftFilters((previous) => ({ ...previous, currency }));
  };

  const setDraftGroupId = (groupId: string) => {
    setDraftFilters((previous) => ({
      ...previous,
      groupId,
      categoryIds: [],
      categorySections: [],
    }));
  };

  const setDraftDateFrom = (dateFrom: string) => {
    setDraftFilters((previous) => ({
      ...previous,
      periodPreset: "custom",
      dateFrom,
    }));
  };

  const setDraftDateTo = (dateTo: string) => {
    setDraftFilters((previous) => ({
      ...previous,
      periodPreset: "custom",
      dateTo,
    }));
  };

  const toggleSection = (
    section: CategorySection,
    categoriesBySection: [CategorySection, { id: number }[]][]
  ) => {
    const sectionCats = categoriesBySection.find(([s]) => s === section)?.[1] ?? [];
    const sectionIds = sectionCats.map((c) => c.id);

    setDraftFilters((previous) => {
      const isSelected = previous.categorySections.includes(section);
      if (isSelected) {
        return {
          ...previous,
          categoryIds: previous.categoryIds.filter((id) => !sectionIds.includes(id)),
          categorySections: previous.categorySections.filter((s) => s !== section),
        };
      }
      return {
        ...previous,
        categoryIds: Array.from(new Set([...previous.categoryIds, ...sectionIds])),
        categorySections: [...previous.categorySections, section],
      };
    });
  };

  const toggleCategory = (
    categoryId: number,
    section: CategorySection,
    categoriesBySection: [CategorySection, { id: number }[]][]
  ) => {
    const sectionCats = categoriesBySection.find(([s]) => s === section)?.[1] ?? [];
    const sectionIds = sectionCats.map((c) => c.id);

    setDraftFilters((previous) => {
      const hasCategory = previous.categoryIds.includes(categoryId);
      const nextIds = hasCategory
        ? previous.categoryIds.filter((id) => id !== categoryId)
        : [...previous.categoryIds, categoryId];
      const allSectionSelected = sectionIds.every((id) => nextIds.includes(id));
      const nextSections = allSectionSelected
        ? Array.from(new Set([...previous.categorySections, section]))
        : previous.categorySections.filter((s) => s !== section);
      return { ...previous, categoryIds: nextIds, categorySections: nextSections };
    });
  };

  return {
    draftFilters,
    appliedFilters,
    isMobileFiltersOpen,
    setIsMobileFiltersOpen,
    hasPendingFilters,
    hasInvalidDraftDateRange,
    appliedGroupId,
    handlePeriodPresetChange,
    handleScopeChange,
    handleApplyFilters,
    handleSortChange,
    setDraftCurrency,
    setDraftGroupId,
    setDraftDateFrom,
    setDraftDateTo,
    toggleSection,
    toggleCategory,
  };
}
