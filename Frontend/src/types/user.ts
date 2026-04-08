import type { ISODateTimeString } from "./common";
import type { SystemUserRole } from "./enums";

export type User = {
  id: number;
  username: string;
  email: string;
  role: SystemUserRole;
  is_active: boolean;
  created_at: ISODateTimeString;
};

export interface ApiUserUpdate {
  email?: string;
  username?: string;
  password?: string;
  is_active?: boolean;
}

export interface ApiSystemUserActivityResponse {
  id: number;
  username: string;
  email: string;
  role: SystemUserRole;
  is_active: boolean;
  created_at: ISODateTimeString;
  groups_count: number;
  expenses_count: number;
  sent_invitations_count: number;
  settlements_count: number;
  last_activity_at?: ISODateTimeString | null;
}

export interface ApiSystemUserActivityStatsResponse {
  total_users: number;
  active_users: number;
  inactive_users: number;
}