import { useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { budgetsApi } from "@/api/budgetsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { type ApiBudgetPlanResponse, type ApiBudgetPoolCreate, type ApiCategoryResponse } from "@/types";
import { SUPPORTED_CURRENCIES } from "@/types/enums";


const formatMoney = (value: number | string, currency: string) => {
  return `${Number(value || 0).toFixed(2)} ${currency}`;
};

const toIsoDateStart = (value: string) => `${value}T00:00:00`;

const BUDGET_ERROR_TRANSLATIONS: Record<string, string> = {
  "period_start cannot be greater than period_end": "budgets.errors.periodRangeInvalid",
  "Weekly budget period must have exactly 7 days": "budgets.errors.weeklyPeriodMustBeSevenDays",
  "Monthly budget period must start on first day of month": "budgets.errors.monthlyStartInvalid",
  "Monthly budget period must end on last day of month": "budgets.errors.monthlyEndInvalid",
  "income_target must be greater than 0": "budgets.errors.incomeTargetInvalid",
  "Budget period overlaps with existing active budget": "budgets.errors.periodOverlap",
  "Budget requires at least one pool": "budgets.errors.poolRequired",
  "Pool target value must be greater than 0": "budgets.errors.poolTargetInvalid",
  "Pool alert threshold must be in range (0, 100]": "budgets.errors.poolAlertRangeInvalid",
  "Percent pool target cannot be greater than 100": "budgets.errors.poolPercentRangeInvalid",
  "Percent pools total cannot exceed 100": "budgets.errors.poolPercentTotalInvalid",
  "Fixed pools total cannot exceed income_target": "budgets.errors.poolFixedTotalTooHigh",
  "No available personal categories for budget template": "budgets.errors.noCategoriesForTemplate",
  "Budget not found": "budgets.errors.budgetNotFound",
  "Budget pool not found": "budgets.errors.poolNotFound",
  "Amount must be greater than 0": "budgets.errors.amountInvalid",
  "date_from cannot be greater than date_to": "budgets.errors.dateRangeInvalid",
  "Income entry not found": "budgets.errors.incomeNotFound",
  "Category not found": "budgets.errors.categoryNotFound",
  "Not a personal category": "budgets.errors.categoryNotPersonal",
  "Not authorized": "budgets.errors.notAuthorized",
};

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail.trim();
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "";
};

const localizeBudgetError = (message: string, t: TFunction): string => {
  const normalizedMessage = message.trim().replace(/\.$/, "");
  const key = BUDGET_ERROR_TRANSLATIONS[normalizedMessage];
  if (key) {
    return t(key);
  }

  return normalizedMessage || t("budgets.errors.generic");
};

const getBudgetStatusLabel = (status: "active" | "archived", t: TFunction): string => {
  if (status === "active") {
    return t("budgets.status.active");
  }
  return t("budgets.status.archived");
};

const getPoolStatusLabel = (status: "on_track" | "warning" | "exceeded", t: TFunction): string => {
  if (status === "on_track") {
    return t("budgets.poolStatus.onTrack");
  }
  if (status === "warning") {
    return t("budgets.poolStatus.warning");
  }
  return t("budgets.poolStatus.exceeded");
};

export default function BudgetsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [budgetName, setBudgetName] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState<typeof SUPPORTED_CURRENCIES[number]>("PLN");
  const [periodType, setPeriodType] = useState<"monthly" | "weekly">("monthly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [incomeTarget, setIncomeTarget] = useState("");

  const [incomeTitle, setIncomeTitle] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeDate, setIncomeDate] = useState("");

  const [poolName, setPoolName] = useState("");
  const [poolCategoryId, setPoolCategoryId] = useState<string>("");
  const [poolType, setPoolType] = useState<"fixed_amount" | "percent_income">("fixed_amount");
  const [poolTarget, setPoolTarget] = useState("");
  const [poolAlert, setPoolAlert] = useState("80");

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: queryKeys.budgets.list("active"),
    queryFn: () => budgetsApi.listBudgets("active"),
    enabled: !!user,
  });

  useEffect(() => {
    if (budgets.length === 0) {
      setSelectedBudgetId(null);
      return;
    }

    const selectedExists = budgets.some((budget) => budget.id === selectedBudgetId);
    if (!selectedExists) {
      setSelectedBudgetId(budgets[0].id);
    }
  }, [budgets, selectedBudgetId]);

  const selectedBudget = useMemo<ApiBudgetPlanResponse | null>(() => {
    if (!selectedBudgetId) {
      return null;
    }
    return budgets.find((budget) => budget.id === selectedBudgetId) ?? null;
  }, [budgets, selectedBudgetId]);

  const { data: budgetSummary, isLoading: summaryLoading } = useQuery({
    queryKey: selectedBudgetId ? queryKeys.budgets.summary(selectedBudgetId) : ["budgets", "summary", "none"],
    queryFn: () => budgetsApi.getBudgetSummary(selectedBudgetId as number),
    enabled: !!selectedBudgetId,
  });

  const { data: incomeEntries = [], isLoading: incomeLoading } = useQuery({
    queryKey: selectedBudget
      ? queryKeys.budgetIncome.list({
          date_from: selectedBudget.period_start,
          date_to: selectedBudget.period_end,
          currency: selectedBudget.currency,
          limit: 100,
        })
      : ["income", "list", "none"],
    queryFn: () =>
      budgetsApi.listIncome({
        limit: 100,
        date_from: selectedBudget?.period_start,
        date_to: selectedBudget?.period_end,
        currency: selectedBudget?.currency,
      }),
    enabled: !!selectedBudget,
  });

  const { data: personalCategories = [] } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availablePersonal,
    queryFn: () => categoriesApi.getAvailablePersonal(),
    enabled: !!user,
  });

  const refreshBudgetArea = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.budgetIncome.all });
  };

  const createBudgetMutation = useMutation({
    mutationFn: () =>
      budgetsApi.createBudget({
        name: budgetName.trim(),
        currency: budgetCurrency,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        income_target: incomeTarget.trim() ? Number(incomeTarget) : null,
        use_template_50_30_20: true,
      }),
    onSuccess: async (created) => {
      setErrorMessage(null);
      setBudgetName("");
      setIncomeTarget("");
      await refreshBudgetArea();
      setSelectedBudgetId(created.id);
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const addIncomeMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }

      return budgetsApi.createIncome({
        title: incomeTitle.trim(),
        amount: Number(incomeAmount),
        currency: selectedBudget.currency,
        income_date: toIsoDateStart(incomeDate),
      });
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setIncomeTitle("");
      setIncomeAmount("");
      setIncomeDate("");
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: (incomeId: number) => budgetsApi.deleteIncome(incomeId),
    onSuccess: async () => {
      setErrorMessage(null);
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const addPoolMutation = useMutation({
    mutationFn: () => {
      if (!selectedBudget) {
        throw new Error(t("budgets.errors.noBudgetSelected", { defaultValue: "Select budget first." }));
      }

      const payload: ApiBudgetPoolCreate = {
        name: poolName.trim(),
        category_id: Number(poolCategoryId),
        pool_type: poolType,
        target_value: Number(poolTarget),
        alert_threshold: Number(poolAlert),
      };

      return budgetsApi.addPool(selectedBudget.id, payload);
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setPoolName("");
      setPoolCategoryId("");
      setPoolTarget("");
      setPoolAlert("80");
      await refreshBudgetArea();
    },
    onError: (error) => {
      setErrorMessage(localizeBudgetError(getErrorMessage(error), t));
    },
  });

  const isCreateBudgetDisabled =
    !budgetName.trim() ||
    !periodStart ||
    !periodEnd ||
    createBudgetMutation.isPending;

  const isAddIncomeDisabled =
    !selectedBudget ||
    !incomeTitle.trim() ||
    !incomeDate ||
    !incomeAmount ||
    addIncomeMutation.isPending;

  const isAddPoolDisabled =
    !selectedBudget ||
    !poolName.trim() ||
    !poolCategoryId ||
    !poolTarget ||
    addPoolMutation.isPending;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("budgets.title", { defaultValue: "Budget Manager" })}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("budgets.subtitle", {
              defaultValue: "Track income, monitor spending, and protect your monthly or weekly pools.",
            })}
          </p>
        </motion.div>

        {errorMessage ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        ) : null}

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="grid gap-3 p-4 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <Label>{t("budgets.form.name", { defaultValue: "Budget name" })}</Label>
              <Input
                value={budgetName}
                onChange={(event) => setBudgetName(event.target.value)}
                placeholder={t("budgets.form.namePlaceholder")}
              />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.periodType", { defaultValue: "Period" })}</Label>
              <Select value={periodType} onValueChange={(value) => setPeriodType(value as "monthly" | "weekly")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{t("budgets.period.monthly", { defaultValue: "Monthly" })}</SelectItem>
                  <SelectItem value="weekly">{t("budgets.period.weekly", { defaultValue: "Weekly" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.start", { defaultValue: "Start" })}</Label>
              <Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.end", { defaultValue: "End" })}</Label>
              <Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.currency", { defaultValue: "Currency" })}</Label>
              <Select value={budgetCurrency} onValueChange={(value) => setBudgetCurrency(value as typeof SUPPORTED_CURRENCIES[number])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>{t("budgets.form.incomeTarget", { defaultValue: "Income target (optional)" })}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={incomeTarget}
                onChange={(event) => setIncomeTarget(event.target.value)}
              />
            </div>

            <div className="md:col-span-6">
              <Button onClick={() => createBudgetMutation.mutate()} disabled={isCreateBudgetDisabled}>
                {createBudgetMutation.isPending
                  ? t("budgets.actions.creating", { defaultValue: "Creating..." })
                  : t("budgets.actions.createWithTemplate", { defaultValue: "Create budget (50/30/20 template)" })}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="periods" className="space-y-4">
          <TabsList>
            <TabsTrigger value="periods">{t("budgets.tabs.periods", { defaultValue: "Periods" })}</TabsTrigger>
            <TabsTrigger value="income">{t("budgets.tabs.income", { defaultValue: "Income" })}</TabsTrigger>
            <TabsTrigger value="pools">{t("budgets.tabs.pools", { defaultValue: "Pools" })}</TabsTrigger>
          </TabsList>

          <TabsContent value="periods">
            <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
              <CardContent className="space-y-3 p-4">
                {budgetsLoading ? (
                  <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                ) : budgets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("budgets.empty", { defaultValue: "No budgets yet. Create your first period above." })}
                  </p>
                ) : (
                  budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex flex-col gap-2 rounded-md border border-border p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{budget.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {budget.period_start} - {budget.period_end} · {budget.currency}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={budget.status === "active" ? "default" : "secondary"}>
                          {getBudgetStatusLabel(budget.status, t)}
                        </Badge>
                        <Button
                          variant={selectedBudgetId === budget.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedBudgetId(budget.id)}
                        >
                          {selectedBudgetId === budget.id
                            ? t("budgets.actions.selected", { defaultValue: "Selected" })
                            : t("budgets.actions.select", { defaultValue: "Select" })}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label>{t("budgets.income.title", { defaultValue: "Title" })}</Label>
                    <Input
                      value={incomeTitle}
                      onChange={(event) => setIncomeTitle(event.target.value)}
                      placeholder={t("budgets.income.titlePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.income.amount", { defaultValue: "Amount" })}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={incomeAmount}
                      onChange={(event) => setIncomeAmount(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.income.date", { defaultValue: "Date" })}</Label>
                    <Input type="date" value={incomeDate} onChange={(event) => setIncomeDate(event.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => addIncomeMutation.mutate()} disabled={isAddIncomeDisabled}>
                      {addIncomeMutation.isPending
                        ? t("budgets.actions.saving", { defaultValue: "Saving..." })
                        : t("budgets.actions.addIncome", { defaultValue: "Add income" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-3 p-4">
                  {!selectedBudget ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.income.selectBudget", { defaultValue: "Select budget to view period income." })}
                    </p>
                  ) : incomeLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : incomeEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.income.empty", { defaultValue: "No income entries yet." })}</p>
                  ) : (
                    incomeEntries.map((income) => (
                      <div key={income.id} className="flex items-center justify-between rounded-md border border-border p-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{income.title}</p>
                          <p className="text-xs text-muted-foreground">{income.income_date.slice(0, 10)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground">{formatMoney(income.amount, income.currency || selectedBudget.currency)}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteIncomeMutation.mutate(income.id)}
                            disabled={deleteIncomeMutation.isPending}
                          >
                            {t("budgets.actions.delete", { defaultValue: "Delete" })}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="pools">
            <div className="space-y-4">
              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="grid gap-3 p-4 md:grid-cols-5">
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.name", { defaultValue: "Pool name" })}</Label>
                    <Input
                      value={poolName}
                      onChange={(event) => setPoolName(event.target.value)}
                      placeholder={t("budgets.pools.namePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.category", { defaultValue: "Category" })}</Label>
                    <Select value={poolCategoryId} onValueChange={setPoolCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("budgets.pools.selectCategory", { defaultValue: "Select" })} />
                      </SelectTrigger>
                      <SelectContent>
                        {personalCategories.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>{t(`category.${category.name}`, { defaultValue: category.name })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.type", { defaultValue: "Type" })}</Label>
                    <Select value={poolType} onValueChange={(value) => setPoolType(value as "fixed_amount" | "percent_income")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed_amount">{t("budgets.pools.fixed", { defaultValue: "Fixed amount" })}</SelectItem>
                        <SelectItem value="percent_income">{t("budgets.pools.percent", { defaultValue: "% of income" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.target", { defaultValue: "Target" })}</Label>
                    <Input type="number" min="0" step="0.01" value={poolTarget} onChange={(event) => setPoolTarget(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t("budgets.pools.alert", { defaultValue: "Alert %" })}</Label>
                    <Input type="number" min="1" max="100" step="0.01" value={poolAlert} onChange={(event) => setPoolAlert(event.target.value)} />
                  </div>

                  <div className="md:col-span-5">
                    <Button onClick={() => addPoolMutation.mutate()} disabled={isAddPoolDisabled}>
                      {addPoolMutation.isPending
                        ? t("budgets.actions.saving", { defaultValue: "Saving..." })
                        : t("budgets.actions.addPool", { defaultValue: "Add pool" })}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="space-y-4 p-4">
                  {!selectedBudget ? (
                    <p className="text-sm text-muted-foreground">
                      {t("budgets.summary.selectBudget", { defaultValue: "Select budget to view summary." })}
                    </p>
                  ) : summaryLoading ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.loading", { defaultValue: "Loading..." })}</p>
                  ) : !budgetSummary ? (
                    <p className="text-sm text-muted-foreground">{t("budgets.summary.empty", { defaultValue: "No summary data." })}</p>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-3">
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.income", { defaultValue: "Income" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.income_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.spent", { defaultValue: "Spent" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.spent_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-3">
                            <p className="text-xs text-muted-foreground">{t("budgets.summary.saved", { defaultValue: "Saved" })}</p>
                            <p className="text-lg font-semibold">{formatMoney(budgetSummary.saved_total, budgetSummary.currency)}</p>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="space-y-3">
                        {budgetSummary.pools.map((pool) => (
                          <div key={pool.pool_id} className="rounded-md border border-border p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{pool.pool_name}</p>
                                <p className="text-xs text-muted-foreground">{pool.category_name}</p>
                              </div>
                              <Badge
                                variant={pool.status === "exceeded" ? "destructive" : pool.status === "warning" ? "secondary" : "outline"}
                              >
                                {getPoolStatusLabel(pool.status, t)}
                              </Badge>
                            </div>

                            <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${pool.status === "exceeded" ? "bg-destructive" : "bg-primary"}`}
                                style={{ width: `${Math.min(pool.utilization_percent ?? 0, 100)}%` }}
                              />
                            </div>

                            <p className="text-xs text-muted-foreground">
                              {formatMoney(pool.spent_amount, budgetSummary.currency)} / {formatMoney(pool.target_amount, budgetSummary.currency)}
                              {pool.utilization_percent != null ? ` (${pool.utilization_percent.toFixed(2)}%)` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
