import client from "./client";
import type { ApiReceiptUploadResponse, OcrEngineMode } from "@/types";

export const receiptsApi = {
  upload: async (file: File, ocrEngineMode: OcrEngineMode = "auto"): Promise<ApiReceiptUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await client.post<ApiReceiptUploadResponse>("/receipts/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      params: {
        ocr_engine: ocrEngineMode,
      },
    });

    return data;
  },
};
