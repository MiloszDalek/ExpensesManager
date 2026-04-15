export type OcrStatus = "done" | "unavailable" | "failed";
export type OcrEngine = "paddle" | "tesseract";
export type OcrEngineMode = "auto" | OcrEngine;

export interface ApiReceiptLineItem {
  name: string;
  amount: string;
  confidence?: number | null;
}

export interface ApiReceiptUploadResponse {
  image_url?: string | null;
  receipt_text?: string | null;
  detected_amount?: string | null;
  detected_items?: ApiReceiptLineItem[];
  parsed_total?: string | null;
  parsed_date?: string | null;
  parsed_vendor?: string | null;
  parsed_items?: ApiReceiptLineItem[];
  ocr_status: OcrStatus;
  ocr_engine?: OcrEngine | null;
}
