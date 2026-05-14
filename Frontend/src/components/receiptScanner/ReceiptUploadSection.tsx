import { Camera, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OcrEngine, OcrEngineMode } from "@/types/receiptScanner";

interface ReceiptUploadSectionProps {
  hasCamera: boolean | null;
  ocrMode: OcrEngineMode;
  isUploading: boolean;
  isMutationPending: boolean;
  imagePreviewUrl: string | null;
  ocrText: string;
  ocrStatus: "done" | "unavailable" | "failed" | null;
  ocrEngine: OcrEngine | null;
  localWarning: string | null;
  receiptFileName: string | null;
  onOcrModeChange: (mode: OcrEngineMode) => void;
  onUpload: (file: File) => void;
  onOcrTextChange: (text: string) => void;
  uploadLabel: string;
  ocrModeLabel: string;
  ocrModeFast: string;
  ocrModeAccurate: string;
  takePhoto: string;
  chooseFromGallery: string;
  uploading: string;
  uploadedFileLabel: (params: { fileName: string }) => string;
  ocrDone: string;
  ocrUnavailable: string;
  ocrFailed: string;
  previewAlt: string;
  ocrTextLabel: string;
}

export default function ReceiptUploadSection({
  hasCamera,
  ocrMode,
  isUploading,
  isMutationPending,
  imagePreviewUrl,
  ocrText,
  ocrStatus,
  ocrEngine,
  localWarning,
  receiptFileName,
  onOcrModeChange,
  onUpload,
  onOcrTextChange,
  uploadLabel,
  ocrModeLabel,
  ocrModeFast,
  ocrModeAccurate,
  takePhoto,
  chooseFromGallery,
  uploading,
  uploadedFileLabel,
  ocrDone,
  ocrUnavailable,
  ocrFailed,
  previewAlt,
  ocrTextLabel,
}: ReceiptUploadSectionProps) {
  const disabled = isUploading || isMutationPending;

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <Label htmlFor="receipt-scan-file">{uploadLabel}</Label>

      <div className="space-y-2">
        <Label>{ocrModeLabel}</Label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant={ocrMode === "tesseract" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onOcrModeChange("tesseract")}
          >
            {ocrModeFast}
          </Button>
          <Button
            type="button"
            variant={ocrMode === "paddle" ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onOcrModeChange("paddle")}
          >
            {ocrModeAccurate}
          </Button>
        </div>
      </div>

      <div className={cn("grid grid-cols-1 gap-2", hasCamera && "sm:grid-cols-2")}>
        {hasCamera ? (
          <>
            <input
              id="receipt-scan-camera"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              capture="environment"
              className="hidden"
              disabled={disabled}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                void onUpload(file);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => document.getElementById("receipt-scan-camera")?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {takePhoto}
            </Button>
          </>
        ) : null}

        <input
          id="receipt-scan-gallery"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            void onUpload(file);
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => document.getElementById("receipt-scan-gallery")?.click()}
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {chooseFromGallery}
        </Button>
      </div>

      {isUploading ? <p className="text-xs text-muted-foreground">{uploading}</p> : null}
      {receiptFileName ? (
        <p className="text-xs text-muted-foreground">
          {uploadedFileLabel({ fileName: receiptFileName })}
        </p>
      ) : null}

      {ocrStatus ? (
        <p className="text-xs text-muted-foreground">
          {ocrStatus === "done"
            ? ocrDone
            : ocrStatus === "unavailable"
              ? ocrUnavailable
              : ocrFailed}
          {ocrEngine ? ` (${ocrEngine.toUpperCase()})` : ""}
        </p>
      ) : null}

      {localWarning ? <p className="text-xs text-amber-700">{localWarning}</p> : null}

      {imagePreviewUrl ? (
        <div className="overflow-hidden rounded-md border border-border bg-background/60">
          <img src={imagePreviewUrl} alt={previewAlt} className="max-h-80 w-full object-contain" />
        </div>
      ) : null}

      <div className="space-y-1">
        <Label htmlFor="receipt-scan-ocr-text">{ocrTextLabel}</Label>
        <Textarea
          id="receipt-scan-ocr-text"
          rows={8}
          value={ocrText}
          onChange={(event) => onOcrTextChange(event.target.value)}
        />
      </div>
    </section>
  );
}
