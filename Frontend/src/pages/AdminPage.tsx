import { useTranslation } from "react-i18next";
import { ListFilter, Shield } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import UserStatsCards from "@/components/admin/UserStatsCards";
import UserFiltersCard from "@/components/admin/UserFiltersCard";
import UsersTable from "@/components/admin/UsersTable";
import CategoryForm from "@/components/admin/CategoryForm";
import CategoriesTable from "@/components/admin/CategoriesTable";
import { useAdminUsers } from "@/hooks/admin/useAdminUsers";
import { useAdminDefaultCategories } from "@/hooks/admin/useAdminDefaultCategories";
import type { CategorySection } from "@/types/enums";

export default function AdminPage() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const usersDomain = useAdminUsers();
    const categoriesDomain = useAdminDefaultCategories();

    if (!user) {
        return <LoadingSpinnerWrapper className="h-screen" />;
    }

    if (user.role !== "admin") {
        return (
            <div className="flex h-screen items-center justify-center px-4">
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-5 text-center text-destructive">
                    {t("adminPage.errors.notEnoughPermissions")}
                </div>
            </div>
        );
    }

    const getSectionLabel = (section: CategorySection | null | undefined) => {
        if (!section) {
            return t("adminPage.notAvailable");
        }

        return t(`categoryGroups.${section}`, { defaultValue: section });
    };

    return (
        <div className="min-h-screen p-4 md:p-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <div className="rounded-xl border border-border bg-card/70 p-5 shadow-sm backdrop-blur-sm">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                                {t("adminPage.title")}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground md:text-base">
                                {t("adminPage.subtitle")}
                            </p>
                        </div>
                        <Badge variant="outline" className="w-fit px-3 py-1 text-xs uppercase tracking-wide">
                            <Shield className="mr-1.5 h-3.5 w-3.5" />
                            {t("adminPage.badges.currentAdmin")}
                        </Badge>
                    </div>
                </div>

                {usersDomain.feedback ? (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            usersDomain.feedback.tone === "success"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                    >
                        {usersDomain.feedback.message}
                    </div>
                ) : null}

                <UserStatsCards stats={usersDomain.stats} t={t} />

                <UserFiltersCard
                    searchInput={usersDomain.searchInput}
                    roleFilter={usersDomain.roleFilter}
                    activeFilter={usersDomain.activeFilter}
                    setSearchInput={usersDomain.setSearchInput}
                    setRoleFilter={usersDomain.setRoleFilter}
                    setActiveFilter={usersDomain.setActiveFilter}
                    onApply={usersDomain.handleApplyFilters}
                    onReset={usersDomain.handleResetFilters}
                    t={t}
                />

                <UsersTable
                    users={usersDomain.users}
                    isLoading={usersDomain.isLoading}
                    isFetching={usersDomain.isFetching}
                    error={usersDomain.error}
                    pendingAction={usersDomain.pendingAction}
                    currentUserId={user.id}
                    onToggleActive={usersDomain.handleToggleActive}
                    t={t}
                />

                <Card className="border border-border bg-card/80 shadow-sm">
                    <CardHeader className="border-b border-border">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <ListFilter className="h-5 w-5 text-primary" />
                                    {t("adminPage.categoriesSectionTitle")}
                                </CardTitle>
                                <CardDescription>{t("adminPage.categoriesSectionSubtitle")}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-4">
                        {categoriesDomain.feedback ? (
                            <div
                                className={`rounded-lg border px-4 py-3 text-sm ${
                                    categoriesDomain.feedback.tone === "success"
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "border-destructive/40 bg-destructive/10 text-destructive"
                                }`}
                            >
                                {categoriesDomain.feedback.message}
                            </div>
                        ) : null}

                        <CategoryForm
                            name={categoriesDomain.defaultCategoryName}
                            section={categoriesDomain.defaultCategorySection}
                            setName={categoriesDomain.setDefaultCategoryName}
                            setSection={categoriesDomain.setDefaultCategorySection}
                            onCreate={categoriesDomain.handleCreate}
                            pendingCategoryAction={categoriesDomain.pendingCategoryAction}
                            getSectionLabel={getSectionLabel}
                            t={t}
                        />

                        <CategoriesTable
                            categories={categoriesDomain.categories}
                            isLoading={categoriesDomain.isLoading}
                            errorMessage={categoriesDomain.errorMessage}
                            editingCategoryId={categoriesDomain.editingCategoryId}
                            editingCategoryName={categoriesDomain.editingCategoryName}
                            editingCategorySection={categoriesDomain.editingCategorySection}
                            setEditingCategoryName={categoriesDomain.setEditingCategoryName}
                            setEditingCategorySection={categoriesDomain.setEditingCategorySection}
                            onStartEdit={categoriesDomain.handleStartEdit}
                            onSaveEdit={categoriesDomain.handleSaveEdit}
                            onCancelEdit={categoriesDomain.handleCancelEdit}
                            onDelete={categoriesDomain.handleDelete}
                            pendingCategoryAction={categoriesDomain.pendingCategoryAction}
                            getSectionLabel={getSectionLabel}
                            t={t}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
