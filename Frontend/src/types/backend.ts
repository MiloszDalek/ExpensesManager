export type ISODateTimeString = string;
export type DecimalLike = number | string;

export type CurrencyEnum = "PLN" | "USD" | "EUR";
export type SplitType = "equal" | "percent" | "exact";

export type GroupStatus = "active" | "archived";
export type GroupMemberRole = "admin" | "member";
export type GroupMemberStatus = "active" | "left";

export type InvitationStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type InvitationType = "contact" | "group";

export type NotificationType = "invitation";

export type PaymentMethod = "cash";
export type SettlementStatus = "pending" | "completed" | "failed";

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
}

export interface ApiGroupMemberResponse {
  id: number;
  group_id: number;
  user_id: number;
  joined_at: ISODateTimeString;
  role: GroupMemberRole;
  status: GroupMemberStatus;
}

export interface ApiExpenseShare {
  user_id: number;
  share_amount: DecimalLike;
}

export interface ApiPersonalExpenseCreate {
  title: string;
  amount: DecimalLike;
  currency?: CurrencyEnum;
  expense_date: ISODateTimeString;
  category_id: number;
  notes?: string | null;
  receipt_image_url?: string | null;
  receipt_text?: string | null;
}

export interface ApiPersonalExpenseUpdate {
  title?: string | null;
  amount?: DecimalLike | null;
  currency?: CurrencyEnum | null;
  expense_date?: ISODateTimeString | null;
  category_id?: number | null;
  receipt_image_url?: string | null;
  receipt_text?: string | null;
}

export interface ApiPersonalExpenseResponse extends ApiPersonalExpenseCreate {
  id: number;
  created_at: ISODateTimeString;
}

export interface ApiGroupExpenseCreate extends ApiPersonalExpenseCreate {
  split_type: SplitType;
  shares: ApiExpenseShare[];
}

export interface ApiGroupExpenseUpdate {
  title?: string | null;
  amount?: DecimalLike | null;
  currency?: CurrencyEnum | null;
  expense_date?: ISODateTimeString | null;
  category_id?: number | null;
  notes?: string | null;
  split_type?: SplitType | null;
  shares?: ApiExpenseShare[] | null;
}

export interface ApiGroupExpenseResponse extends ApiGroupExpenseCreate {
  id: number;
  user_id: number;
  created_at: ISODateTimeString;
}

export interface ApiCategoryCreate {
  name: string;
}

export interface ApiCategoryResponse {
  id: number;
  name: string;
  user_id?: number | null;
  group_id?: number | null;
  created_at: ISODateTimeString;
}

export interface ApiContactResponse {
  id: number;
  user_id: number;
  contact_id: number;
  created_at: ISODateTimeString;
}

export interface ApiContactInvitationCreate {
  to_user_id: number;
}

export interface ApiGroupInvitationCreate extends ApiContactInvitationCreate {
  group_id: number;
}

export interface ApiInvitationBaseResponse {
  id: number;
  type: InvitationType;
  status: InvitationStatus;
  from_user_id: number;
  to_user_id: number;
  created_at: ISODateTimeString;
  responded_at?: ISODateTimeString | null;
}

export interface ApiContactInvitationResponse extends ApiInvitationBaseResponse {
  type: "contact";
}

export interface ApiGroupInvitationResponse extends ApiInvitationBaseResponse {
  type: "group";
  group_id: number;
}

export type ApiInvitationResponse = ApiContactInvitationResponse | ApiGroupInvitationResponse;

export interface ApiNotificationResponse {
  id: number;
  user_id: number;
  type: NotificationType;
  reference_id?: number | null;
  message?: string | null;
  action_url?: string | null;
  is_read: boolean;
  created_at: ISODateTimeString;
}

export interface ApiUnreadNotificationCountResponse {
  count: number;
}

export interface ApiUserBalanceItem {
  user_id: number;
  amount: DecimalLike;
}

export interface ApiGroupBalances {
  group_id: number;
  total_balance: DecimalLike;
  balances: ApiUserBalanceItem[];
}

export interface ApiContactBalanceByGroup {
  group_id: number;
  balance: DecimalLike;
}

export interface ApiSettlementCreate {
  to_user_id: number;
  group_id?: number | null;
  currency?: CurrencyEnum;
  payment_method?: PaymentMethod;
  transaction_id?: string | null;
}

export interface ApiSettlementResponse extends ApiSettlementCreate {
  id: number;
  status: SettlementStatus;
  created_at: ISODateTimeString;
}
