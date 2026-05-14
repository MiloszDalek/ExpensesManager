import { format, startOfMonth, subMonths } from "date-fns";
import type { PersonalExpensePeriodPreset, PersonalExpensesFiltersState } from "@/types/expense";

export const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

export const getPeriodRange = (preset: Exclude<PersonalExpensePeriodPreset, "custom">) => {
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

export const getInitialFilters = (): PersonalExpensesFiltersState => {
  const thisMonthRange = getPeriodRange("this_month");

  return {
    category: "all",
    currency: "all",
    periodPreset: "this_month",
    dateFrom: thisMonthRange.dateFrom,
    dateTo: thisMonthRange.dateTo,
    sortBy: "expense_date",
    sortOrder: "desc",
  };
};

export const areFiltersEqual = (
  first: PersonalExpensesFiltersState,
  second: PersonalExpensesFiltersState
) => {
  return (
    first.category === second.category &&
    first.currency === second.currency &&
    first.periodPreset === second.periodPreset &&
    first.dateFrom === second.dateFrom &&
    first.dateTo === second.dateTo &&
    first.sortBy === second.sortBy &&
    first.sortOrder === second.sortOrder
  );
};
