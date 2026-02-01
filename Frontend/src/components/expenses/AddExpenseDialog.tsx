import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const categories = [
  'food',
  'transport',
  'accommodation',
  'entertainment',
  'shopping',
  'utilities',
  'health',
  'groceries',
  'other'
];


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


type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: Omit<Expense, "id">) => void; // id zostanie nadany później
  isLoading?: boolean;
};

type FormData = {
  title: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
  notes: string;
};


export default function AddExpenseDialog({ open, onOpenChange, onSubmit, isLoading }: AddExpenseDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    category: 'food',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleSubmit = () => {
    if (formData.title && formData.amount) {
      onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
        is_personal: true,
        paid_by: "milosz@gmail.com",
      });
      setFormData({
        title: '',
        amount: '',
        category: 'food',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Personal Expense</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Lunch, Groceries, etc."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as ExpenseCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional details..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title || !formData.amount || isLoading}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            Add Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}