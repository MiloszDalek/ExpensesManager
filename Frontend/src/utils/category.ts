import { categoryIcons } from "@/types/categoryIcons";
import { Smartphone } from "lucide-react";
import type { ApiCategoryResponse } from "@/types/category";

export type CategoryVisualGroup =
  | "food"
  | "transport"
  | "home"
  | "bills"
  | "lifestyle"
  | "health"
  | "finance"
  | "education"
  | "family"
  | "other";

const CATEGORY_GROUP_DEFAULT_CATEGORY_NAMES: Record<CategoryVisualGroup, string[]> = {
  food: ["groceries", "restaurants", "coffee_snacks", "food_delivery", "food_other"],
  transport: ["public_transport", "fuel", "taxi_rideshare", "parking_tolls", "vehicle_maintenance", "transport_other"],
  home: ["rent_mortgage", "household_supplies", "home_repairs", "home_other"],
  bills: ["utilities", "internet_phone", "subscriptions", "insurance", "bills_other"],
  lifestyle: ["entertainment", "clothing", "travel", "gifts", "personal_care", "lifestyle_other"],
  health: ["medical", "pharmacy", "fitness", "health_other"],
  finance: ["bank_fees", "savings", "investments", "finance_other"],
  education: ["courses", "books", "education_other"],
  family: ["kids_family", "pets", "family_other"],
  other: ["other"],
};

const CATEGORY_GROUP_MATCHERS: Array<{ group: CategoryVisualGroup; keywords: string[] }> = [
  { group: "food", keywords: ["food", "foods", "meal", "meals", "restaurant", "restaurants", "grocery", "groceries", "coffee", "snack", "snacks", "delivery"] },
  { group: "transport", keywords: ["transport", "transports", "fuel", "taxi", "bus", "train", "uber", "parking", "toll"] },
  { group: "home", keywords: ["home", "rent", "accommodation", "furniture", "house", "mieszkanie", "czynsz"] },
  { group: "bills", keywords: ["bill", "bills", "subscription", "subscriptions", "internet", "phone", "utility", "utilities", "media", "insurance", "oplata", "rachunek"] },
  { group: "lifestyle", keywords: ["shopping", "entertainment", "hobby", "fun", "clothes", "gift", "gifts", "personal care", "rozrywka"] },
  { group: "health", keywords: ["health", "medical", "doctor", "pharmacy", "sport", "gym", "zdrowie", "fitness"] },
  { group: "finance", keywords: ["finance", "finances", "bank", "fee", "fees", "saving", "savings", "investment", "investments", "oszczed", "finans"] },
  { group: "education", keywords: ["education", "course", "book", "school", "university", "nauka", "kurs"] },
  { group: "family", keywords: ["family", "kid", "child", "baby", "pet", "dzieci", "rodzin", "zwierzak"] },
];

type CategoryLike = ApiCategoryResponse | string | null | undefined;

export function formatCategoryNameForDisplay(categoryName: string): string {
  const normalized = categoryName.replace(/_/g, " ").trim();

  if (!normalized) {
    return categoryName;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function splitNameToTokens(normalizedName: string): string[] {
  return normalizedName.split(/[^a-z0-9]+/).filter(Boolean);
}

function matchesKeyword(normalizedName: string, keyword: string): boolean {
  const normalizedKeyword = normalizeCategoryName(keyword);

  if (normalizedKeyword.includes(" ")) {
    return normalizedName.includes(normalizedKeyword);
  }

  const tokens = splitNameToTokens(normalizedName);
  return tokens.includes(normalizedKeyword);
}

function isCategoryObject(category: CategoryLike): category is ApiCategoryResponse {
  return !!category && typeof category === "object" && "name" in category;
}

function isCategoryVisualGroup(value: string): value is CategoryVisualGroup {
  return (
    value === "food" ||
    value === "transport" ||
    value === "home" ||
    value === "bills" ||
    value === "lifestyle" ||
    value === "health" ||
    value === "finance" ||
    value === "education" ||
    value === "family" ||
    value === "other"
  );
}

function getCategoryName(category: CategoryLike): string | null {
  if (typeof category === "string") {
    return category;
  }

  if (isCategoryObject(category)) {
    return category.name;
  }

  return null;
}

export function resolveCategoryGroup(category: CategoryLike): CategoryVisualGroup {
  if (isCategoryObject(category) && typeof category.section === "string" && isCategoryVisualGroup(category.section)) {
    return category.section;
  }

  const categoryName = getCategoryName(category);
  if (!categoryName) {
    return "other";
  }

  const normalizedName = normalizeCategoryName(categoryName);

  for (const [group, categoryNames] of Object.entries(CATEGORY_GROUP_DEFAULT_CATEGORY_NAMES) as Array<
    [Exclude<CategoryVisualGroup, "custom">, string[]]
  >) {
    if (categoryNames.some((categoryNameInGroup) => normalizeCategoryName(categoryNameInGroup) === normalizedName)) {
      return group;
    }
  }

  for (const matcher of CATEGORY_GROUP_MATCHERS) {
    if (matcher.keywords.some((keyword) => matchesKeyword(normalizedName, keyword))) {
      return matcher.group;
    }
  }

  return "other";
}

function toCategoryIconKey(category: CategoryLike): string {
  const categoryName = getCategoryName(category);
  if (!categoryName) {
    return "other";
  }

  const key = categoryName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return key || "other";
}

export function getCategoryIcon(category: CategoryLike) {
  const iconKey = toCategoryIconKey(category);

  if (iconKey.endsWith("_other")) {
    return categoryIcons.other || Smartphone;
  }

  if (iconKey in categoryIcons) {
    return categoryIcons[iconKey as keyof typeof categoryIcons];
  }

  const groupKey = resolveCategoryGroup(category);
  if (groupKey in categoryIcons) {
    return categoryIcons[groupKey as keyof typeof categoryIcons];
  }

  return categoryIcons.other || Smartphone;
}

const CATEGORY_GROUP_STYLES: Record<CategoryVisualGroup, { badgeClass: string; gradientClass: string }> = {
  food: {
    badgeClass: "bg-amber-100 text-amber-700",
    gradientClass: "from-amber-500 to-orange-500",
  },
  transport: {
    badgeClass: "bg-sky-100 text-sky-700",
    gradientClass: "from-sky-500 to-blue-500",
  },
  home: {
    badgeClass: "bg-teal-100 text-teal-700",
    gradientClass: "from-teal-500 to-emerald-500",
  },
  bills: {
    badgeClass: "bg-indigo-100 text-indigo-700",
    gradientClass: "from-indigo-500 to-blue-600",
  },
  lifestyle: {
    badgeClass: "bg-pink-100 text-pink-700",
    gradientClass: "from-pink-500 to-rose-500",
  },
  health: {
    badgeClass: "bg-emerald-100 text-emerald-700",
    gradientClass: "from-emerald-500 to-green-500",
  },
  finance: {
    badgeClass: "bg-cyan-100 text-cyan-700",
    gradientClass: "from-cyan-500 to-sky-600",
  },
  education: {
    badgeClass: "bg-violet-100 text-violet-700",
    gradientClass: "from-violet-500 to-purple-600",
  },
  family: {
    badgeClass: "bg-fuchsia-100 text-fuchsia-700",
    gradientClass: "from-fuchsia-500 to-pink-600",
  },
  other: {
    badgeClass: "bg-slate-100 text-slate-700",
    gradientClass: "from-slate-500 to-gray-600",
  },
};

export function getCategoryVisualStyle(category: CategoryLike) {
  const group = resolveCategoryGroup(category);
  return CATEGORY_GROUP_STYLES[group];
}

const UNCATEGORIZED_CATEGORY_NAMES = new Set([
  "other",
  "uncategorized",
  "inne",
  "bez kategorii",
]);

export function getDefaultCategoryId(categories: ApiCategoryResponse[]): number {
  if (categories.length === 0) {
    return 0;
  }

  const uncategorizedBySection = categories.find((category) => category.section === "other");
  if (uncategorizedBySection) {
    return uncategorizedBySection.id;
  }

  const uncategorizedCategory = categories.find((category) =>
    UNCATEGORIZED_CATEGORY_NAMES.has(normalizeCategoryName(category.name))
  );

  return uncategorizedCategory?.id ?? categories[0].id;
}
