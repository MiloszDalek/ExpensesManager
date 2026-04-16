import type { DecimalLike, ISODateString, ISODateTimeString } from "./common";

export interface ApiSavingsGoalCreate {
  name: string;
  target_amount: DecimalLike;
  deadline?: ISODateString | null;
  budget_pool_id?: number | null;
  auto_allocate_amount?: DecimalLike | null;
}

export interface ApiSavingsGoalUpdate {
  name?: string | null;
  target_amount?: DecimalLike | null;
  current_amount?: DecimalLike | null;
  deadline?: ISODateString | null;
  budget_pool_id?: number | null;
  auto_allocate_amount?: DecimalLike | null;
  is_active?: boolean | null;
}

export interface ApiSavingsGoalAllocateRequest {
  amount: DecimalLike;
  budget_pool_id?: number | null;
  notes?: string | null;
}

export interface ApiSavingsGoalResponse {
  id: number;
  user_id: number;
  name: string;
  target_amount: DecimalLike;
  current_amount: DecimalLike;
  deadline: ISODateString | null;
  budget_pool_id: number | null;
  auto_allocate_amount: DecimalLike | null;
  is_active: boolean;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
}

export interface ApiSavingsGoalAllocationResponse {
  id: number;
  goal_id: number;
  user_id: number;
  budget_id: number | null;
  budget_pool_id: number | null;
  amount: DecimalLike;
  allocation_type: "manual" | "auto";
  notes: string | null;
  created_at: ISODateTimeString;
}

export interface ApiSavingsGoalProgressResponse {
  goal: ApiSavingsGoalResponse;
  progress_percent: number;
  remaining_amount: DecimalLike;
  allocations: ApiSavingsGoalAllocationResponse[];
}

export interface ApiSavingsGoalAutoAllocateSummaryResponse {
  budget_id: number;
  processed_goals_count: number;
  allocated_goals_count: number;
  total_allocated_amount: DecimalLike;
}
