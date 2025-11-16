import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ExpenseFilters({ filters, onFilterChange }) {
  return (
    <div className="mb-6">
      <Tabs 
        value={filters.category} 
        onValueChange={(value) => onFilterChange({ ...filters, category: value })}
      >
        <TabsList className="bg-white/80 backdrop-blur-sm shadow-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="food">Food</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="shopping">Shopping</TabsTrigger>
          <TabsTrigger value="entertainment">Entertainment</TabsTrigger>
          <TabsTrigger value="other">Other</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}