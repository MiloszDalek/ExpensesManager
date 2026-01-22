import { categoryIcons } from "@/types/categoryIcons";
import { Smartphone } from "lucide-react";

export function getCategoryIcon(category: string | null) {
  const key = category && category in categoryIcons ? category : "other";
  return categoryIcons[key as keyof typeof categoryIcons] || Smartphone;
}
