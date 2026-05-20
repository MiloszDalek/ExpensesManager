import type {
  ApiCategoryResponse,
  ApiExpenseShare,
  ApiGroupExpenseCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiPersonalExpenseCreate,
  ApiReceiptLineItem,
  OcrEngine,
  OcrEngineMode,
} from "@/types";

export type ExpenseScope = "personal" | "group";

export type ScannerItem = ApiReceiptLineItem & {
  id: string;
  is_used: boolean;
  is_selected: boolean;
};

export type {
  ApiCategoryResponse,
  ApiExpenseShare,
  ApiGroupExpenseCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiPersonalExpenseCreate,
  ApiReceiptLineItem,
  OcrEngine,
  OcrEngineMode,
};
