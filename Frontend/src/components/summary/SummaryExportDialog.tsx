import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExportFormat } from "@/hooks/useSummaryExport";

interface SummaryExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  isPending: boolean;
  pendingFormat: ExportFormat | null;
  onSubmit: () => void;
}

export default function SummaryExportDialog({
  open,
  onOpenChange,
  format,
  onFormatChange,
  isPending,
  pendingFormat,
  onSubmit,
}: SummaryExportDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("summaryPage.export", { defaultValue: "Export" })}</DialogTitle>
          <DialogDescription>
            {t("summaryPage.exportCurrentViewHint", {
              defaultValue: "Export always uses the filters from your current view.",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("summaryPage.exportFormatLabel", { defaultValue: "Format" })}</Label>
            <Select value={format} onValueChange={(value) => onFormatChange(value as ExportFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            {pendingFormat ? t("summaryPage.exporting") : t("summaryPage.export", { defaultValue: "Export" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
