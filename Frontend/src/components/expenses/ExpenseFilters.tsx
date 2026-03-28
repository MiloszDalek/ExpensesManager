import { useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

// TODO: Po dodaniu icon_key w API, wyświetlaj ikonę kategorii w liście wyboru

type ExpenseFiltersProps = {
  filters: {
    category: string;
    [key: string]: unknown;
  };
  onFilterChange: (next: ExpenseFiltersProps["filters"]) => void;
  categories: ApiCategoryResponse[];
};

type CategoryGroupId =
  | "all"
  | "food"
  | "transport"
  | "home"
  | "bills"
  | "lifestyle"
  | "health"
  | "other"
  | "custom";

type CategoryBucketGroupId = Exclude<CategoryGroupId, "all">;

const CATEGORY_GROUP_LABELS: Record<CategoryGroupId, string> = {
  all: "All",
  food: "Food",
  transport: "Transport",
  home: "Home",
  bills: "Bills",
  lifestyle: "Lifestyle",
  health: "Health",
  other: "Other",
  custom: "Custom",
};

const CATEGORY_GROUP_ORDER: CategoryGroupId[] = [
  "all",
  "food",
  "transport",
  "home",
  "bills",
  "lifestyle",
  "health",
  "other",
  "custom",
];

const CATEGORY_GROUP_MATCHERS: Array<{ group: Exclude<CategoryBucketGroupId, "custom">; keywords: string[] }> = [
  { group: "food", keywords: ["food", "meal", "restaurant", "grocery", "groceries", "jedzenie", "zakupy spozywcze"] },
  { group: "transport", keywords: ["transport", "travel", "fuel", "car", "taxi", "bus", "train", "uber"] },
  { group: "home", keywords: ["home", "rent", "accommodation", "furniture", "house", "mieszkanie", "czynsz"] },
  { group: "bills", keywords: ["bill", "subscription", "internet", "phone", "utility", "media", "oplata", "rachunek"] },
  { group: "lifestyle", keywords: ["shopping", "entertainment", "hobby", "fun", "clothes", "gift", "rozrywka"] },
  { group: "health", keywords: ["health", "medical", "doctor", "pharmacy", "sport", "gym", "zdrowie"] },
];

function normalizeCategoryName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function resolveCategoryGroup(category: ApiCategoryResponse): CategoryBucketGroupId {
  if (category.user_id != null) {
    return "custom";
  }

  const normalizedName = normalizeCategoryName(category.name);

  for (const matcher of CATEGORY_GROUP_MATCHERS) {
    if (matcher.keywords.some((keyword) => normalizedName.includes(keyword))) {
      return matcher.group;
    }
  }

  // Safe fallback for unknown default category names.
  return "other";
}

export default function ExpenseFilters({ filters, onFilterChange, categories }: ExpenseFiltersProps) {
  const { t } = useTranslation();

  function getCategoryLabel(category: ApiCategoryResponse) {
    if (category.user_id == null) {
      return t(`category.${category.name}`);
    }
    return category.name;
  }
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
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
    if (filters.category === "all") {
      return t("category.all");
    }
    const cat = categories.find((category) => category.id.toString() === filters.category);
    return cat ? getCategoryLabel(cat) : t("category.all");
  }, [categories, filters.category, t]);

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
  // Reset search when dialog closes or group changes
  useEffect(() => {
    if (!isCategoryDialogOpen) setSearch("");
  }, [isCategoryDialogOpen]);
  useEffect(() => {
    setSearch("");
  }, [selectedGroup]);

  useEffect(() => {
    if (!isCategoryDialogOpen) {
      return;
    }

    if (filters.category === "all") {
      setSelectedGroup("all");
      return;
    }

    const selectedCategory = categories.find((category) => category.id.toString() === filters.category);
    setSelectedGroup(selectedCategory ? resolveCategoryGroup(selectedCategory) : "all");
  }, [categories, filters.category, isCategoryDialogOpen]);

  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value });
    setIsCategoryDialogOpen(false);
  };

  return (
    <div className="mb-6">
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setIsCategoryDialogOpen(true)}
      >
        <span>Category: {selectedCategoryLabel}</span>
        <span className="text-xs text-gray-500">Change</span>
      </Button>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select category</DialogTitle>
            <DialogDescription>
              Choose a group on the left and a subcategory on the right.
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
                  <span>{CATEGORY_GROUP_LABELS[group]}</span>
                  {group !== "all" ? (
                    <span className="text-xs opacity-70">{groupedCategories[group].length}</span>
                  ) : null}
                </Button>
              ))}
            </div>

            <div>
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                <Button
                  type="button"
                  variant={filters.category === "all" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => handleCategoryChange("all")}
                >
                  All categories
                </Button>

                {categoriesInSelectedGroup.map((category) => (
                  <Button
                    key={category.id}
                    type="button"
                    variant={filters.category === category.id.toString() ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleCategoryChange(category.id.toString())}
                  >
                    {getCategoryLabel(category)}
                  </Button>
                ))}

                {categoriesInSelectedGroup.length === 0 ? (
                  <p className="text-sm text-gray-500 px-1 py-2">No categories in this group.</p>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}