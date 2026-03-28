import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag, Car, Home, Utensils, Smartphone, Heart, Wallet } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
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

// TODO: Po dodaniu icon_key w API, renderuj ikonę kategorii obok jej nazwy

// Default icon and color mappings
const defaultIcon = Smartphone;
const defaultColor = "from-gray-500 to-slate-500";

// Helper function to get category name by ID
const getCategoryName = (categoryId: number, categories: ApiCategoryResponse[]): string => {
  const category = categories.find(c => c.id === categoryId);
  return category?.name || 'Other';
};

type ExpensesListProps = {
  expenses: ApiPersonalExpenseResponse[];
  categories: ApiCategoryResponse[];
  isLoading: boolean;
  onDelete: (id: number) => void;
};


export default function ExpensesList({ expenses, categories, isLoading, onDelete }: ExpensesListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
        <CardContent className="p-12 text-center">
          <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No expenses yet</h3>
          <p className="text-gray-500">Start tracking your spending by adding your first expense</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <AnimatePresence>
        {expenses.map((expense, index) => {
          const categoryName = getCategoryName(expense.category_id, categories);
          const Icon = defaultIcon; // We'll enhance this with proper icon mapping later
          const gradient = defaultColor; // We'll enhance this with proper color mapping later
          
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
                <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{expense.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-gray-500">
                            {format(new Date(expense.expense_date), "MMM d, yyyy")}
                          </p>
                          <span className="text-gray-300">•</span>
                          <p className="text-sm text-gray-500 capitalize">{categoryName}</p>
                        </div>
                        {expense.notes && expense.notes !== '' && (
                          <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${Number(expense.amount).toFixed(2)}
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this expense. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(expense.id)} className="bg-red-600 hover:bg-red-700">
                              Delete
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
