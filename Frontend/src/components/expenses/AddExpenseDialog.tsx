import { useState } from "react";
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
import type { ApiPersonalExpenseCreate } from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";

// TODO: Po dodaniu icon_key w API, umożliwić wybór ikony przy tworzeniu kategorii

type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: ApiPersonalExpenseCreate) => void;
  isLoading?: boolean;
  categories: ApiCategoryResponse[];
};

type FormData = {
  title: string;
  amount: string;
  category_id: number;
  expense_date: string;
  notes: string;
};


export default function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  categories
}: AddExpenseDialogProps) {
  const defaultCategoryId = categories[0]?.id || 0;
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    category_id: defaultCategoryId,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleSubmit = () => {
    if (formData.title && formData.amount) {
      onSubmit({
        title: formData.title,
        amount: formData.amount,
        category_id: formData.category_id,
        expense_date: formData.expense_date,
        notes: formData.notes || null,
        currency: 'USD', // We'll make this configurable in Phase 2
      });
      
      setFormData({
        title: '',
        amount: '',
        category_id: defaultCategoryId,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
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
                value={formData.category_id.toString()}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  category_id: parseInt(value, 10)
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="expense_date">Date</Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
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