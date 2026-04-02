import client from "./client";
import type { ApiReceiptUploadResponse } from "@/types";

export const receiptsApi = {
  upload: async (file: File): Promise<ApiReceiptUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const { data } = await client.post<ApiReceiptUploadResponse>("/receipts/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};
