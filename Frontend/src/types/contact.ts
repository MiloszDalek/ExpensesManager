import type { ISODateTimeString } from "./common";

export interface ApiContactResponse {
  id: number;
  user_id: number;
  contact_id: number;
  email: string;
  username: string;
  created_at: ISODateTimeString;
}