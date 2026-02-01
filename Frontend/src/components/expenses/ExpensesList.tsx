import React from "react";
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

const categoryIcons = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  shopping: ShoppingBag,
  entertainment: Heart,
  groceries: ShoppingBag,
  other: Smartphone,
};

const categoryColors = {
  food: "from-orange-500 to-red-500",
  transport: "from-blue-500 to-cyan-500",
  accommodation: "from-purple-500 to-pink-500",
  shopping: "from-pink-500 to-rose-500",
  entertainment: "from-violet-500 to-purple-500",
  utilities: "from-yellow-500 to-orange-500",
  health: "from-green-500 to-emerald-500",
  groceries: "from-lime-500 to-green-500",
  other: "from-gray-500 to-slate-500",
};

export type ExpenseCategory =
  | "food"
  | "transport"
  | "accommodation"
  | "entertainment"
  | "shopping"
  | "utilities"
  | "health"
  | "groceries"
  | "other";

export type Expense = {
  id: number;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;       // ISO string, np. "2026-01-20"
  notes?: string;
  is_personal: boolean;
  paid_by: string;
};

type ExpensesListProps = {
  expenses: Expense[];
  isLoading: boolean;
  onDelete: (id: number) => void;
};


export default function ExpensesList({ expenses, isLoading, onDelete }: ExpensesListProps) {
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
          const Icon = categoryIcons[expense.category as keyof typeof categoryIcons] || Smartphone;
          const gradient = categoryColors[expense.category] || categoryColors.other;
          
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
                            {format(new Date(expense.date), "MMM d, yyyy")}
                          </p>
                          <span className="text-gray-300">•</span>
                          <p className="text-sm text-gray-500 capitalize">{expense.category}</p>
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-gray-600 mt-1">{expense.notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          ${expense.amount.toFixed(2)}
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
