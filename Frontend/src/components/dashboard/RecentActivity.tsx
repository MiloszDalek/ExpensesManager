import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import { format } from "date-fns";
import { toFixedSafe } from "@/utils/toFiniteNumber";

import type { User } from "@/types";

interface RecentActivityProps {
  expenses: Array<{
    id: number;
    title: string;
    amount: number;
    currency: string;
    created_at: string;
  }>;
  user?: User;
}

export default function RecentActivity({ expenses }: RecentActivityProps) {
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
            {recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50"
              >
                <div>
                  <h4 className="font-medium text-gray-900">{expense.title}</h4>
                  <p className="text-xs text-gray-500">
                    {format(new Date(expense.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <p className="font-semibold text-gray-900">
                  {toFixedSafe(expense.amount, 2)} {expense.currency}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}