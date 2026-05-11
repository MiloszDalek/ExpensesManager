import { Bell } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { notificationsApi } from "@/api/notificationsApi";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/api/queryKeys";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { ApiNotificationResponse } from "@/types";

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dateLocale = i18n.language === "pl" ? pl : enUS;

  // Poll for unread count every 30 seconds
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: 30000, // 30 seconds
  });

  // Fetch recent notifications when dropdown opens
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationsApi.list({ limit: 5, offset: 0 }),
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: ApiNotificationResponse) => {
    // Mark as read if unread
    if (notification.status === "unread") {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
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

  const getSeverityColor = (severity: string) => {
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

  const unreadCount = unreadData?.count || 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center rounded-md p-2 transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "cursor-pointer",
          isOpen && "bg-accent text-accent-foreground"
        )}
        aria-label={t("notifications.bellLabel", { count: unreadCount })}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        
        {/* Unread Badge */}
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "fixed left-1/2 -translate-x-1/2 translate-y-1/44 z-50 w-[calc(100%-2rem)] max-w-md",
            "lg:absolute lg:right-0 lg:top-[calc(100%+0.5rem)] lg:translate-x-0 lg:translate-y-0 lg:left-auto lg:w-80 lg:md:w-96",
            "rounded-lg border border-border bg-popover shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
          role="menu"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="font-semibold text-foreground">
              {t("notifications.title")}
            </h3>
            {hasUnread && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} {t("notifications.unread")}
              </span>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 flex items-center justify-center">
                <LoadingSpinner className="h-6 w-6" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors hover:bg-accent/50",
                      "focus-visible:outline-none focus-visible:bg-accent/50",
                      notification.status === "unread" && "bg-accent/20"
                    )}
                    role="menuitem"
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread Indicator */}
                      {notification.status === "unread" && (
                        <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                      )}
                      
                      <div className="min-w-0 flex-1">
                        {/* Message */}
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

                        {/* Metadata */}
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className={getSeverityColor(notification.severity)}>
                            {t(`notifications.severity.${notification.severity}`)}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            {format(new Date(notification.created_at), "MMM d, HH:mm", { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/notifications");
                  setIsOpen(false);
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                {t("notifications.viewAll")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
