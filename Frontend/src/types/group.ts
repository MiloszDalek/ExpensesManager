// import type { User, Expense } from "@/types";

export const groupColors = {
  purple: "from-purple-500 to-purple-600",
  blue: "from-blue-500 to-blue-600",
  teal: "from-teal-500 to-teal-600",
  pink: "from-pink-500 to-pink-600",
  orange: "from-orange-500 to-orange-600",
};

// type GroupColorKey = keyof typeof groupColors;

// export interface Group {
//   id: number;
//   name: string;
//   description: string | null;
//   created_by?: number;
//   created_at?: string;

//   created_by_user?: User | null;
//   expenses?: Expense[];

//   members?: String[];
//   color?: GroupColorKey;
// }

import type { DecimalLike, ISODateTimeString } from "./common";
import type { GroupStatus, GroupMemberRole, GroupMemberStatus, CurrencyEnum } from "./enums";

export interface ApiGroupCreate {
  name: string;
  description?: string | null;
  currency: CurrencyEnum;
}

export interface ApiGroupUpdate {
  name?: string | null;
  description?: string | null;
  status?: GroupStatus | null;
  currency?: CurrencyEnum | null;
}

export interface ApiGroupResponse {
  id: number;
  name: string;
  description?: string | null;
  currency: CurrencyEnum;
  status: GroupStatus;
  created_by: number;
  created_at: ISODateTimeString;
  members_count?: number;
  expenses_count?: number;
  total_amount?: DecimalLike;
}

export interface ApiGroupMemberResponse {
  id: number;
  group_id: number;
  user_id: number;
  email: string;
  username: string;
  joined_at: ISODateTimeString;
  role: GroupMemberRole;
  status: GroupMemberStatus;
}