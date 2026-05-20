import type { TFunction } from "i18next";
import { FilterX, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { SystemUserRole } from "@/types/enums";

type RoleFilter = "all" | SystemUserRole;
type ActiveFilter = "all" | "active" | "inactive";

type UserFiltersCardProps = {
    searchInput: string;
    roleFilter: RoleFilter;
    activeFilter: ActiveFilter;
    setSearchInput: (value: string) => void;
    setRoleFilter: (value: RoleFilter) => void;
    setActiveFilter: (value: ActiveFilter) => void;
    onApply: () => void;
    onReset: () => void;
    t: TFunction;
};

export default function UserFiltersCard({
    searchInput,
    roleFilter,
    activeFilter,
    setSearchInput,
    setRoleFilter,
    setActiveFilter,
    onApply,
    onReset,
    t,
}: UserFiltersCardProps) {
    return (
        <Card className="border border-border bg-card/80 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                    <ListFilter className="h-5 w-5 text-primary" />
                    {t("adminPage.filters.title")}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                        <Label>{t("adminPage.filters.searchLabel")}</Label>
                        <Input
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    onApply();
                                }
                            }}
                            placeholder={t("adminPage.filters.searchPlaceholder")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t("adminPage.filters.roleLabel")}</Label>
                        <Select
                            value={roleFilter}
                            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminPage.filters.roleAll")}</SelectItem>
                                <SelectItem value="admin">{t("adminPage.filters.roleAdmin")}</SelectItem>
                                <SelectItem value="user">{t("adminPage.filters.roleUser")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{t("adminPage.filters.activityLabel")}</Label>
                        <Select
                            value={activeFilter}
                            onValueChange={(value) => setActiveFilter(value as ActiveFilter)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t("adminPage.filters.activityAll")}</SelectItem>
                                <SelectItem value="active">{t("adminPage.filters.activityActive")}</SelectItem>
                                <SelectItem value="inactive">{t("adminPage.filters.activityInactive")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button onClick={onApply}>{t("adminPage.actions.applyFilters")}</Button>
                    <Button variant="outline" onClick={onReset}>
                        <FilterX className="mr-2 h-4 w-4" />
                        {t("adminPage.actions.resetFilters")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
