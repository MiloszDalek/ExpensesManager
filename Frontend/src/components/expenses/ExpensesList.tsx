import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Wallet } from "lucide-react";
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
import { getCategoryIcon, getCategoryVisualStyle } from "@/utils/category";

type ExpensesListProps = {
  expenses: ApiPersonalExpenseResponse[];
  categories: ApiCategoryResponse[];
  isLoading: boolean;
  onDelete: (id: number) => void;
};


export default function ExpensesList({ expenses, categories, isLoading, onDelete }: ExpensesListProps) {
  const { t } = useTranslation();

  const getCategory = (categoryId: number) => {
    return categories.find((c) => c.id === categoryId) ?? null;
  };

  const getCategoryLabel = (category: ApiCategoryResponse | null): string => {
    if (!category) {
      return t("category.other", { defaultValue: "Other" });
    }

    if (category.user_id == null) {
      return t(`category.${category.name}`, { defaultValue: category.name });
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
    <div className="grid gap-4">
      <AnimatePresence>
        {expenses.map((expense, index) => {
          const category = getCategory(expense.category_id);
          const categoryName = getCategoryLabel(category);
          const Icon = getCategoryIcon(category ?? "other");
          const visualStyle = getCategoryVisualStyle(category ?? "other");
          
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border border-border shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className={`h-1 bg-gradient-to-r ${visualStyle.gradientClass}`} />
                <CardContent className="py-6 pr-6 pl-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${visualStyle.gradientClass} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground">{expense.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(expense.expense_date), "MMM d, yyyy")}
                          </p>
                          <span className="text-muted-foreground/50">•</span>
                          <p className="text-sm text-muted-foreground capitalize">{categoryName}</p>
                        </div>
                        {expense.notes && expense.notes !== '' && (
                          <p className="text-sm text-muted-foreground mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          {Number(expense.amount).toFixed(2)} {expense.currency}
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-5 h-5" />
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
