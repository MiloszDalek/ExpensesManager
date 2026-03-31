import type { ApiCategoryResponse } from "@/types/category";
import CategoryPicker from "./CategoryPicker";

type ExpenseFiltersProps = {
  filters: {
    category: string;
    [key: string]: unknown;
  };
  onFilterChange: (next: ExpenseFiltersProps["filters"]) => void;
  categories: ApiCategoryResponse[];
};

export default function ExpenseFilters({ filters, onFilterChange, categories }: ExpenseFiltersProps) {
  const handleCategoryChange = (value: string) => {
    onFilterChange({ ...filters, category: value });
  };

  return (
    <div className="mb-6">
      <CategoryPicker
        value={filters.category}
        onValueChange={handleCategoryChange}
        categories={categories}
        trigger="button"
        mobileInset={true}
      />
    </div>
  );
}