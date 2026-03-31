import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiCategoryResponse } from "@/types/category";

// TODO: Po dodaniu icon_key w API, wyświetlaj ikonę kategorii w liście wyboru

type CategoryPickerProps = {
  value: string; // "all" lub id kategorii jako string
  onValueChange: (value: string) => void;
  categories: ApiCategoryResponse[];
  trigger?: "button" | "select"; // jaki typ triggera użyć
  showLabel?: boolean; // czy wyświetlać "Category: " label w triggerze
  mobileInset?: boolean; // czy dodać boczny odstęp na wąskich ekranach
};

type CategoryGroupId =
  | "all"
  | "food"
  | "transport"
  | "home"
  | "bills"
  | "lifestyle"
  | "health"
  | "finance"
  | "education"
  | "family"
  | "other"
  | "custom";

type CategoryBucketGroupId = Exclude<CategoryGroupId, "all">;

const CATEGORY_GROUP_ORDER: CategoryGroupId[] = [
  "all",
  "food",
  "transport",
  "home",
  "bills",
  "lifestyle",
  "health",
  "finance",
  "education",
  "family",
  "other",
  "custom",
];

// Explicit mapping for backend default categories (DefaultExpenseCategory enum values).
const CATEGORY_GROUP_DEFAULT_CATEGORY_NAMES: Record<Exclude<CategoryBucketGroupId, "custom">, string[]> = {
  food: ["groceries", "restaurants", "coffee_snacks", "food_delivery"],
  transport: ["public_transport", "fuel", "taxi_rideshare", "parking_tolls", "vehicle_maintenance"],
  home: ["rent_mortgage", "household_supplies", "home_repairs"],
  bills: ["utilities", "internet_phone", "subscriptions", "insurance"],
  lifestyle: ["entertainment", "clothing", "travel", "gifts", "personal_care"],
  health: ["medical", "pharmacy", "fitness"],
  finance: ["bank_fees", "savings_investments"],
  education: ["courses_books"],
  family: ["kids_family", "pets"],
  other: ["other"],
};

const CATEGORY_GROUP_MATCHERS: Array<{ group: Exclude<CategoryBucketGroupId, "custom">; keywords: string[] }> = [
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

function resolveCategoryGroupFromDefaultCategoryName(normalizedName: string): CategoryBucketGroupId | null {
  for (const [group, categoryNames] of Object.entries(CATEGORY_GROUP_DEFAULT_CATEGORY_NAMES) as Array<
    [Exclude<CategoryBucketGroupId, "custom">, string[]]
  >) {
    if (categoryNames.some((categoryName) => normalizeCategoryName(categoryName) === normalizedName)) {
      return group;
    }
  }

  return null;
}

function resolveCategoryGroup(category: ApiCategoryResponse): CategoryBucketGroupId {
  if (category.user_id != null) {
    return "custom";
  }

  const normalizedName = normalizeCategoryName(category.name);
  const mappedDefaultGroup = resolveCategoryGroupFromDefaultCategoryName(normalizedName);

  if (mappedDefaultGroup) {
    return mappedDefaultGroup;
  }

  for (const matcher of CATEGORY_GROUP_MATCHERS) {
    if (matcher.keywords.some((keyword) => matchesKeyword(normalizedName, keyword))) {
      return matcher.group;
    }
  }

  return "other";
}

export default function CategoryPicker({
  value,
  onValueChange,
  categories,
  trigger = "button",
  showLabel = true,
  mobileInset = false,
}: CategoryPickerProps) {
  const { t } = useTranslation();

  function getCategoryLabel(category: ApiCategoryResponse): string {
    if (category.user_id == null) {
      return t(`category.${category.name}`, { defaultValue: category.name });
    }
    return category.name;
  }

  function getCategoryGroupLabel(group: CategoryGroupId): string {
    return t(`categoryGroups.${group}`);
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupId>("all");
  const [search, setSearch] = useState("");

  const groupedCategories = useMemo(() => {
    const grouped: Record<CategoryBucketGroupId, ApiCategoryResponse[]> = {
      food: [],
      transport: [],
      home: [],
      bills: [],
      lifestyle: [],
      health: [],
      finance: [],
      education: [],
      family: [],
      other: [],
      custom: [],
    };

    const sortedCategories = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    for (const category of sortedCategories) {
      grouped[resolveCategoryGroup(category)].push(category);
    }

    return grouped;
  }, [categories]);

  const visibleGroups = useMemo(
    () => CATEGORY_GROUP_ORDER.filter((group) => group === "all" || groupedCategories[group].length > 0),
    [groupedCategories]
  );

  const selectedCategoryLabel = useMemo(() => {
    if (value === "all") {
      return t("categoryGroups.all");
    }
    const cat = categories.find((category) => category.id.toString() === value);
    return cat ? getCategoryLabel(cat) : t("categoryGroups.all");
  }, [categories, value, t]);

  const categoriesInSelectedGroup = useMemo(() => {
    let cats: ApiCategoryResponse[];
    if (selectedGroup === "all") {
      cats = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      cats = groupedCategories[selectedGroup];
    }
    if (!search.trim()) return cats;
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return cats.filter((cat) => norm(cat.name).includes(norm(search)));
  }, [categories, groupedCategories, selectedGroup, search]);

  useEffect(() => {
    if (!isDialogOpen) setSearch("");
  }, [isDialogOpen]);

  useEffect(() => {
    setSearch("");
  }, [selectedGroup]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    if (value === "all") {
      setSelectedGroup("all");
      return;
    }

    const selectedCategory = categories.find((category) => category.id.toString() === value);
    setSelectedGroup(selectedCategory ? resolveCategoryGroup(selectedCategory) : "all");
  }, [categories, value, isDialogOpen]);

  const handleCategoryChange = (newValue: string) => {
    onValueChange(newValue);
    setIsDialogOpen(false);
  };

  return (
    <>
      {trigger === "button" && (
        <div className={mobileInset ? "sm:px-0" : ""}>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsDialogOpen(true)}
          >
            <span>
              {showLabel && `${t("expenseFilters.category")}: `}
              {selectedCategoryLabel}
            </span>
            <span className="text-xs text-gray-500">{t("expenseFilters.change")}</span>
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("expenseFilters.selectCategory")}</DialogTitle>
            <DialogDescription>
              {t("expenseFilters.chooseGroup")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)] gap-3">
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {visibleGroups.map((group) => (
                <Button
                  key={group}
                  type="button"
                  variant={selectedGroup === group ? "default" : "outline"}
                  className="w-full justify-between"
                  onClick={() => setSelectedGroup(group)}
                >
                  <span>{getCategoryGroupLabel(group)}</span>
                  {group !== "all" ? (
                    <span className="text-xs opacity-70">{groupedCategories[group].length}</span>
                  ) : null}
                </Button>
              ))}
            </div>

            <div>
              <Input
                placeholder={t("expenseFilters.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                <Button
                  type="button"
                  variant={value === "all" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleCategoryChange("all")}
                >
                  {t("expenseFilters.allCategories")}
                </Button>

                {categoriesInSelectedGroup.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={value === category.id.toString() ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleCategoryChange(category.id.toString())}
                  >
                    {getCategoryLabel(category)}
                  </Button>
                ))}

                {categoriesInSelectedGroup.length === 0 ? (
                  <p className="text-sm text-gray-500 px-1 py-2">{t("expenseFilters.noCategories")}</p>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
