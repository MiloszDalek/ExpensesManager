import client from "./client";
import type {
  ApiExpenseSummaryDrilldownParams,
  ApiExpenseSummaryDrilldownResponse,
  ApiExpenseSummaryOverviewParams,
  ApiExpenseSummaryOverviewResponse,
  ApiExpenseSummaryTrendsParams,
  ApiExpenseSummaryTrendsResponse,
} from "@/types";

const getFilenameFromDisposition = (contentDisposition?: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
};

export const expensesSummaryApi = {
  overview: async (params?: ApiExpenseSummaryOverviewParams): Promise<ApiExpenseSummaryOverviewResponse> => {
    const { data } = await client.get<ApiExpenseSummaryOverviewResponse>("/expenses/summary/overview", {
      params,
    });
    return data;
  },

  trends: async (params?: ApiExpenseSummaryTrendsParams): Promise<ApiExpenseSummaryTrendsResponse> => {
    const { data } = await client.get<ApiExpenseSummaryTrendsResponse>("/expenses/summary/trends", {
      params,
    });
    return data;
  },

  drilldown: async (params?: ApiExpenseSummaryDrilldownParams): Promise<ApiExpenseSummaryDrilldownResponse> => {
    const { data } = await client.get<ApiExpenseSummaryDrilldownResponse>("/expenses/summary/drilldown", {
      params,
    });
    return data;
  },

  exportCsv: async (params?: ApiExpenseSummaryDrilldownParams): Promise<{ blob: Blob; filename: string }> => {
    const response = await client.get<Blob>("/expenses/summary/export/csv", {
      params,
      responseType: "blob",
    });

    const filenameFromHeader = getFilenameFromDisposition(response.headers["content-disposition"]);

    return {
      blob: response.data,
      filename: filenameFromHeader || `expenses-summary-${Date.now()}.csv`,
    };
  },

  exportXlsx: async (
    params?: ApiExpenseSummaryDrilldownParams,
    locale?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const requestParams = locale ? { ...(params ?? {}), locale } : params;
    const response = await client.get<Blob>("/expenses/summary/export/xlsx", {
      params: requestParams,
      responseType: "blob",
    });

    const filenameFromHeader = getFilenameFromDisposition(response.headers["content-disposition"]);

    return {
      blob: response.data,
      filename: filenameFromHeader || `expenses-summary-${Date.now()}.xlsx`,
    };
  },

  exportPdf: async (
    params?: ApiExpenseSummaryDrilldownParams,
    locale?: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const requestParams = locale ? { ...(params ?? {}), locale } : params;
    const response = await client.get<Blob>("/expenses/summary/export/pdf", {
      params: requestParams,
      responseType: "blob",
    });

    const filenameFromHeader = getFilenameFromDisposition(response.headers["content-disposition"]);

    return {
      blob: response.data,
      filename: filenameFromHeader || `expenses-summary-${Date.now()}.pdf`,
    };
  },
};
