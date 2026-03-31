import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";

const RECENT_CURRENCIES_STORAGE_KEY = "expensesManager.recentCurrencies";
const RECENT_CURRENCIES_LIMIT = 5;

const isSupportedCurrency = (value: string): value is CurrencyEnum => {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
};

const sanitizeRecentCurrencies = (values: string[]): CurrencyEnum[] => {
  const unique: CurrencyEnum[] = [];

  values.forEach((value) => {
    if (isSupportedCurrency(value) && !unique.includes(value)) {
      unique.push(value);
    }
  });

  return unique.slice(0, RECENT_CURRENCIES_LIMIT);
};

export const getRecentCurrencies = (): CurrencyEnum[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_CURRENCIES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeRecentCurrencies(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return [];
  }
};

export const rememberRecentCurrency = (currency: CurrencyEnum): CurrencyEnum[] => {
  const next = sanitizeRecentCurrencies([currency, ...getRecentCurrencies()]);

  if (typeof window !== "undefined") {
    localStorage.setItem(RECENT_CURRENCIES_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
};

export const removeRecentCurrency = (currency: CurrencyEnum): CurrencyEnum[] => {
  const next = sanitizeRecentCurrencies(getRecentCurrencies().filter((item) => item !== currency));

  if (typeof window !== "undefined") {
    localStorage.setItem(RECENT_CURRENCIES_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
};

export const getCurrenciesWithRecentFirst = (recentCurrencies: CurrencyEnum[]): CurrencyEnum[] => {
  const sanitizedRecent = sanitizeRecentCurrencies(recentCurrencies);
  const recentSet = new Set(sanitizedRecent);

  return [
    ...sanitizedRecent,
    ...SUPPORTED_CURRENCIES.filter((currency) => !recentSet.has(currency)),
  ];
};
