import type { ISODateTimeString } from "./common";
import type { CategorySection } from "./enums";

export interface ApiCategoryCreate {
  name: string;
  section: CategorySection;
}

export interface ApiCategoryUpdate {
  name?: string;
  section?: CategorySection;
}

export interface ApiCategoryResponse {
  id: number;
  name: string;
  section?: CategorySection | null;
  user_id?: number | null;
  group_id?: number | null;
  created_at: ISODateTimeString;
  // icon_key?: string; // TODO: obsługa ikon kategorii w przyszłości
}