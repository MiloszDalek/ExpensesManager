import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { CalendarClock, Repeat, User, Users, AlertTriangle } from "lucide-react";
import { recurringExpensesApi } from "@/api/recurringExpensesApi";
import { formatCurrency } from "@/utils/currency";
import { toFiniteNumber } from "@/utils/toFiniteNumber";
import { cn } from "@/lib/utils";
import type { CurrencyEnum } from "@/types/enums";
import type { ApiDashboardUpcomingRecurringItem } from "@/types";

interface UpcomingRecurringExpensesProps {
  currency: CurrencyEnum;
}

export function UpcomingRecurringExpenses({ currency }: UpcomingRecurringExpensesProps) {
  const { t } = useTranslation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["recurring-expenses", "upcoming", currency],
    queryFn: () => recurringExpensesApi.upcoming({ currency }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.upcomingRecurring.title", { defaultValue: "Upcoming Recurring Expenses" })}</CardTitle>
          <CardDescription>{t("dashboard.upcomingRecurring.description", { defaultValue: "Next scheduled payments" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.upcomingRecurring.title", { defaultValue: "Upcoming Recurring Expenses" })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <AlertTriangle className="h-12 w-12 text-destructive/50" />
            <p className="text-sm text-muted-foreground">
              {t("common.error", { defaultValue: "Failed to load data." })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expenses = data?.items ?? [];

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.upcomingRecurring.title", { defaultValue: "Upcoming Recurring Expenses" })}</CardTitle>
          <CardDescription>{t("dashboard.upcomingRecurring.description", { defaultValue: "Next scheduled payments" })}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarClock className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {t("dashboard.upcomingRecurring.noUpcoming", { defaultValue: "No upcoming recurring expenses" })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("dashboard.upcomingRecurring.title", { defaultValue: "Upcoming Recurring Expenses" })}</CardTitle>
        <CardDescription>{t("dashboard.upcomingRecurring.description", { defaultValue: "Next scheduled payments" })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {expenses.map((item: ApiDashboardUpcomingRecurringItem) => {
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    item.is_group
                      ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                  )}>
                    {item.is_group ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {new Date(item.next_due_on).toLocaleDateString()}
                      </span>
                      {item.is_group && item.group_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {item.group_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                  <span className="font-semibold text-sm">
                    {formatCurrency(toFiniteNumber(item.user_share_amount), currency)}
                  </span>
                  {item.is_group && (
                    <span className="text-xs text-muted-foreground">
                      {t("dashboard.upcomingRecurring.ofTotal", { defaultValue: "of" })} {formatCurrency(toFiniteNumber(item.total_amount), currency)}
                    </span>
                  )}
                  <Badge
                    variant={item.is_group ? "secondary" : "default"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {item.is_group
                      ? t("dashboard.upcomingRecurring.group", { defaultValue: "Group" })
                      : t("dashboard.upcomingRecurring.personal", { defaultValue: "Personal" })}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
