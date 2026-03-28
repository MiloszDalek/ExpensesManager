import { ShoppingBag, Car, Home, Utensils, Smartphone } from "lucide-react";

// TODO: Po dodaniu icon_key w API, mapuj icon_key na komponent ikony z tej mapy
export const categoryIcons = {
  food: Utensils,
  transport: Car,
  accommodation: Home,
  shopping: ShoppingBag,
  groceries: ShoppingBag,
  other: Smartphone,
};
