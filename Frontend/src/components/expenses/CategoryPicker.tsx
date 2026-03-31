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
      return t(`category.${category.name}`);
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
