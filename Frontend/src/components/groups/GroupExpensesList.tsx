import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Wallet, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

import { formatCategoryNameForDisplay, getCategoryIcon, getCategoryVisualStyle } from "@/utils/category";
import type { ApiCategoryResponse, ApiGroupExpenseResponse } from "@/types";

type GroupExpensesListProps = {
  expenses: ApiGroupExpenseResponse[];
  categories: ApiCategoryResponse[];
  memberNameById: Record<number, string>;
  currentUserId: number;
  fallbackCurrency: string;
  isLoading: boolean;
  onEdit?: (expense: ApiGroupExpenseResponse) => void;
  onDelete?: (expenseId: number) => void;
  canManageExpense?: (expense: ApiGroupExpenseResponse) => boolean;
};

export default function GroupExpensesList({
  expenses,
  categories,
  memberNameById,
  currentUserId,
  fallbackCurrency,
  isLoading,
  onEdit,
  onDelete,
  canManageExpense,
}: GroupExpensesListProps) {
  const { t, i18n } = useTranslation();
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);
  const dateLocale = i18n.language.startsWith("pl") ? pl : enUS;

  const getCategory = (categoryId: number) => categories.find((category) => category.id === categoryId) ?? null;

  const getCategoryLabel = (category: ApiCategoryResponse | null): string => {
    if (!category) {
      return t("category.other", { defaultValue: "Other" });
    }

    if (category.user_id == null) {
      return t(`category.${category.name}`, { defaultValue: formatCategoryNameForDisplay(category.name) });
    }

    return category.name;
  };

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-14 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <Wallet className="mx-auto mb-4 h-14 w-14 text-muted-foreground/50" />
          <h3 className="mb-2 text-xl font-semibold text-foreground">{t("groupExpensesList.emptyTitle")}</h3>
          <p className="text-muted-foreground">{t("groupExpensesList.emptyDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <AnimatePresence>
        {expenses.map((expense, index) => {
          const category = getCategory(expense.category_id);
          const categoryName = getCategoryLabel(category);
          const Icon = getCategoryIcon(category ?? "other");
          const visualStyle = getCategoryVisualStyle(category ?? "other");
          const isExpanded = expandedExpenseId === expense.id;
          const hasNotes = !!expense.notes?.trim();
          const displayCurrency = expense.currency ?? fallbackCurrency;
          const canManage = canManageExpense ? canManageExpense(expense) : Boolean(onEdit || onDelete);
          const payerName = memberNameById[expense.user_id] ?? `${t("groupExpensesList.userPrefix")}#${expense.user_id}`;
          const expenseDateLabel = format(new Date(expense.expense_date), "MMM d", { locale: dateLocale })
            .replace(".", "")
            .toUpperCase();
          const payerLabel =
            expense.user_id === currentUserId
              ? t("groupExpensesList.youPaid", { defaultValue: "You paid" })
              : `${t("groupExpensesList.paidByShort", { defaultValue: "Paid by" })}:`;
          const totalAmount = Number(expense.amount);
          const ownShareAmount = Number(
            expense.shares.find((share) => share.user_id === currentUserId)?.share_amount ?? 0
          );
          const borrowedAmount = expense.user_id === currentUserId ? 0 : ownShareAmount;
          const lentAmount = expense.user_id === currentUserId ? Math.max(totalAmount - ownShareAmount, 0) : 0;

          const secondaryAmount = borrowedAmount > 0 ? borrowedAmount : lentAmount;
          const secondaryLabel =
            borrowedAmount > 0
              ? t("groupExpensesList.youBorrowed", { defaultValue: "You borrowed" })
              : lentAmount > 0
                ? t("groupExpensesList.youLent", { defaultValue: "You lent" })
                : t("groupExpensesList.noBalance", { defaultValue: "No balance" });
          const secondaryAmountClass =
            borrowedAmount > 0
              ? "text-red-600"
              : lentAmount > 0
                ? "text-emerald-600"
                : "text-muted-foreground";
          const secondaryAmountText =
            borrowedAmount > 0 || lentAmount > 0
              ? `${secondaryAmount.toFixed(2)} ${displayCurrency}`
              : t("groupExpensesList.notApplicable", { defaultValue: "not applicable" });

          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="group overflow-hidden border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                <CardContent className="relative px-2.5 py-2 sm:px-3">
                  <div className="pointer-events-none absolute left-2.5 top-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide text-muted-foreground sm:left-3">
                    <span>{expenseDateLabel}</span>
                    {expense.recurring_expense_id ? (
                      <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                        {t("groupExpensesList.recurring", { defaultValue: "Recurring" })}
                      </span>
                    ) : null}
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden"
                    onClick={() => setExpandedExpenseId((previous) => (previous === expense.id ? null : expense.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedExpenseId((previous) => (previous === expense.id ? null : expense.id));
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10 ${visualStyle.badgeClass}`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </span>

                    <div className="min-w-0 flex-1 max-w-[6.5rem] sm:max-w-[9.5rem] md:max-w-none">
                      <p className="truncate text-[13px] font-semibold text-foreground sm:text-sm">{expense.title}</p>
                      <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <span className="truncate">{categoryName}</span>
                      </div>
                    </div>

                    <div className="w-[74px] shrink-0 text-right sm:w-[88px]">
                      <p className="truncate text-[10px] text-muted-foreground">{payerLabel}</p>
                      {expense.user_id !== currentUserId ? (
                        <p className="truncate text-[10px] text-muted-foreground">{payerName}</p>
                      ) : null}
                      <p className="truncate text-[12px] font-bold text-foreground sm:text-sm">
                        {totalAmount.toFixed(2)} {displayCurrency}
                      </p>
                    </div>

                    <div className="w-[70px] shrink-0 text-right sm:w-[84px]">
                      <p className="truncate text-[10px] text-muted-foreground">{secondaryLabel}</p>
                      <p className={`truncate text-[12px] font-bold ${secondaryAmountClass} sm:text-sm`}>
                        {secondaryAmountText}
                      </p>
                    </div>

                    {canManage && onDelete ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("groupExpensesList.delete")}
                            className="h-7 w-7 shrink-0 opacity-100 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("groupExpensesList.deleteTitle")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("groupExpensesList.deleteDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("groupExpensesList.cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {t("groupExpensesList.delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`group-expense-details-${expense.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                          {canManage && onEdit ? (
                            <div className="mb-2 flex justify-end">
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => onEdit(expense)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                {t("groupExpensesList.edit")}
                              </Button>
                            </div>
                          ) : null}

                          <p>
                            <span className="font-medium">{t("groupExpensesList.paidBy")}: </span>
                            <span>{memberNameById[expense.user_id] ?? `${t("groupExpensesList.userPrefix")}#${expense.user_id}`}</span>
                          </p>
                          <p className="mt-1">
                            <span className="font-medium">{t("groupExpensesList.splitType")}: </span>
                            <span>{t(`groupExpensesList.split.${expense.split_type}`)}</span>
                          </p>

                          <div className="mt-2">
                            <p className="font-medium">{t("groupExpensesList.shares")}</p>
                            <div className="mt-1 space-y-1">
                              {expense.shares.map((share) => (
                                <div key={`${expense.id}-${share.user_id}`} className="flex items-center justify-between gap-2">
                                  <span className="truncate">
                                    {memberNameById[share.user_id] ?? `${t("groupExpensesList.userPrefix")}#${share.user_id}`}
                                  </span>
                                  <span className="font-medium text-foreground">
                                    {Number(share.share_amount).toFixed(2)} {displayCurrency}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <p className="mt-2 text-sm text-foreground break-words">
                            {hasNotes ? expense.notes : t("groupExpensesList.noNotes")}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
