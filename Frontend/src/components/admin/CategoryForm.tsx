import type { TFunction } from "i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CATEGORY_SECTION_OPTIONS } from "@/utils/adminUtils";
import type { CategorySection } from "@/types/enums";

type CategoryFormProps = {
    name: string;
    section: CategorySection;
    setName: (value: string) => void;
    setSection: (value: CategorySection) => void;
    onCreate: () => void;
    pendingCategoryAction: number | "create" | null;
    getSectionLabel: (section: CategorySection | null | undefined) => string;
    t: TFunction;
};

export default function CategoryForm({
    name,
    section,
    setName,
    setSection,
    onCreate,
    pendingCategoryAction,
    getSectionLabel,
    t,
}: CategoryFormProps) {
    return (
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-1">
                <Label>{t("adminPage.defaultCategoryNameLabel")}</Label>
                <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("adminPage.defaultCategoryNamePlaceholder")}
                />
            </div>

            <div className="space-y-2 md:col-span-1">
                <Label>{t("adminPage.defaultCategorySectionLabel")}</Label>
                <Select
                    value={section}
                    onValueChange={(value) => setSection(value as CategorySection)}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORY_SECTION_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                                {getSectionLabel(option)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-end md:col-span-1">
                <Button
                    className="w-full"
                    onClick={onCreate}
                    disabled={pendingCategoryAction === "create"}
                >
                    {pendingCategoryAction === "create"
                        ? t("adminPage.actions.processing")
                        : t("adminPage.actions.addDefaultCategory")}
                </Button>
            </div>
        </div>
    );
}
