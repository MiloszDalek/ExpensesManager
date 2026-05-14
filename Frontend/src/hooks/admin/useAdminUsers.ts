import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys, usersApi } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { localizeAdminError } from "@/utils/adminUtils";
import type {
    ApiSystemUserActivityResponse,
    ApiSystemUserActivityStatsResponse,
    ApiUserUpdate,
} from "@/types";
import type { SystemUserRole } from "@/types/enums";

export type RoleFilter = "all" | SystemUserRole;
export type ActiveFilter = "all" | "active" | "inactive";

export type UsersPendingAction = {
    type: "status";
    userId: number;
} | null;

export type AdminFeedback = {
    tone: "success" | "error";
    message: string;
} | null;

export type UseAdminUsersResult = {
    users: ApiSystemUserActivityResponse[];
    stats: ApiSystemUserActivityStatsResponse;
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    searchInput: string;
    roleFilter: RoleFilter;
    activeFilter: ActiveFilter;
    pendingAction: UsersPendingAction;
    feedback: AdminFeedback;
    setSearchInput: (value: string) => void;
    setRoleFilter: (value: RoleFilter) => void;
    setActiveFilter: (value: ActiveFilter) => void;
    setFeedback: (value: AdminFeedback) => void;
    handleApplyFilters: () => void;
    handleResetFilters: () => void;
    handleToggleActive: (managedUser: ApiSystemUserActivityResponse) => Promise<void>;
};

export function useAdminUsers(): UseAdminUsersResult {
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
    const [pendingAction, setPendingAction] = useState<UsersPendingAction>(null);
    const [feedback, setFeedback] = useState<AdminFeedback>(null);

    const isAdmin = !!user && user.role === "admin";

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
        enabled: isAdmin,
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
        enabled: isAdmin,
    });

    const updateUserMutation = useMutation({
        mutationFn: ({ userId, payload }: { userId: number; payload: ApiUserUpdate }) =>
            usersApi.update(userId, payload),
    });

    const stats = activityStats ?? {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
    };

    const invalidateAdminUsers = async () => {
        await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    };

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

    return {
        users,
        stats,
        isLoading,
        isFetching,
        error,
        searchInput,
        roleFilter,
        activeFilter,
        pendingAction,
        feedback,
        setSearchInput,
        setRoleFilter,
        setActiveFilter,
        setFeedback,
        handleApplyFilters,
        handleResetFilters,
        handleToggleActive,
    };
}
