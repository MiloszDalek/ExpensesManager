export const groupColors = {
  purple: "from-purple-500 to-purple-600",
  blue: "from-blue-500 to-blue-600",
  teal: "from-teal-500 to-teal-600",
  pink: "from-pink-500 to-pink-600",
  orange: "from-orange-500 to-orange-600",
};

type GroupColorKey = keyof typeof groupColors;

export interface Group {
  id: number;
  name: string;
  members?: string[];
  color?: GroupColorKey;
}