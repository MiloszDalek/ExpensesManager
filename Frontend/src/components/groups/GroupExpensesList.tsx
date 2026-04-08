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
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

import { formatCategoryNameForDisplay, getCategoryIcon, getCategoryVisualStyle } from "@/utils/category";
import type { ApiCategoryResponse, ApiGroupExpenseResponse } from "@/types";

type GroupExpensesListProps = {
  expenses: ApiGroupExpenseResponse[];
  categories: ApiCategoryResponse[];
  memberNameById: Record<number, string>;
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
  fallbackCurrency,
  isLoading,
  onEdit,
  onDelete,
  canManageExpense,
}: GroupExpensesListProps) {
  const { t } = useTranslation();
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

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

          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="group overflow-hidden border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                <CardContent className="px-3 py-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => setExpandedExpenseId((previous) => (previous === expense.id ? null : expense.id))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedExpenseId((previous) => (previous === expense.id ? null : expense.id));
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${visualStyle.badgeClass}`}>
                      <Icon className="h-6 w-6" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{expense.title}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <span>{format(new Date(expense.expense_date), "MMM d, yyyy")}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="truncate">{categoryName}</span>
                      </div>
                    </div>

                    <p className="shrink-0 text-sm font-bold text-foreground">
                      {Number(expense.amount).toFixed(2)} {displayCurrency}
                    </p>

                    {canManage && onDelete ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("groupExpensesList.delete")}
                            className="h-7 w-7 opacity-100 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
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
