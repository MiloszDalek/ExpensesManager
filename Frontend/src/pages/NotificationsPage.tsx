import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { notificationsApi } from "@/api/notificationsApi";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner, LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import type {
  ApiNotificationResponse,
  NotificationSeverity,
  NotificationType,
} from "@/types";

type NotificationFilters = {
  severity: "all" | NotificationSeverity;
  group: "all" | "invitations" | "budgets" | "expenses" | "recurring" | "settlements" | "goals" | "insights" | "legacy";
};

const DEFAULT_FILTERS: NotificationFilters = {
  severity: "all",
  group: "all",
};

const PAGE_LIMIT = 20;

const NOTIFICATION_TYPE_GROUPS: Array<{
  key: NotificationFilters["group"];
  items: NotificationType[];
}> = [
  {
    key: "invitations",
    items: ["invitation_received", "invitation_accepted", "invitation_rejected"],
  },
  {
    key: "budgets",
    items: ["budget_near_limit", "budget_exceeded", "budget_reset"],
  },
  {
    key: "expenses",
    items: ["new_expense_added", "expense_updated", "expense_deleted"],
  },
  {
    key: "recurring",
    items: ["recurring_due_soon", "recurring_executed", "recurring_failed"],
  },
  {
    key: "settlements",
    items: ["settlement_pending", "settlement_completed", "settlement_failed"],
  },
  {
    key: "goals",
    items: ["goal_progress", "goal_completed"],
  },
  {
    key: "insights",
    items: ["unusual_spending", "high_spending_category"],
  },
  {
    key: "legacy",
    items: ["invitation", "budget_overspending", "upcoming_recurring_expense"],
  },
];

const getSeverityColor = (severity: NotificationSeverity) => {
  switch (severity) {
    case "urgent":
      return "text-destructive";
    case "warning":
      return "text-orange-600 dark:text-orange-400";
    case "info":
    default:
      return "text-muted-foreground";
  }
};

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draftFilters, setDraftFilters] = useState<NotificationFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<NotificationFilters>(DEFAULT_FILTERS);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [notificationToArchive, setNotificationToArchive] = useState<ApiNotificationResponse | null>(null);

  const dateLocale = i18n.language === "pl" ? pl : enUS;

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    enabled: !!user,
  });

  const queryKeyParams = useMemo(() => {
    const params: {
      severity?: NotificationSeverity;
      types?: NotificationType[];
    } = {};
    if (appliedFilters.severity !== "all") {
      params.severity = appliedFilters.severity;
    }
    if (appliedFilters.group !== "all") {
      const matchGroup = NOTIFICATION_TYPE_GROUPS.find(
        (group) => group.key === appliedFilters.group
      );
      if (matchGroup) {
        params.types = matchGroup.items;
      }
    }
    return params;
  }, [appliedFilters]);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<ApiNotificationResponse[]>({
    queryKey: queryKeys.notifications.list(queryKeyParams),
    queryFn: ({ pageParam = 0 }) =>
      notificationsApi.listFiltered({
        ...queryKeyParams,
        limit: PAGE_LIMIT,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_LIMIT ? allPages.length * PAGE_LIMIT : undefined,
    initialPageParam: 0,
    enabled: !!user,
  });

  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page) ?? [],
    [data]
  );
  const unreadCount = unreadData?.count ?? 0;
  const hasUnread = unreadCount > 0;

  const hasPendingFilters =
    draftFilters.severity !== appliedFilters.severity ||
    draftFilters.group !== appliedFilters.group;

  const isDefaultFilters =
    draftFilters.severity === DEFAULT_FILTERS.severity &&
    draftFilters.group === DEFAULT_FILTERS.group;

  const invalidateNotifications = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    await queryClient.invalidateQueries({ queryKey: ["notifications", "recent"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
  };

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markAsRead(notificationId),
    onSuccess: invalidateNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: number) => notificationsApi.delete(notificationId),
    onMutate: (notificationId) => {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;

      queryClient.setQueryData(
        queryKeys.notifications.list(queryKeyParams),
        (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: ApiNotificationResponse[]) =>
              page.filter((n) => n.id !== notificationId)
            ),
          };
        }
      );
    },
    onSuccess: async () => {
      await invalidateNotifications();
      refetch();
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: invalidateNotifications,
  });

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const handleOpenNotification = (notification: ApiNotificationResponse) => {
    if (notification.status === "unread") {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleDeleteClick = (notification: ApiNotificationResponse) => {
    setNotificationToArchive(notification);
    setArchiveDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (notificationToArchive) {
      deleteMutation.mutate(notificationToArchive.id);
    }
    setArchiveDialogOpen(false);
    setNotificationToArchive(null);
  };

  const translateNotificationMessage = (notification: ApiNotificationResponse): string => {
    if (notification.message_key && notification.context) {
      let key = `notifications.messages.${notification.message_key}`;
      const context = notification.context as Record<string, any>;

      // Handle pluralization for recurring_due_soon
      if (notification.message_key === "recurring_due_soon") {
        const days = context.days_until_due;
        if (days === 1) {
          key = "notifications.messages.recurring_due_soon_one";
        } else {
          key = "notifications.messages.recurring_due_soon_other";
        }
      }

      // @ts-ignore - i18next complex return types with context
      return String(t(key, context));
    }
    if (notification.message_key) {
      return String(t(`notifications.messages.${notification.message_key}`));
    }
    return notification.message || t("notifications.noMessage");
  };

  if (!user) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {t("notifications.title")}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("notifications.subtitle")}
            </p>
            {hasUnread && (
              <p className="mt-1 text-sm text-muted-foreground">
                {unreadCount} {t("notifications.unread")}
              </p>
            )}
          </div>
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || !hasUnread}
          >
            {markAllReadMutation.isPending
              ? t("notifications.actions.markAllRead") + "..."
              : t("notifications.actions.markAllRead")}
          </Button>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t("notifications.filters.title")}</CardTitle>
            <CardDescription>{t("notifications.filters.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t("notifications.filters.severityLabel")}
                </span>
                <Select
                  value={draftFilters.severity}
                  onValueChange={(value) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      severity: value as NotificationFilters["severity"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("notifications.filters.allSeverities")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("notifications.filters.allSeverities")}
                    </SelectItem>
                    <SelectItem value="info">
                      {t("notifications.severity.info")}
                    </SelectItem>
                    <SelectItem value="warning">
                      {t("notifications.severity.warning")}
                    </SelectItem>
                    <SelectItem value="urgent">
                      {t("notifications.severity.urgent")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t("notifications.filters.groupLabel")}
                </span>
                <Select
                  value={draftFilters.group}
                  onValueChange={(value) =>
                    setDraftFilters((previous) => ({
                      ...previous,
                      group: value as NotificationFilters["group"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("notifications.filters.allGroups")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("notifications.filters.allGroups")}
                    </SelectItem>
                    {NOTIFICATION_TYPE_GROUPS.map((group) => (
                      <SelectItem key={group.key} value={group.key}>
                        {t(`notifications.typeGroups.${group.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} disabled={!hasPendingFilters}>
                  {t("notifications.filters.apply")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleResetFilters}
                  disabled={isDefaultFilters}
                >
                  {t("notifications.filters.reset")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>{t("notifications.title")}</CardTitle>
            <CardDescription>
              {t("notifications.listSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            ) : isError ? (
              <div className="py-10 text-center text-sm text-destructive">
                {t("common.errorLoadingData")}
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "relative flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start cursor-pointer hover:bg-accent/50",
                      notification.status === "unread" && "bg-accent/10"
                    )}
                    onClick={() => handleOpenNotification(notification)}
                  >
                    <div className="flex min-w-0 flex-1 gap-3">
                      {notification.status === "unread" && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}

                      <div className="min-w-0 space-y-2">
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            const formatted = format(new Date(notification.created_at), "MMM d, HH:mm", { locale: dateLocale });
                            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
                          })()}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className={cn("capitalize", getSeverityColor(notification.severity))}
                          >
                            {t(`notifications.severity.${notification.severity}`)}
                          </Badge>
                          <Badge variant="secondary">
                            {t(`notifications.types.${notification.type}`)}
                          </Badge>
                          {notification.status === "archived" && (
                            <Badge variant="outline">
                              {t("notifications.status.archived")}
                            </Badge>
                          )}
                        </div>
                        <p
                          className={cn(
                            "text-sm",
                            notification.status === "unread"
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {translateNotificationMessage(notification)}
                        </p>
                      </div>
                    </div>

                    {notification.status === "unread" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        {t("notifications.actions.markRead")}
                      </Button>
                    )}
                    {notification.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(notification);
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {hasNextPage && !isLoading && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage
                    ? t("notifications.loading")
                    : t("notifications.loadMore")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notifications.actions.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notifications.actions.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t("notifications.actions.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
