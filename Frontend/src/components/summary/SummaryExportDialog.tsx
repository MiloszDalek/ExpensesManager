import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DialogInfoButton from "@/components/help/DialogInfoButton";
import type { ExportFormat, ExportSection } from "@/hooks/useSummaryExport";

interface SummaryExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  exportSections: ExportSection[];
  onSectionToggle: (section: ExportSection) => void;
  exportFilename: string;
  onExportFilenameChange: (value: string) => void;
  isPending: boolean;
  pendingFormat: ExportFormat | null;
  onSubmit: () => void;
}

export default function SummaryExportDialog({
  open,
  onOpenChange,
  format,
  onFormatChange,
  exportSections,
  onSectionToggle,
  exportFilename,
  onExportFilenameChange,
  isPending,
  pendingFormat,
  onSubmit,
}: SummaryExportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("summaryPage.export")}</DialogTitle>
            <DialogInfoButton dialogKey="exportSummary" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_4fr] gap-2">
            <div className="space-y-2">
              <Label>{t("summaryPage.exportFormatLabel")}</Label>
              <Select value={format} onValueChange={(value) => onFormatChange(value as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xlsx">XLSX</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("summaryPage.exportFilenameLabel")}</Label>
              <Input
                type="text"
                value={exportFilename}
                onChange={(event) => onExportFilenameChange(event.target.value)}
                placeholder={t("summaryPage.exportFilenamePlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("summaryPage.exportSectionsLabel")}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-transactions"
                  checked={exportSections.includes("transactions")}
                  onCheckedChange={() => onSectionToggle("transactions")}
                />
                <Label
                  htmlFor="section-transactions"
                  className="cursor-pointer font-normal"
                >
                  {t("summaryPage.exportSectionTransactions")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="section-category-summary"
                  checked={exportSections.includes("category_summary")}
                  onCheckedChange={() => onSectionToggle("category_summary")}
                />
                <Label
                  htmlFor="section-category-summary"
                  className="cursor-pointer font-normal"
                >
                  {t("summaryPage.exportSectionCategorySummary")}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending || exportSections.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {pendingFormat ? t("summaryPage.exporting") : t("summaryPage.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
