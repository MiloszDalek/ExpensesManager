import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { motion } from "framer-motion";
import { Pause, Play, RefreshCw, RotateCcw, Trash2 } from "lucide-react";

import { recurringExpensesApi } from "@/api/recurringExpensesApi";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RecurringScope } from "@/types";
import type { RecurringExpenseStatus } from "@/types/enums";

const FORECAST_WINDOW_DAYS = 30;

const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

export default function RecurringExpensesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [scope, setScope] = useState<RecurringScope>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | RecurringExpenseStatus>("all");

  const today = useMemo(() => new Date(), []);
  const dateFrom = toDateInput(today);
  const dateTo = toDateInput(addDays(today, FORECAST_WINDOW_DAYS));

  const listParams = useMemo(
    () => ({
      limit: 200,
      offset: 0,
      scope,
      status: statusFilter === "all" ? undefined : statusFilter,
      include_archived: statusFilter === "archived",
    }),
    [scope, statusFilter]
  );

  const {
    data: recurringExpenses = [],
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery({
    queryKey: queryKeys.recurringExpenses.list(listParams),
    queryFn: () => recurringExpensesApi.list(listParams),
  });

  const {
    data: forecast,
    isLoading: forecastLoading,
    error: forecastError,
  } = useQuery({
    queryKey: queryKeys.recurringExpenses.forecast({
      date_from: dateFrom,
      date_to: dateTo,
      scope,
    }),
    queryFn: () =>
      recurringExpensesApi.forecast({
        date_from: dateFrom,
        date_to: dateTo,
        scope,
      }),
  });

  const invalidateRecurringQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
    await queryClient.invalidateQueries({ queryKey: ["expenses", "group"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contacts });
  };

  const generateDueMutation = useMutation({
    mutationFn: () => recurringExpensesApi.generateDue({ up_to_date: dateFrom }),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const generateNowMutation = useMutation({
    mutationFn: (recurringExpenseId: number) =>
      recurringExpensesApi.generateNow(recurringExpenseId, { up_to_date: dateFrom }),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.pause(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.resume(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.archive(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.delete(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringQueries();
    },
  });

  const isActionPending =
    generateNowMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending;

  const mapStatusLabel = (status: RecurringExpenseStatus) => {
    if (status === "active") {
      return t("recurringExpenses.statusActive", { defaultValue: "Active" });
    }
    if (status === "paused") {
      return t("recurringExpenses.statusPaused", { defaultValue: "Paused" });
    }
    if (status === "ended") {
      return t("recurringExpenses.statusEnded", { defaultValue: "Ended" });
    }
    return t("recurringExpenses.statusArchived", { defaultValue: "Archived" });
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              {t("recurringExpenses.title", { defaultValue: "Recurring Expenses" })}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t("recurringExpenses.subtitle", {
                defaultValue:
                  "Manage recurring series, trigger generation manually, and preview upcoming obligations.",
              })}
            </p>
          </div>

          <Button
            onClick={() => generateDueMutation.mutate()}
            disabled={generateDueMutation.isPending}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {generateDueMutation.isPending
              ? t("recurringExpenses.generating", { defaultValue: "Generating..." })
              : t("recurringExpenses.generateDue", { defaultValue: "Generate due occurrences" })}
          </Button>
        </motion.div>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("recurringExpenses.scope", { defaultValue: "Scope" })}</Label>
              <Select value={scope} onValueChange={(value) => setScope(value as RecurringScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("recurringExpenses.scopeAll", { defaultValue: "All" })}</SelectItem>
                  <SelectItem value="personal">{t("recurringExpenses.scopePersonal", { defaultValue: "Personal" })}</SelectItem>
                  <SelectItem value="group">{t("recurringExpenses.scopeGroup", { defaultValue: "Group" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("recurringExpenses.status", { defaultValue: "Status" })}</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | RecurringExpenseStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("recurringExpenses.statusAll", { defaultValue: "All" })}</SelectItem>
                  <SelectItem value="active">{t("recurringExpenses.statusActive", { defaultValue: "Active" })}</SelectItem>
                  <SelectItem value="paused">{t("recurringExpenses.statusPaused", { defaultValue: "Paused" })}</SelectItem>
                  <SelectItem value="ended">{t("recurringExpenses.statusEnded", { defaultValue: "Ended" })}</SelectItem>
                  <SelectItem value="archived">{t("recurringExpenses.statusArchived", { defaultValue: "Archived" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              {t("recurringExpenses.forecastTitle", { defaultValue: "Forecast (next 30 days)" })}
            </h2>

            {forecastLoading ? (
              <p className="text-sm text-muted-foreground">{t("recurringExpenses.loading", { defaultValue: "Loading..." })}</p>
            ) : forecastError ? (
              <p className="text-sm text-destructive">{(forecastError as Error).message}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("recurringExpenses.forecastCount", {
                  defaultValue: "Planned occurrences: {{count}}",
                  count: forecast?.total_count ?? 0,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              {t("recurringExpenses.seriesTitle", { defaultValue: "Recurring series" })}
            </h2>

            {recurringLoading ? (
              <p className="text-sm text-muted-foreground">{t("recurringExpenses.loading", { defaultValue: "Loading..." })}</p>
            ) : recurringError ? (
              <p className="text-sm text-destructive">{(recurringError as Error).message}</p>
            ) : recurringExpenses.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                {t("recurringExpenses.empty", {
                  defaultValue: "No recurring expenses yet. Create one from Add Expense / Add Group Expense dialogs.",
                })}
              </p>
            ) : (
              <div className="space-y-3">
                {recurringExpenses.map((series) => (
                  <div key={series.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{series.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(series.amount).toFixed(2)} {series.currency} · {series.frequency} · {mapStatusLabel(series.status)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("recurringExpenses.nextDue", { defaultValue: "Next due" })}: {series.next_due_on}
                        </p>
                        {series.last_error ? (
                          <p className="mt-1 text-xs text-destructive">{series.last_error}</p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => generateNowMutation.mutate(series.id)}
                          disabled={isActionPending}
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          {t("recurringExpenses.generateNow", { defaultValue: "Generate now" })}
                        </Button>

                        {series.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => pauseMutation.mutate(series.id)}
                            disabled={isActionPending}
                          >
                            <Pause className="mr-1 h-3.5 w-3.5" />
                            {t("recurringExpenses.pause", { defaultValue: "Pause" })}
                          </Button>
                        ) : null}

                        {series.status === "paused" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resumeMutation.mutate(series.id)}
                            disabled={isActionPending}
                          >
                            <Play className="mr-1 h-3.5 w-3.5" />
                            {t("recurringExpenses.resume", { defaultValue: "Resume" })}
                          </Button>
                        ) : null}

                        {series.status !== "archived" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => archiveMutation.mutate(series.id)}
                            disabled={isActionPending}
                          >
                            {t("recurringExpenses.archive", { defaultValue: "Archive" })}
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteMutation.mutate(series.id)}
                          disabled={isActionPending}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {t("recurringExpenses.delete", { defaultValue: "Delete" })}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
