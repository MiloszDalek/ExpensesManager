import type { TFunction } from "i18next";
import { Activity, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { formatDateTime, localizeAdminError } from "@/utils/adminUtils";
import type { ApiSystemUserActivityResponse } from "@/types";

type PendingAction = {
    type: "status";
    userId: number;
} | null;

type UsersTableProps = {
    users: ApiSystemUserActivityResponse[];
    isLoading: boolean;
    isFetching: boolean;
    error: unknown;
    pendingAction: PendingAction;
    currentUserId: number;
    onToggleActive: (managedUser: ApiSystemUserActivityResponse) => void;
    t: TFunction;
};

export default function UsersTable({
    users,
    isLoading,
    isFetching,
    error,
    pendingAction,
    currentUserId,
    onToggleActive,
    t,
}: UsersTableProps) {
    const listErrorMessage = error
        ? localizeAdminError((error as Error).message || t("adminPage.errors.loadFailed"), t)
        : null;

    return (
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
                                    const isSelf = currentUserId === managedUser.id;
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
                                                        {t("adminPage.table.contacts")}: {managedUser.contacts_count}
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
                                                                onClick={() => onToggleActive(managedUser)}
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
                                                            onClick={() => onToggleActive(managedUser)}
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
    );
}
