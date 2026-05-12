import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { expensesSummaryApi } from "@/api";
import type { ApiExpenseSummaryDrilldownParams, ExpenseSummaryScope, CurrencyEnum } from "@/types";

type ExportFormat = "csv" | "xlsx" | "pdf";

type ExportMutationVariables = {
  format: ExportFormat;
};

type ExportSection = "transactions" | "category_summary";

interface UseSummaryExportParams {
  scope: ExpenseSummaryScope;
  groupId: number | undefined;
  dateFrom: string;
  dateTo: string;
  categoryIds: number[];
  currency: CurrencyEnum;
  sortBy: "expense_date" | "amount";
  sortOrder: "asc" | "desc";
}

export type { ExportFormat, ExportMutationVariables, ExportSection };

export function useSummaryExport(params: UseSummaryExportParams) {
  const { i18n } = useTranslation();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [pendingExportFormat, setPendingExportFormat] = useState<ExportFormat | null>(null);
  const [exportSections, setExportSections] = useState<ExportSection[]>(["transactions", "category_summary"]);
  const [exportFilename, setExportFilename] = useState("");

  const exportMutation = useMutation<{ blob: Blob; filename: string }, Error, ExportMutationVariables>({
    mutationFn: ({ format }) => {
      const sections = exportSections.join(",");
      const baseParams: ApiExpenseSummaryDrilldownParams = {
        scope: params.scope,
        group_id: params.groupId,
        date_from: params.dateFrom,
        date_to: params.dateTo,
        category_ids: params.categoryIds.length > 0 ? params.categoryIds : undefined,
        currency: params.currency,
        sort_by: params.sortBy,
        sort_order: params.sortOrder,
        sections: sections || undefined,
        filename: exportFilename.trim() || undefined,
      };
      const activeLocale = i18n.resolvedLanguage || i18n.language || "en";

      if (format === "xlsx") {
        return expensesSummaryApi.exportXlsx(baseParams, activeLocale);
      }

      if (format === "pdf") {
        return expensesSummaryApi.exportPdf(baseParams, activeLocale);
      }

      return expensesSummaryApi.exportCsv(baseParams, activeLocale);
    },
    onMutate: ({ format }) => {
      setPendingExportFormat(format);
    },
    onSuccess: ({ blob, filename }) => {
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    },
    onSettled: () => {
      setPendingExportFormat(null);
    },
  });

  const handleExportFormatChange = (nextFormat: ExportFormat) => {
    setExportFormat(nextFormat);
  };

  const handleExportSectionToggle = (section: ExportSection) => {
    setExportSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleExportSubmit = () => {
    exportMutation.mutate({ format: exportFormat });
    setIsExportDialogOpen(false);
  };

  return {
    isExportDialogOpen,
    setIsExportDialogOpen,
    exportFormat,
    pendingExportFormat,
    exportSections,
    exportFilename,
    setExportFilename,
    exportMutation,
    handleExportFormatChange,
    handleExportSectionToggle,
    handleExportSubmit,
  };
}
