import { useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, FilterX, ListFilter, Shield, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

import { useAuth } from "@/contexts/AuthContext";
import { categoriesApi, queryKeys, usersApi } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
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
import { formatCategoryNameForDisplay } from "@/utils/category";
import type {
    ApiCategoryCreate,
    ApiCategoryResponse,
    ApiSystemUserActivityResponse,
    ApiSystemUserActivityStatsResponse,
    ApiUserUpdate,
} from "@/types";
import type { CategorySection, SystemUserRole } from "@/types/enums";

type RoleFilter = "all" | SystemUserRole;
type ActiveFilter = "all" | "active" | "inactive";
type PendingActionType = "status";

type PendingAction = {
    type: PendingActionType;
    userId: number;
} | null;

type AdminFeedback = {
    tone: "success" | "error";
    message: string;
} | null;

const CATEGORY_SECTION_OPTIONS: CategorySection[] = [
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

const ADMIN_ERROR_TRANSLATIONS: Record<string, string> = {
    "Not enough permissions": "adminPage.errors.notEnoughPermissions",
    "System admin role changes are disabled": "adminPage.errors.roleChangeDisabled",
    "User deletion is disabled by system policy": "adminPage.errors.userDeletionDisabled",
    "Admin cannot deactivate own account": "adminPage.errors.cannotDeactivateOwnAccount",
    "System admin account cannot be deactivated": "adminPage.errors.systemAdminCannotDeactivate",
    "Email already in use": "adminPage.errors.emailAlreadyInUse",
    "Category name cannot be empty": "adminPage.errors.categoryNameEmpty",
    "Category already exists": "adminPage.errors.categoryAlreadyExists",
    "Category not found": "adminPage.errors.categoryNotFound",
    "Not a default category": "adminPage.errors.notDefaultCategory",
    "Cannot delete category assigned to expenses": "adminPage.errors.categoryInUse",
};

const localizeAdminError = (message: string, t: TFunction): string => {
    const normalizedMessage = message.trim().replace(/\.$/, "");

    if (normalizedMessage.match(/^Cannot delete category assigned to expenses?$/)) {
        return t("adminPage.errors.categoryInUse");
    }

    const categoryExistsMatch = normalizedMessage.match(/^Category '(.+)' already exists$/);
    if (categoryExistsMatch) {
        return t("adminPage.errors.categoryAlreadyExistsWithName", {
            name: categoryExistsMatch[1],
        });
    }

    const key = ADMIN_ERROR_TRANSLATIONS[normalizedMessage];
    if (key) {
        return t(key);
    }

    return normalizedMessage;
};

const formatDateTime = (value: string | null | undefined, fallback: string) => {
    if (!value) {
        return fallback;
    }

    try {
        return format(parseISO(value), "yyyy-MM-dd HH:mm");
    } catch {
        return fallback;
    }
};

const extractApiErrorMessage = (error: unknown): string | null => {
    if (typeof error === "object" && error !== null && "response" in error) {
        const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
        if (typeof detail === "string" && detail.trim()) {
            return detail.trim();
        }
    }

    if (error instanceof Error && error.message.trim()) {
        return error.message.trim();
    }

    return null;
};

export default function AdminPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
    const [pendingAction, setPendingAction] = useState<PendingAction>(null);
    const [feedback, setFeedback] = useState<AdminFeedback>(null);
    const [categoryFeedback, setCategoryFeedback] = useState<AdminFeedback>(null);
    const [defaultCategoryName, setDefaultCategoryName] = useState("");
    const [defaultCategorySection, setDefaultCategorySection] = useState<CategorySection>("other");
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
    const [editingCategorySection, setEditingCategorySection] = useState<CategorySection>("other");
    const [pendingCategoryAction, setPendingCategoryAction] = useState<number | "create" | null>(null);

    const {
        data: users = [],
        isLoading,
        isFetching,
        error,
    } = useQuery<ApiSystemUserActivityResponse[]>({
        queryKey: queryKeys.admin.usersActivity({
            search: appliedSearch || undefined,
            role: roleFilter,
            is_active: activeFilter,
        }),
        queryFn: () =>
            usersApi.listActivity({
                search: appliedSearch || undefined,
                role: roleFilter,
                is_active: activeFilter,
            }),
        enabled: !!user && user.role === "admin",
    });

    const { data: activityStats } = useQuery<ApiSystemUserActivityStatsResponse>({
        queryKey: queryKeys.admin.usersActivityStats({
            search: appliedSearch || undefined,
            role: roleFilter,
            is_active: activeFilter,
        }),
        queryFn: () =>
            usersApi.getActivityStats({
                search: appliedSearch || undefined,
                role: roleFilter,
                is_active: activeFilter,
            }),
        enabled: !!user && user.role === "admin",
    });

    const {
        data: defaultCategories = [],
        isLoading: defaultCategoriesLoading,
        error: defaultCategoriesError,
    } = useQuery<ApiCategoryResponse[]>({
        queryKey: queryKeys.admin.defaultCategories,
        queryFn: () => categoriesApi.getDefault(),
        enabled: !!user && user.role === "admin",
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ userId, payload }: { userId: number; payload: ApiUserUpdate }) =>
            usersApi.update(userId, payload),
    });

    const createDefaultCategoryMutation = useMutation({
        mutationFn: (payload: ApiCategoryCreate) => categoriesApi.createDefault(payload),
    });

    const updateDefaultCategoryMutation = useMutation({
        mutationFn: ({ categoryId, payload }: { categoryId: number; payload: { name: string; section: CategorySection } }) =>
            categoriesApi.updateDefault(categoryId, payload),
    });

    const deleteDefaultCategoryMutation = useMutation({
        mutationFn: (categoryId: number) => categoriesApi.deleteDefault(categoryId),
    });

    const stats = activityStats ?? {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
    };

    const invalidateAdminUsers = async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    };

    const invalidateDefaultCategories = async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.admin.defaultCategories });
    };

    const sortedDefaultCategories = useMemo(
        () => [...defaultCategories].sort((left, right) => left.name.localeCompare(right.name)),
        [defaultCategories]
    );

    const handleApplyFilters = () => {
        setAppliedSearch(searchInput.trim());
        setFeedback(null);
    };

    const handleResetFilters = () => {
        setSearchInput("");
        setAppliedSearch("");
        setRoleFilter("all");
        setActiveFilter("all");
        setFeedback(null);
    };

    const handleToggleActive = async (managedUser: ApiSystemUserActivityResponse) => {
        setFeedback(null);

        const nextIsActive = !managedUser.is_active;
        setPendingAction({ type: "status", userId: managedUser.id });

        try {
            await updateUserMutation.mutateAsync({
                userId: managedUser.id,
                payload: { is_active: nextIsActive },
            });

            setFeedback({
                tone: "success",
                message: nextIsActive
                    ? t("adminPage.feedback.userActivated")
                    : t("adminPage.feedback.userDeactivated"),
            });
        } catch (caughtError) {
            const typedError = caughtError as Error;
            setFeedback({
                tone: "error",
                message: localizeAdminError(
                    typedError.message || t("adminPage.errors.updateFailed"),
                    t
                ),
            });
        } finally {
            setPendingAction(null);
            await invalidateAdminUsers();
        }
    };

    const handleCreateDefaultCategory = async () => {
        const normalizedName = defaultCategoryName.trim();
        if (!normalizedName) {
            setCategoryFeedback({
                tone: "error",
                message: t("adminPage.errors.categoryNameEmpty"),
            });
            return;
        }

        setCategoryFeedback(null);
        setPendingCategoryAction("create");

        try {
            await createDefaultCategoryMutation.mutateAsync({
                name: normalizedName,
                section: defaultCategorySection,
            });
            setDefaultCategoryName("");
            setCategoryFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryCreated"),
            });
        } catch (caughtError) {
            const errorMessage =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryCreateFailed");
            setCategoryFeedback({
                tone: "error",
                message: localizeAdminError(errorMessage, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    const handleStartCategoryEdit = (category: ApiCategoryResponse) => {
        setEditingCategoryId(category.id);
        setEditingCategoryName(category.name);
        setEditingCategorySection(category.section ?? "other");
    };

    const handleCancelCategoryEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName("");
        setEditingCategorySection("other");
    };

    const handleSaveCategoryEdit = async () => {
        if (editingCategoryId == null) {
            return;
        }

        const normalizedName = editingCategoryName.trim();
        if (!normalizedName) {
            setCategoryFeedback({
                tone: "error",
                message: t("adminPage.errors.categoryNameEmpty"),
            });
            return;
        }

        setCategoryFeedback(null);
        setPendingCategoryAction(editingCategoryId);

        try {
            await updateDefaultCategoryMutation.mutateAsync({
                categoryId: editingCategoryId,
                payload: {
                    name: normalizedName,
                    section: editingCategorySection,
                },
            });
            setCategoryFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryUpdated"),
            });
            handleCancelCategoryEdit();
        } catch (caughtError) {
            const errorMessage =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryUpdateFailed");
            setCategoryFeedback({
                tone: "error",
                message: localizeAdminError(errorMessage, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    const handleDeleteDefaultCategory = async (category: ApiCategoryResponse) => {
        const localizedCategoryName = t(`category.${category.name}`, {
            defaultValue: formatCategoryNameForDisplay(category.name),
        });
        if (!window.confirm(t("adminPage.confirmDeleteCategory", { category: localizedCategoryName }))) {
            return;
        }

        setCategoryFeedback(null);
        setPendingCategoryAction(category.id);

        try {
            await deleteDefaultCategoryMutation.mutateAsync(category.id);
            if (editingCategoryId === category.id) {
                handleCancelCategoryEdit();
            }
            setCategoryFeedback({
                tone: "success",
                message: t("adminPage.feedback.defaultCategoryDeleted"),
            });
        } catch (caughtError) {
            const errorMessage =
                extractApiErrorMessage(caughtError) || t("adminPage.errors.categoryDeleteFailed");
            setCategoryFeedback({
                tone: "error",
                message: localizeAdminError(errorMessage, t),
            });
        } finally {
            setPendingCategoryAction(null);
            await invalidateDefaultCategories();
        }
    };

    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            </div>
        );
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

    const listErrorMessage = error
        ? localizeAdminError((error as Error).message || t("adminPage.errors.loadFailed"), t)
        : null;

    const defaultCategoriesErrorMessage = defaultCategoriesError
        ? localizeAdminError(
            (defaultCategoriesError as Error).message || t("adminPage.errors.categoryLoadFailed"),
            t
        )
        : null;

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

                {feedback ? (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            feedback.tone === "success"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                    >
                        {feedback.message}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                    <Card className="border border-border bg-card/80">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide">
                                {t("adminPage.stats.totalUsers")}
                            </CardDescription>
                            <CardTitle className="text-2xl">{stats.total_users}</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="border border-border bg-card/80">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide">
                                {t("adminPage.stats.activeUsers")}
                            </CardDescription>
                            <CardTitle className="text-2xl">{stats.active_users}</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="border border-border bg-card/80">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs uppercase tracking-wide">
                                {t("adminPage.stats.inactiveUsers")}
                            </CardDescription>
                            <CardTitle className="text-2xl">{stats.inactive_users}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

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
                                            handleApplyFilters();
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
                            <Button onClick={handleApplyFilters}>{t("adminPage.actions.applyFilters")}</Button>
                            <Button variant="outline" onClick={handleResetFilters}>
                                <FilterX className="mr-2 h-4 w-4" />
                                {t("adminPage.actions.resetFilters")}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border bg-card/80 shadow-sm">
                    <CardHeader className="border-b border-border">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-foreground">
                                    <Users className="h-5 w-5 text-primary" />
                                    {t("adminPage.usersSectionTitle")}
                                </CardTitle>
                                <CardDescription>{t("adminPage.usersSectionSubtitle")}</CardDescription>
                            </div>

                            {isFetching ? (
                                <Badge variant="secondary" className="w-fit">
                                    <Activity className="mr-1.5 h-3.5 w-3.5" />
                                    {t("adminPage.actions.processing")}
                                </Badge>
                            ) : null}
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="space-y-2 p-4">
                                {[1, 2, 3, 4].map((index) => (
                                    <div key={index} className="h-16 animate-pulse rounded-md bg-muted" />
                                ))}
                            </div>
                        ) : listErrorMessage ? (
                            <div className="p-6 text-sm text-destructive">{listErrorMessage}</div>
                        ) : users.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">{t("adminPage.empty")}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1080px] text-sm">
                                    <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                                        <tr className="[&>th]:px-3 [&>th]:py-3 [&>th]:text-left">
                                            <th>{t("adminPage.table.user")}</th>
                                            <th>{t("adminPage.table.role")}</th>
                                            <th>{t("adminPage.table.status")}</th>
                                            <th>{t("adminPage.table.joinedAt")}</th>
                                            <th>{t("adminPage.table.lastActivity")}</th>
                                            <th>{t("adminPage.table.activity")}</th>
                                            <th>{t("adminPage.table.actions")}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&>tr]:border-b [&>tr]:border-border/60 [&>tr]:align-top">
                                        {users.map((managedUser) => {
                                            const isSelf = user.id === managedUser.id;
                                            const isBusy = pendingAction?.userId === managedUser.id;
                                            const isSystemAdmin = managedUser.role === "admin";
                                            const isStatusLockedByPolicy = isSystemAdmin;
                                            const statusActionTooltip = isStatusLockedByPolicy
                                                ? t("adminPage.badges.adminLocked")
                                                : undefined;

                                            return (
                                                <tr key={managedUser.id} className="[&>td]:px-3 [&>td]:py-3">
                                                    <td>
                                                        <div className="font-medium text-foreground">{managedUser.username}</div>
                                                        <div className="text-xs text-muted-foreground">{managedUser.email}</div>
                                                        {isSelf ? (
                                                            <Badge variant="secondary" className="mt-1">
                                                                {t("adminPage.badges.you")}
                                                            </Badge>
                                                        ) : null}
                                                    </td>

                                                    <td>
                                                        <Badge variant={managedUser.role === "admin" ? "default" : "outline"}>
                                                            {managedUser.role === "admin"
                                                                ? t("adminPage.filters.roleAdmin")
                                                                : t("adminPage.filters.roleUser")}
                                                        </Badge>
                                                    </td>

                                                    <td>
                                                        <Badge variant={managedUser.is_active ? "secondary" : "destructive"}>
                                                            {managedUser.is_active
                                                                ? t("adminPage.badges.active")
                                                                : t("adminPage.badges.inactive")}
                                                        </Badge>
                                                    </td>

                                                    <td>
                                                        {formatDateTime(managedUser.created_at, t("adminPage.notAvailable"))}
                                                    </td>

                                                    <td>
                                                        {formatDateTime(
                                                            managedUser.last_activity_at ?? managedUser.created_at,
                                                            t("adminPage.notAvailable")
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                            <span>
                                                                {t("adminPage.table.groups")}: {managedUser.groups_count}
                                                            </span>
                                                            <span>
                                                                {t("adminPage.table.expenses")}: {managedUser.expenses_count}
                                                            </span>
                                                            <span>
                                                                {t("adminPage.table.invitations")}: {managedUser.sent_invitations_count}
                                                            </span>
                                                            <span>
                                                                {t("adminPage.table.settlements")}: {managedUser.settlements_count}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <div className="flex flex-wrap gap-2">
                                                            {statusActionTooltip ? (
                                                                <span title={statusActionTooltip} className="inline-flex">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        disabled={isBusy || isSelf || isSystemAdmin}
                                                                        onClick={() => handleToggleActive(managedUser)}
                                                                    >
                                                                        {isBusy && pendingAction?.type === "status"
                                                                            ? t("adminPage.actions.processing")
                                                                            : managedUser.is_active
                                                                                ? t("adminPage.actions.deactivateUser")
                                                                                : t("adminPage.actions.activateUser")}
                                                                    </Button>
                                                                </span>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={isBusy || isSelf || isSystemAdmin}
                                                                    onClick={() => handleToggleActive(managedUser)}
                                                                >
                                                                    {isBusy && pendingAction?.type === "status"
                                                                        ? t("adminPage.actions.processing")
                                                                        : managedUser.is_active
                                                                            ? t("adminPage.actions.deactivateUser")
                                                                            : t("adminPage.actions.activateUser")}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                        {categoryFeedback ? (
                            <div
                                className={`rounded-lg border px-4 py-3 text-sm ${
                                    categoryFeedback.tone === "success"
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : "border-destructive/40 bg-destructive/10 text-destructive"
                                }`}
                            >
                                {categoryFeedback.message}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-3">
                            <div className="space-y-2 md:col-span-1">
                                <Label>{t("adminPage.defaultCategoryNameLabel")}</Label>
                                <Input
                                    value={defaultCategoryName}
                                    onChange={(event) => setDefaultCategoryName(event.target.value)}
                                    placeholder={t("adminPage.defaultCategoryNamePlaceholder")}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-1">
                                <Label>{t("adminPage.defaultCategorySectionLabel")}</Label>
                                <Select
                                    value={defaultCategorySection}
                                    onValueChange={(value) => setDefaultCategorySection(value as CategorySection)}
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
                            </div>

                            <div className="flex items-end md:col-span-1">
                                <Button
                                    className="w-full"
                                    onClick={handleCreateDefaultCategory}
                                    disabled={pendingCategoryAction === "create"}
                                >
                                    {pendingCategoryAction === "create"
                                        ? t("adminPage.actions.processing")
                                        : t("adminPage.actions.addDefaultCategory")}
                                </Button>
                            </div>
                        </div>

                        {defaultCategoriesLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((index) => (
                                    <div key={index} className="h-14 animate-pulse rounded-md bg-muted" />
                                ))}
                            </div>
                        ) : defaultCategoriesErrorMessage ? (
                            <div className="text-sm text-destructive">{defaultCategoriesErrorMessage}</div>
                        ) : sortedDefaultCategories.length === 0 ? (
                            <div className="text-sm text-muted-foreground">{t("adminPage.emptyCategories")}</div>
                        ) : (
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
                                        {sortedDefaultCategories.map((category) => {
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
                                                                    onClick={handleSaveCategoryEdit}
                                                                    disabled={isBusy}
                                                                >
                                                                    {isBusy
                                                                        ? t("adminPage.actions.processing")
                                                                        : t("adminPage.actions.saveCategory")}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={handleCancelCategoryEdit}
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
                                                                    onClick={() => handleStartCategoryEdit(category)}
                                                                >
                                                                    {t("adminPage.actions.editCategory")}
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    disabled={isBusy || pendingCategoryAction === "create"}
                                                                    onClick={() => handleDeleteDefaultCategory(category)}
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
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}