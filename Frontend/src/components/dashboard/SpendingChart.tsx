import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

import type { User, Expense } from "@/types";

const COLORS = ['#8B5CF6', '#14B8A6', '#EC4899', '#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#6366F1'];

interface SpendingChartProps {
  expenses: Expense[];
  user: User;
}

export default function SpendingChart({ expenses, user }: SpendingChartProps) {
  const personalExpenses = expenses.filter(e => e.is_personal && e.paid_by === user.email);

  // Group expenses by category
  const categoryData = personalExpenses.reduce((acc: Record<string, number>, expense) => {
    const category = expense.category || 'other';
    acc[category] = (acc[category] || 0) + expense.amount;
    return acc;
  }, {});

  const chartData = Object.entries(categoryData)
    .map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount: parseFloat(amount.toFixed(2)),
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No personal expenses yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                {chartData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}