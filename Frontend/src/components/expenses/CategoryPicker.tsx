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
import {
  getCategoryIcon,
  getCategoryVisualStyle,
  resolveCategoryGroup,
  type CategoryVisualGroup,
} from "@/utils/category";
import { Trash2 } from "lucide-react";

type CategoryPickerProps = {
  value: string; // "all" lub id kategorii jako string
  onValueChange: (value: string) => void;
  categories: ApiCategoryResponse[];
  onCreateCustomCategory?: (name: string) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
  trigger?: "button" | "select"; // jaki typ triggera użyć
  showLabel?: boolean; // czy wyświetlać "Category: " label w triggerze
  mobileInset?: boolean; // czy dodać boczny odstęp na wąskich ekranach
  showSelectedGroupPrefix?: boolean; // czy pokazywać format "Grupa: Kategoria" w triggerze
};

type CategoryGroupId =
  | "all"
  | CategoryVisualGroup;

type CategoryBucketGroupId = CategoryVisualGroup;

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

export default function CategoryPicker({
  value,
  onValueChange,
  categories,
  onCreateCustomCategory,
  onDeleteCustomCategory,
  trigger = "button",
  showLabel = true,
  mobileInset = false,
  showSelectedGroupPrefix = true,
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

  function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === "object" && error !== null && "response" in error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;

      if (typeof detail === "string" && detail.trim()) {
        const normalizedDetail = detail.trim();

        if (normalizedDetail === "Cannot delete category assigned to expenses") {
          return t("expenseFilters.deleteCategoryAssignedToExpense");
        }

        if (normalizedDetail === "Category name cannot be empty") {
          return t("expenseFilters.categoryNameEmpty");
        }

        const existsMatch = normalizedDetail.match(/^Category '(.+)' already exists$/);
        if (existsMatch) {
          return t("expenseFilters.categoryAlreadyExists", { name: existsMatch[1] });
        }

        return normalizedDetail;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallbackMessage;
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupId>("all");
  const [search, setSearch] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [createCustomCategoryError, setCreateCustomCategoryError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deleteCustomCategoryError, setDeleteCustomCategoryError] = useState<string | null>(null);

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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id.toString() === value) ?? null,
    [categories, value]
  );

  const selectedCategoryLabel = useMemo(() => {
    if (value === "all") {
      return t("categoryGroups.all");
    }

    if (!selectedCategory) {
      return t("categoryGroups.all");
    }

    const categoryLabel = getCategoryLabel(selectedCategory);
    if (!showSelectedGroupPrefix) {
      return categoryLabel;
    }

    const group = resolveCategoryGroup(selectedCategory);
    return `${getCategoryGroupLabel(group)}: ${categoryLabel}`;
  }, [selectedCategory, value, t, showSelectedGroupPrefix]);

  const SelectedCategoryIcon = useMemo(() => {
    if (!selectedCategory) {
      return null;
    }

    return getCategoryIcon(selectedCategory);
  }, [selectedCategory]);

  const selectedCategoryStyle = useMemo(
    () => getCategoryVisualStyle(selectedCategory),
    [selectedCategory]
  );

  const categoriesInSelectedGroup = useMemo(() => {
    let cats: ApiCategoryResponse[];
    if (selectedGroup === "all") {
      cats = [...categories].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      cats = groupedCategories[selectedGroup];
    }

    const trimmedSearch = search.trim();
    if (!trimmedSearch) return cats;

    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedSearch = norm(trimmedSearch);

    return cats.filter((cat) => {
      const rawName = norm(cat.name);
      const translatedLabel = norm(getCategoryLabel(cat));

      return rawName.includes(normalizedSearch) || translatedLabel.includes(normalizedSearch);
    });
  }, [categories, groupedCategories, selectedGroup, search, t]);

  useEffect(() => {
    if (!isDialogOpen) {
      setSearch("");
      setCustomCategoryName("");
      setCreateCustomCategoryError(null);
      setDeleteCustomCategoryError(null);
      setIsCreateCategoryDialogOpen(false);
    }
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

  const handleCreateCustomCategory = async () => {
    const trimmedName = customCategoryName.trim();
    if (!trimmedName || !onCreateCustomCategory || isCreatingCustomCategory) {
      return;
    }

    setIsCreatingCustomCategory(true);
    setCreateCustomCategoryError(null);

    try {
      const createdCategory = await onCreateCustomCategory(trimmedName);

      setCustomCategoryName("");
      setIsCreateCategoryDialogOpen(false);
      setSelectedGroup("custom");
      onValueChange(createdCategory.id.toString());
      setIsDialogOpen(false);
    } catch (error) {
      setCreateCustomCategoryError(getApiErrorMessage(error, t("expenseFilters.createCategoryError")));
    } finally {
      setIsCreatingCustomCategory(false);
    }
  };

  const handleDeleteCustomCategory = async (category: ApiCategoryResponse) => {
    if (!onDeleteCustomCategory || category.user_id == null || deletingCategoryId != null) {
      return;
    }

    setDeletingCategoryId(category.id);
    setDeleteCustomCategoryError(null);

    try {
      await onDeleteCustomCategory(category.id);

      if (value === category.id.toString()) {
        onValueChange("all");
      }
    } catch (error) {
      setDeleteCustomCategoryError(getApiErrorMessage(error, t("expenseFilters.deleteCategoryError")));
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const hasSearchQuery = search.trim().length > 0;

  return (
    <>
      {trigger === "button" && (
        <div className={mobileInset ? "sm:px-0" : ""}>
          <Button
            variant="outline"
            className={value === "all" ? "w-full justify-between" : "w-full justify-between pl-1"}
            onClick={() => setIsDialogOpen(true)}
          >
            <span className="flex min-w-0 items-center gap-2">
              {SelectedCategoryIcon ? (
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedCategoryStyle.badgeClass}`}>
                  <SelectedCategoryIcon className="h-4 w-4" />
                </span>
              ) : null}
              {showLabel && `${t("expenseFilters.category")}: `}
              <span className="truncate">{selectedCategoryLabel}</span>
            </span>
            <span className="text-xs text-gray-500">{t("expenseFilters.change")}</span>
          </Button>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
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

              {onCreateCustomCategory ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-between py-2 text-sm"
                  onClick={() => {
                    setCreateCustomCategoryError(null);
                    setIsCreateCategoryDialogOpen(true);
                  }}
                >
                  <span>{t("expenseFilters.addCustomCategory")}</span>
                  <span aria-hidden="true" className="text-base leading-none">+</span>
                </Button>
              ) : null}
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

                {categoriesInSelectedGroup.map((category) => {
                  const Icon = getCategoryIcon(category);
                  const style = getCategoryVisualStyle(category);
                  const isCustomCategory = category.user_id != null;
                  const isDeleting = deletingCategoryId === category.id;

                  if (isCustomCategory && onDeleteCustomCategory) {
                    return (
                      <div key={category.id} className="group relative">
                        <Button
                          type="button"
                          variant={value === category.id.toString() ? "default" : "outline"}
                          className="w-full justify-start gap-2 pl-1 pr-10"
                          onClick={() => handleCategoryChange(category.id.toString())}
                        >
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.badgeClass}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="truncate">{getCategoryLabel(category)}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={`absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 shrink-0 transition-opacity ${
                            isDeleting ? "opacity-100" : "md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                          }`}
                          aria-label={t("expenseFilters.deleteCustomCategory")}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleDeleteCustomCategory(category);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <Button
                      key={category.id}
                      type="button"
                      variant={value === category.id.toString() ? "default" : "outline"}
                      className="w-full justify-start gap-2 pl-1"
                      onClick={() => handleCategoryChange(category.id.toString())}
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.badgeClass}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate">{getCategoryLabel(category)}</span>
                    </Button>
                  );
                })}

                {categoriesInSelectedGroup.length === 0 ? (
                  <p className="text-sm text-gray-500 px-1 py-2">
                    {hasSearchQuery ? t("expenseFilters.noSearchResults") : t("expenseFilters.noCategories")}
                  </p>
                ) : null}

                {deleteCustomCategoryError ? (
                  <p className="px-1 text-xs text-red-600">{deleteCustomCategoryError}</p>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("expenseFilters.addCustomCategoryTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder={t("expenseFilters.customCategoryPlaceholder")}
              value={customCategoryName}
              onChange={(event) => setCustomCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateCustomCategory();
                }
              }}
              autoFocus
            />

            {createCustomCategoryError ? (
              <p className="px-1 text-xs text-red-600">{createCustomCategoryError}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateCategoryDialogOpen(false)}
            >
              {t("addExpenseDialog.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleCreateCustomCategory()}
              disabled={!customCategoryName.trim() || isCreatingCustomCategory}
            >
              {isCreatingCustomCategory
                ? t("expenseFilters.creatingCategory")
                : t("expenseFilters.addCustomCategory")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
