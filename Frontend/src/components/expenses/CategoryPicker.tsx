import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiCategoryResponse } from "@/types/category";
import {
  CATEGORY_GROUP_STYLES,
  formatCategoryNameForDisplay,
  getCategoryIcon,
  getCategoryVisualStyle,
  resolveCategoryGroup,
  type CategoryVisualGroup,
} from "@/utils/category";
import { getRecentCategoryIds, rememberRecentCategoryId } from "@/utils/categoryRecent";
import { CircleQuestionMark, Trash2, X } from "lucide-react";

type CommonCategoryPickerProps = {
  categories: ApiCategoryResponse[];
  onCreateCustomCategory?: (payload: { name: string; section: CategoryVisualGroup }) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
  allowAllSelection?: boolean;
  trigger?: "button" | "select";
  showLabel?: boolean;
  mobileInset?: boolean;
  showSelectedGroupPrefix?: boolean;
};

type SingleCategoryPickerProps = CommonCategoryPickerProps & {
  mode?: "single";
  value: string;
  onValueChange: (value: string) => void;
};

type MultipleCategoryPickerProps = CommonCategoryPickerProps & {
  mode: "multiple";
  value: string[];
  onValueChange: (value: string[]) => void;
  showSelectedBadges?: boolean;
};

type CategoryPickerProps = SingleCategoryPickerProps | MultipleCategoryPickerProps;

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
];

const CATEGORY_SECTION_OPTIONS: CategoryVisualGroup[] = [
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
];

export default function CategoryPicker(props: CategoryPickerProps) {
  const {
    value,
    onValueChange,
    mode = "single",
    categories,
    onCreateCustomCategory,
    onDeleteCustomCategory,
    allowAllSelection = false,
    trigger = "button",
    showLabel = true,
    mobileInset = false,
    showSelectedGroupPrefix = true,
    showSelectedBadges = false,
  } = props as CategoryPickerProps & { showSelectedBadges?: boolean };

  const { t } = useTranslation();
  const isMulti = mode === "multiple";

  function mapKnownCategoryErrorMessage(message: string): string {
    const normalizedMessage = message.trim();

    if (
      normalizedMessage === "Cannot delete category assigned to expenses" ||
      normalizedMessage === "Cannot delete category assigned to expense"
    ) {
      return t("expenseFilters.deleteCategoryAssignedToExpense");
    }

    if (normalizedMessage === "Category name cannot be empty") {
      return t("expenseFilters.categoryNameEmpty");
    }

    const existsMatch = normalizedMessage.match(/^Category '(.+)' already exists$/);
    if (existsMatch) {
      return t("expenseFilters.categoryAlreadyExists", { name: existsMatch[1] });
    }

    return normalizedMessage;
  }

  const getCategoryLabel = useCallback((category: ApiCategoryResponse): string => {
    if (category.user_id == null) {
      return t(`category.${category.name}`, { defaultValue: formatCategoryNameForDisplay(category.name) });
    }
    return category.name;
  }, [t]);

  const getCategoryGroupLabel = useCallback((group: CategoryGroupId): string => {
    return t(`categoryGroups.${group}`);
  }, [t]);

  function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    if (typeof error === "object" && error !== null && "response" in error) {
      const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;

      if (typeof detail === "string" && detail.trim()) {
        return mapKnownCategoryErrorMessage(detail);
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return mapKnownCategoryErrorMessage(error.message);
    }

    return fallbackMessage;
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateCategoryDialogOpen, setIsCreateCategoryDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<CategoryGroupId>("all");
  const [search, setSearch] = useState("");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [customCategorySection, setCustomCategorySection] = useState<CategoryVisualGroup | "">("");
  const [isCreatingCustomCategory, setIsCreatingCustomCategory] = useState(false);
  const [createCustomCategoryError, setCreateCustomCategoryError] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [deleteCustomCategoryError, setDeleteCustomCategoryError] = useState<string | null>(null);
  const [recentCategoryIds, setRecentCategoryIds] = useState<number[]>([]);
  const [draftSelectedValues, setDraftSelectedValues] = useState<string[]>([]);

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

  const selectedCategory = useMemo(() => {
    if (isMulti) return null;
    return categories.find((category) => category.id.toString() === (value as string)) ?? null;
  }, [categories, value, isMulti]);

  const selectedCategoryLabel = useMemo(() => {
    if (isMulti) {
      const ids = value as string[];
      if (ids.length === 0) {
        return t("expenseFilters.allCategories");
      }
      if (ids.length <= 2) {
        return ids
          .map((id) => {
            const cat = categories.find((c) => c.id.toString() === id);
            return cat ? getCategoryLabel(cat) : "";
          })
          .filter(Boolean)
          .join(", ");
      }
      return t("expenseFilters.nCategoriesSelected", { count: ids.length });
    }

    const singleValue = value as string;
    if (singleValue === "all") {
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
  }, [selectedCategory, value, t, showSelectedGroupPrefix, getCategoryGroupLabel, getCategoryLabel, isMulti, categories]);

  const SelectedCategoryIcon = useMemo(() => {
    if (isMulti || !selectedCategory) {
      return null;
    }
    return getCategoryIcon(selectedCategory);
  }, [selectedCategory, isMulti]);

  const selectedCategoryStyle = useMemo(() => {
    if (isMulti || !selectedCategory) {
      return getCategoryVisualStyle(null);
    }
    return getCategoryVisualStyle(selectedCategory);
  }, [selectedCategory, isMulti]);

  const categoriesInSelectedGroup = useMemo(() => {
    let cats: ApiCategoryResponse[];
    if (selectedGroup === "all") {
      const recentRankById = new Map(recentCategoryIds.map((id, index) => [id, index]));

      cats = [...categories].sort((left, right) => {
        const leftRank = recentRankById.get(left.id);
        const rightRank = recentRankById.get(right.id);

        if (leftRank !== undefined && rightRank !== undefined) {
          return leftRank - rightRank;
        }

        if (leftRank !== undefined) {
          return -1;
        }

        if (rightRank !== undefined) {
          return 1;
        }

        return left.name.localeCompare(right.name);
      });
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
  }, [categories, groupedCategories, recentCategoryIds, selectedGroup, search, getCategoryLabel]);

  useEffect(() => {
    if (!isDialogOpen) {
      setSearch("");
      setCustomCategoryName("");
      setCustomCategorySection("");
      setCreateCustomCategoryError(null);
      setDeleteCustomCategoryError(null);
      setIsCreateCategoryDialogOpen(false);
      return;
    }

    setRecentCategoryIds(getRecentCategoryIds());
    if (isMulti) {
      setDraftSelectedValues([...(value as string[])]);
    }
  }, [isDialogOpen, isMulti, value]);

  useEffect(() => {
    setSearch("");
  }, [selectedGroup]);

  useEffect(() => {
    if (!isDialogOpen || isMulti) {
      return;
    }

    const singleValue = value as string;
    if (singleValue === "all") {
      setSelectedGroup("all");
      return;
    }

    const activeCategory = categories.find((category) => category.id.toString() === singleValue);
    setSelectedGroup(activeCategory ? resolveCategoryGroup(activeCategory) : "all");
  }, [categories, value, isDialogOpen, isMulti]);

  const handleCategoryChange = (newValue: string) => {
    if (isMulti) {
      setDraftSelectedValues((prev) => {
        const next = prev.includes(newValue)
          ? prev.filter((id) => id !== newValue)
          : [...prev, newValue];
        return next;
      });
      const categoryId = Number(newValue);
      if (Number.isInteger(categoryId) && categoryId > 0) {
        setRecentCategoryIds(rememberRecentCategoryId(categoryId));
      }
      return;
    }

    if (newValue === "all" && !allowAllSelection) {
      return;
    }

    if (newValue !== "all") {
      const categoryId = Number(newValue);
      if (Number.isInteger(categoryId) && categoryId > 0) {
        setRecentCategoryIds(rememberRecentCategoryId(categoryId));
      }
    }

    (onValueChange as (value: string) => void)(newValue);
    setIsDialogOpen(false);
  };

  const handleCreateCustomCategory = async () => {
    const trimmedName = customCategoryName.trim();
    if (!trimmedName || !customCategorySection || !onCreateCustomCategory || isCreatingCustomCategory) {
      return;
    }

    setIsCreatingCustomCategory(true);
    setCreateCustomCategoryError(null);

    try {
      const createdCategory = await onCreateCustomCategory({
        name: trimmedName,
        section: customCategorySection,
      });

      setCustomCategoryName("");
      setCustomCategorySection("");
      setIsCreateCategoryDialogOpen(false);
      setSelectedGroup(createdCategory.section ?? customCategorySection);
      setRecentCategoryIds(rememberRecentCategoryId(createdCategory.id));

      if (isMulti) {
        setDraftSelectedValues((prev) => [...prev, createdCategory.id.toString()]);
      } else {
        (onValueChange as (value: string) => void)(createdCategory.id.toString());
        setIsDialogOpen(false);
      }
    } catch (error) {
      setCreateCustomCategoryError(getApiErrorMessage(error, t("expenseFilters.createCategoryError")));
    } finally {
      setIsCreatingCustomCategory(false);
    }
  };

  const handleDeleteCustomCategory = async (category: ApiCategoryResponse) => {
    const isScopedCategory = category.user_id != null || category.group_id != null;

    if (!onDeleteCustomCategory || !isScopedCategory || deletingCategoryId != null) {
      return;
    }

    setDeletingCategoryId(category.id);
    setDeleteCustomCategoryError(null);

    try {
      await onDeleteCustomCategory(category.id);
      const catIdStr = category.id.toString();

      if (isMulti) {
        setDraftSelectedValues((prev) => prev.filter((id) => id !== catIdStr));
        const committed = value as string[];
        if (committed.includes(catIdStr)) {
          (onValueChange as (value: string[]) => void)(committed.filter((id) => id !== catIdStr));
        }
      } else {
        if ((value as string) === catIdStr) {
          (onValueChange as (value: string) => void)("all");
        }
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
            className={!isMulti && (value as string) === "all" ? "w-full justify-between pl-3" : "w-full justify-between pl-3"}
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
            <span className="text-xs text-muted-foreground">{t("expenseFilters.change")}</span>
          </Button>

          {isMulti && showSelectedBadges && (value as string[]).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(value as string[]).slice(0, 5).map((catId) => {
                const cat = categories.find((c) => c.id.toString() === catId);
                if (!cat) return null;
                const Icon = getCategoryIcon(cat);
                const style = getCategoryVisualStyle(cat);
                return (
                  <span
                    key={catId}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${style.badgeClass}`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm ${style.badgeClass}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="truncate max-w-[120px]">{getCategoryLabel(cat)}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const next = (value as string[]).filter((id) => id !== catId);
                        (onValueChange as (value: string[]) => void)(next);
                      }}
                      className="ml-1 rounded-sm hover:bg-muted inline-flex items-center justify-center"
                      aria-label={t("expenseFilters.removeCategory", { defaultValue: "Remove category" })}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {(value as string[]).length > 6 && (
                <span className="inline-flex items-center rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  +{(value as string[]).length - 5} {t("expenseFilters.more", { defaultValue: "more" })}
                </span>
              )}
            </div>
          )}
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
                    setCustomCategorySection(selectedGroup === "all" ? "" : selectedGroup);
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
              />

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {allowAllSelection && !isMulti ? (
                  <Button
                    type="button"
                    variant={(value as string) === "all" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleCategoryChange("all")}
                  >
                    {t("expenseFilters.allCategories")}
                  </Button>
                ) : null}

                {categoriesInSelectedGroup.map((category) => {
                  const Icon = getCategoryIcon(category);
                  const style = getCategoryVisualStyle(category);
                  const isScopedCategory = category.user_id != null || category.group_id != null;
                  const isDeleting = deletingCategoryId === category.id;
                  const isSelected = isMulti
                    ? draftSelectedValues.includes(category.id.toString())
                    : (value as string) === category.id.toString();

                  if (isScopedCategory && onDeleteCustomCategory) {
                    return (
                      <div key={category.id} className="group relative">
                        <Button
                          type="button"
                          variant={isSelected ? "default" : "outline"}
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
                      variant={isSelected ? "default" : "outline"}
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
                  <p className="text-sm text-muted-foreground px-1 py-2">
                    {hasSearchQuery ? t("expenseFilters.noSearchResults") : t("expenseFilters.noCategories")}
                  </p>
                ) : null}

                {deleteCustomCategoryError ? (
                  <p className="px-1 text-xs text-destructive">{deleteCustomCategoryError}</p>
                ) : null}
              </div>
            </div>
          </div>

          {isMulti && (
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDraftSelectedValues([])}
              >
                {t("expenseFilters.clear", { defaultValue: "Clear" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                {t("addExpenseDialog.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  (onValueChange as (value: string[]) => void)(draftSelectedValues);
                  setIsDialogOpen(false);
                }}
              >
                {t("expenseFilters.applyCategories", { defaultValue: "Apply" })}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateCategoryDialogOpen} onOpenChange={setIsCreateCategoryDialogOpen}>
        <DialogContent className="sm:max-w-sm sm:top-[45%]">
          <DialogHeader>
            <DialogTitle>{t("expenseFilters.addCustomCategoryTitle")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder={t("expenseFilters.customCategoryPlaceholder")}
              value={customCategoryName}
              onChange={(event) => setCustomCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && customCategorySection) {
                  event.preventDefault();
                  void handleCreateCustomCategory();
                }
              }}
              autoFocus
            />

            <p className="text-sm text-muted-foreground">{t("expenseFilters.customCategorySectionLabel")}</p>

            <Select
              value={customCategorySection}
              onValueChange={(value) => setCustomCategorySection(value as CategoryVisualGroup)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("expenseFilters.customCategorySectionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_SECTION_OPTIONS.map((section) => {
                  const style = CATEGORY_GROUP_STYLES[section];
                  return (
                    <SelectItem key={section} value={section}>
                      <span className="flex items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${style.badgeClass}`}>
                          <CircleQuestionMark className="h-4 w-4 text-current" />
                        </span>
                        {getCategoryGroupLabel(section)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {createCustomCategoryError ? (
              <p className="px-1 text-xs text-destructive">{createCustomCategoryError}</p>
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
              disabled={!customCategoryName.trim() || !customCategorySection || isCreatingCustomCategory}
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
