import type { ISODateTimeString } from "./common";

export interface ApiCategoryCreate {
  name: string;
}

export interface ApiCategoryResponse {
  id: number;
  name: string;
  user_id?: number | null;
  group_id?: number | null;
  created_at: ISODateTimeString;
  // icon_key?: string; // TODO: obsługa ikon kategorii w przyszłości
}