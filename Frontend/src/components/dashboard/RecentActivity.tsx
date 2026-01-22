import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

import type { User, Expense } from "@/types";
import { getCategoryIcon } from "@/utils/category";

interface RecentActivityProps {
  expenses: Expense[];
  user: User;
}

export default function RecentActivity({ expenses, user }: RecentActivityProps) {
  const recentExpenses = expenses.slice(0, 8);

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {recentExpenses.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No expenses yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((expense, index) => {
              const Icon = getCategoryIcon(expense.category);
              const isPaidByMe = expense.payer_id === user.id;
              
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-teal-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{expense.title}</h4>
                      <p className="text-xs text-gray-500">
                        {format(new Date(expense.created_at), "MMM d, yyyy")} · {expense.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isPaidByMe ? 'text-green-600' : 'text-gray-900'}`}>
                      {expense.amount.toFixed(2)} {expense.currency}
                    </p>
                    {!expense.is_personal && (
                      <p className="text-xs text-gray-500">
                        {isPaidByMe ? 'You paid' : 'Split'}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}