import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
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
import type { ApiPersonalExpenseResponse } from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import {
  formatCategoryNameForDisplay,
  getCategoryIcon,
  getCategoryVisualStyle,
  resolveCategoryGroup,
} from "@/utils/category";

type ExpensesListProps = {
  expenses: ApiPersonalExpenseResponse[];
  categories: ApiCategoryResponse[];
  isLoading: boolean;
  onDelete: (id: number) => void;
  onEdit: (expense: ApiPersonalExpenseResponse) => void;
};


export default function ExpensesList({ expenses, categories, isLoading, onDelete, onEdit }: ExpensesListProps) {
  const { t } = useTranslation();
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  const toggleExpandedExpense = (expenseId: number) => {
    setExpandedExpenseId((previous) => (previous === expenseId ? null : expenseId));
  };

  const getCategory = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId) ?? null;
  };

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
      <div className="grid gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 rounded bg-muted"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="border border-border shadow-xl bg-card/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <Wallet className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">{t("expensesList.emptyTitle")}</h3>
          <p className="text-muted-foreground">{t("expensesList.emptyDescription")}</p>
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
          const categoryGroup = resolveCategoryGroup(category ?? "other");
          const categoryGroupLabel = t(`categoryGroups.${categoryGroup}`);
          const isExpanded = expandedExpenseId === expense.id;
          const hasNotes = !!expense.notes && expense.notes.trim() !== "";
          
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group overflow-hidden border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
                <CardContent className="px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex min-w-0 cursor-pointer items-center gap-1.5 sm:gap-2"
                    onClick={() => toggleExpandedExpense(expense.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpandedExpense(expense.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? t("expensesList.collapse") : t("expensesList.expand")}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md sm:h-10 sm:w-10 ${visualStyle.badgeClass}`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold leading-tight text-foreground sm:text-[13px]">{expense.title}</p>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span>{format(new Date(expense.expense_date), "MMM d, yyyy")}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="truncate">{categoryGroupLabel}</span>
                        {expense.recurring_expense_id ? (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              {t("expensesList.recurring", { defaultValue: "Recurring" })}
                            </span>
                          </>
                        ) : null}
                        <>
                          <span className="hidden text-muted-foreground/50 sm:inline">/</span>
                          <span className="hidden truncate sm:inline">{categoryName}</span>
                        </>
                      </div>
                    </div>

                    <div className="w-[5.8rem] shrink-0 text-right sm:w-auto">
                      <p className="truncate text-[11px] font-bold text-foreground sm:text-sm">
                        {Number(expense.amount).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-muted-foreground sm:text-xs">
                        {expense.currency}
                      </p>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={t("expensesList.delete")}
                          className="h-7 w-7 opacity-100 text-muted-foreground transition-opacity hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("expensesList.deleteTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("expensesList.deleteDescription")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("expensesList.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(expense.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t("expensesList.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={`expense-details-${expense.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2.5 border-t border-border pt-2.5">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="grid gap-1 text-xs text-muted-foreground">
                              <p>
                                <span className="font-medium">{t("expensesList.mainCategory")}: </span>
                                <span>{categoryGroupLabel}</span>
                              </p>
                              <p>
                                <span className="font-medium">{t("expensesList.categoryLabel")}: </span>
                                <span>{categoryName}</span>
                              </p>
                            </div>

                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={() => onEdit(expense)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t("expensesList.edit")}
                            </Button>
                          </div>

                          <p className="text-xs font-medium text-muted-foreground">{t("addExpenseDialog.notes")}</p>
                          <p className="mt-1 text-sm text-foreground break-words">
                            {hasNotes ? expense.notes : t("expensesList.noNotes")}
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
