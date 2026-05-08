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

/**
 * Format a signed currency value.
 * Positive values show no sign by default; pass { showPlus: true } to prepend "+".
 * Negative values prepend "-". Zero and values that round to zero show no sign.
 */
export const formatSignedCurrency = (
  amount: number,
  currency: CurrencyEnum,
  options?: { showPlus?: boolean }
): string => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return formatCurrency(0, currency);
  }

  // Treat sub-cent values that round to zero as zero to avoid "-0.00"
  if (Math.abs(numericAmount) < 0.005) {
    return formatCurrency(0, currency);
  }

  const isNegative = numericAmount < 0;
  const absFormatted = formatCurrency(Math.abs(numericAmount), currency);

  if (isNegative) {
    return `-${absFormatted}`;
  }

  if (options?.showPlus) {
    return `+${absFormatted}`;
  }

  return absFormatted;
};

/**
 * Compact currency formatting for small UI spaces (chart axes, badges, compact summaries).
 * Uses Intl compact notation for values >= 1000; falls back to standard formatCurrency for smaller amounts.
 * @param options - Optional configuration
 * @param options.noDecimals - If true, removes decimal places (e.g., "1k" instead of "1.5k")
 */
export const formatCompactCurrency = (
  amount: number,
  currency: CurrencyEnum,
  options?: { noDecimals?: boolean }
): string => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) {
    return formatCurrency(0, currency);
  }

  const absAmount = Math.abs(numericAmount);

  // For small amounts use standard formatting
  if (absAmount < 1000) {
    if (options?.noDecimals) {
      return formatCurrencyNumber(numericAmount, { decimals: 0 }) + (["EUR", "PLN", "CZK", "HUF", "RON", "SEK", "DKK", "NOK"].includes(currency) ? ` ${CURRENCY_SYMBOLS[currency]}` : `${CURRENCY_SYMBOLS[currency]}`);
    }
    return formatCurrency(numericAmount, currency);
  }

  const compacted = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: options?.noDecimals ? 0 : 1,
  }).format(absAmount);

  const symbol = CURRENCY_SYMBOLS[currency];
  const symbolAfter = ["EUR", "PLN", "CZK", "HUF", "RON", "SEK", "DKK", "NOK"].includes(currency);

  const signedCompacted = numericAmount < 0 ? `-${compacted}` : compacted;

  if (symbolAfter) {
    return `${signedCompacted} ${symbol}`;
  }

  return `${symbol}${signedCompacted}`;
};

/**
 * Plain numeric formatting without currency symbol.
 * Useful for chart axes, percentages, or labels where the symbol is rendered separately.
 */
export const formatCurrencyNumber = (
  amount: number,
  options?: { decimals?: number }
): string => {
  const numericAmount = Number(amount);
  const decimals = options?.decimals ?? 2;

  if (!Number.isFinite(numericAmount)) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(0);
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numericAmount);
};
