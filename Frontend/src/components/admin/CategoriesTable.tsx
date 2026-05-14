import type { TFunction } from "i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CATEGORY_SECTION_OPTIONS, formatDateTime } from "@/utils/adminUtils";
import { formatCategoryNameForDisplay } from "@/utils/category";
import type { ApiCategoryResponse } from "@/types";
import type { CategorySection } from "@/types/enums";

type CategoriesTableProps = {
    categories: ApiCategoryResponse[];
    isLoading: boolean;
    errorMessage: string | null;
    editingCategoryId: number | null;
    editingCategoryName: string;
    editingCategorySection: CategorySection;
    setEditingCategoryName: (value: string) => void;
    setEditingCategorySection: (value: CategorySection) => void;
    onStartEdit: (category: ApiCategoryResponse) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: (category: ApiCategoryResponse) => void;
    pendingCategoryAction: number | "create" | null;
    getSectionLabel: (section: CategorySection | null | undefined) => string;
    t: TFunction;
};

export default function CategoriesTable({
    categories,
    isLoading,
    errorMessage,
    editingCategoryId,
    editingCategoryName,
    editingCategorySection,
    setEditingCategoryName,
    setEditingCategorySection,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    pendingCategoryAction,
    getSectionLabel,
    t,
}: CategoriesTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((index) => (
                    <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
                ))}
            </div>
        );
    }

    if (errorMessage) {
        return <div className="text-sm text-destructive">{errorMessage}</div>;
    }

    if (categories.length === 0) {
        return <div className="text-sm text-muted-foreground">{t("adminPage.emptyCategories")}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left">
                        <th>{t("adminPage.table.categoryName")}</th>
                        <th>{t("adminPage.table.section")}</th>
                        <th>{t("adminPage.table.createdAt")}</th>
                        <th>{t("adminPage.table.actions")}</th>
                    </tr>
                </thead>
                <tbody className="[&>tr]:border-b [&>tr]:border-border/60">
                    {categories.map((category) => {
                        const isEditing = editingCategoryId === category.id;
                        const isBusy = pendingCategoryAction === category.id;
                        const localizedCategoryName = t(`category.${category.name}`, {
                            defaultValue: formatCategoryNameForDisplay(category.name),
                        });

                        return (
                            <tr key={category.id} className="[&>td]:px-3 [&>td]:py-3">
                                <td>
                                    {isEditing ? (
                                        <Input
                                            value={editingCategoryName}
                                            onChange={(event) => setEditingCategoryName(event.target.value)}
                                            placeholder={t("adminPage.defaultCategoryNamePlaceholder")}
                                        />
                                    ) : (
                                        <div>
                                            <div className="font-medium text-foreground">{localizedCategoryName}</div>
                                            <div className="text-xs text-muted-foreground">{category.name}</div>
                                        </div>
                                    )}
                                </td>

                                <td>
                                    {isEditing ? (
                                        <Select
                                            value={editingCategorySection}
                                            onValueChange={(value) => setEditingCategorySection(value as CategorySection)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {CATEGORY_SECTION_OPTIONS.map((section) => (
                                                    <SelectItem key={section} value={section}>
                                                        {getSectionLabel(section)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant="outline">{getSectionLabel(category.section)}</Badge>
                                    )}
                                </td>

                                <td>{formatDateTime(category.created_at, t("adminPage.notAvailable"))}</td>

                                <td>
                                    {isEditing ? (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                onClick={onSaveEdit}
                                                disabled={isBusy}
                                            >
                                                {isBusy
                                                    ? t("adminPage.actions.processing")
                                                    : t("adminPage.actions.saveCategory")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={onCancelEdit}
                                                disabled={isBusy}
                                            >
                                                {t("adminPage.actions.cancelEdit")}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isBusy || pendingCategoryAction === "create"}
                                                onClick={() => onStartEdit(category)}
                                            >
                                                {t("adminPage.actions.editCategory")}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                disabled={isBusy || pendingCategoryAction === "create"}
                                                onClick={() => onDelete(category)}
                                            >
                                                {isBusy
                                                    ? t("adminPage.actions.processing")
                                                    : t("adminPage.actions.deleteCategory")}
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
