const RECENT_CATEGORY_IDS_STORAGE_KEY = "expensesManager.recentCategoryIds";
const RECENT_CATEGORY_IDS_LIMIT = 8;

const sanitizeRecentCategoryIds = (values: number[]): number[] => {
  const unique: number[] = [];

  values.forEach((value) => {
    if (Number.isInteger(value) && value > 0 && !unique.includes(value)) {
      unique.push(value);
    }
  });

  return unique.slice(0, RECENT_CATEGORY_IDS_LIMIT);
};

export const getRecentCategoryIds = (): number[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(RECENT_CATEGORY_IDS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const ids = parsed
      .map((item) => (typeof item === "number" ? item : Number(item)))
      .filter((item) => Number.isFinite(item));

    return sanitizeRecentCategoryIds(ids);
  } catch {
    return [];
  }
};

export const rememberRecentCategoryId = (categoryId: number): number[] => {
  const next = sanitizeRecentCategoryIds([categoryId, ...getRecentCategoryIds()]);

  if (typeof window !== "undefined") {
    localStorage.setItem(RECENT_CATEGORY_IDS_STORAGE_KEY, JSON.stringify(next));
  }

  return next;
};
