import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import type { PersonalExpensePeriodPreset, ExpenseSummaryScope, CurrencyEnum } from "@/types";

type SummaryFiltersState = {
  scope: ExpenseSummaryScope;
  groupId: string;
  categoryIds: number[];
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
        };
      }

      return {
        ...previous,
        scope,
        categoryIds: [],
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
    }));
  };

  const setDraftCategoryIds = (categoryIds: number[]) => {
    setDraftFilters((previous) => ({ ...previous, categoryIds }));
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
    setDraftCategoryIds,
  };
}
