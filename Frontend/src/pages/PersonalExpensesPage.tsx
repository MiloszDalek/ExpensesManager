import React, { useState, useEffect } from "react";
// import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import AddExpenseDialog from "../components/expenses/AddExpenseDialog";
import ExpensesList from "../components/expenses/ExpensesList";
import ExpenseFilters from "../components/expenses/ExpenseFilters";
import { useAuth } from "@/contexts/AuthContext";

import mockExpenses from "@/mocks/expenses-mock-data.json";

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

const expensesMock: Expense[] = mockExpenses as Expense[];

export default function PersonalExpensesPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filters, setFilters] = useState({ category: 'all' });
  const queryClient = useQueryClient();

  const { user, logout } = useAuth();

  const [mockExpenses, setMockExpenses] = useState<Expense[]>(expensesMock);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['personal-expenses'],
    queryFn: async () => {
      await new Promise(res => setTimeout(res, 300));
      return mockExpenses.filter(e => e.is_personal && e.paid_by === user?.email);
    },
    enabled: !!user,
  });

  const createExpenseMutation = useMutation<Expense, unknown, Omit<Expense, "id">>({
    mutationFn: (expenseData) => {
      const newExpense: Expense = {
        ...expenseData,
        id: Math.floor(Math.random() * 100000), // number
        is_personal: true,
        paid_by: user?.email!,
      };
      setMockExpenses(prev => [newExpense, ...prev]);
      return Promise.resolve(newExpense);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-expenses'] });
      setShowAddDialog(false);
    }
  });

  const deleteExpenseMutation = useMutation<number, unknown, number>({
    mutationFn: (expenseId) => {
      setMockExpenses(prev => prev.filter(e => e.id !== expenseId));
      return Promise.resolve(expenseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-expenses'] });
    }
  });


  // const { data: expenses = [], isLoading } = useQuery({
  //   queryKey: ['personal-expenses'],
  //   queryFn: async () => {
  //     const allExpenses = await base44.entities.Expense.list('-date');
  //     return allExpenses.filter(e => e.is_personal && e.paid_by === user?.email);
  //   },
  //   enabled: !!user,
  // });

  // const createExpenseMutation = useMutation({
  //   mutationFn: (expenseData) => base44.entities.Expense.create({
  //     ...expenseData,
  //     is_personal: true,
  //     paid_by: user.email,
  //   }),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['personal-expenses'] });
  //     queryClient.invalidateQueries({ queryKey: ['expenses'] });
  //     setShowAddDialog(false);
  //   },
  // });

  // const deleteExpenseMutation = useMutation({
  //   mutationFn: (expenseId) => base44.entities.Expense.delete(expenseId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['personal-expenses'] });
  //     queryClient.invalidateQueries({ queryKey: ['expenses'] });
  //   },
  // });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const filteredExpenses = filters.category === 'all' 
    ? expenses 
    : expenses.filter(e => e.category === filters.category);

  const totalSpending = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Personal Expenses</h1>
            <p className="text-gray-500 mt-2">
              Track your spending · Total: <span className="font-semibold text-purple-600">${totalSpending.toFixed(2)}</span>
            </p>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </motion.div>

        <ExpenseFilters filters={filters} onFilterChange={setFilters} />

        <ExpensesList
          expenses={filteredExpenses}
          isLoading={isLoading}
          onDelete={(id) => deleteExpenseMutation.mutate(id)}
        />
      </div>

      <AddExpenseDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSubmit={(data) => createExpenseMutation.mutate(data)}
        isLoading={createExpenseMutation.isPending}
      />
    </div>
  );
}