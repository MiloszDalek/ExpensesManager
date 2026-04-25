import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";

const RECENT_CURRENCIES_STORAGE_KEY = "expensesManager.recentCurrencies";
const RECENT_CURRENCIES_LIMIT = 5;

// Currency symbols mapping
export const CURRENCY_SYMBOLS: Record<CurrencyEnum, string> = {
  "AED": "د.إ",
  "AUD": "A$",
  "CAD": "C$",
  "CHF": "CHF",
  "CNY": "¥",
  "CZK": "Kč",
  "DKK": "kr",
  "PLN": "zł",
  "EUR": "€",
  "GBP": "£",
  "HKD": "HK$",
  "HUF": "Ft",
  "ILS": "₪",
  "JPY": "¥",
  "NOK": "kr",
  "NZD": "NZ$",
  "RON": "lei",
  "SEK": "kr",
  "SGD": "S$",
  "TRY": "₺",
  "USD": "$",
  "ZAR": "R",
};

// Format currency with symbol
export const formatCurrency = (amount: number, currency: CurrencyEnum): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formattedAmount = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  // For most currencies, symbol goes before amount
  // For some European currencies like EUR, symbol goes after amount
  const symbolAfter = ["EUR", "PLN", "CZK", "HUF", "RON", "SEK", "DKK", "NOK"].includes(currency);
  
  if (symbolAfter) {
    return `${formattedAmount} ${symbol}`;
  }
  
  return `${symbol}${formattedAmount}`;
};

// Get currency symbol only
export const getCurrencySymbol = (currency: CurrencyEnum): string => {
  return CURRENCY_SYMBOLS[currency];
};

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
