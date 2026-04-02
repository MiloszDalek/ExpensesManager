import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { ApiPersonalExpenseCreate } from "@/types/expense";
import type { ApiCategoryResponse } from "@/types/category";
import { receiptsApi } from "@/api/receiptsApi";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import type { ApiReceiptLineItem } from "@/types";
import {
  getCurrenciesWithRecentFirst,
  getRecentCurrencies,
  rememberRecentCurrency,
  removeRecentCurrency,
} from "@/utils/currency";
import CategoryPicker from "./CategoryPicker";

// TODO: Po dodaniu icon_key w API, umożliwić wybór ikony przy tworzeniu kategorii

type AddExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: ApiPersonalExpenseCreate) => void;
  onCreateCustomCategory?: (name: string) => Promise<ApiCategoryResponse>;
  onDeleteCustomCategory?: (categoryId: number) => Promise<void>;
  isLoading?: boolean;
  categories: ApiCategoryResponse[];
};

type FormData = {
  title: string;
  amount: string;
  currency: CurrencyEnum;
  category_id: number;
  expense_date: string;
  notes: string;
};

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "";
};


export default function AddExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  onCreateCustomCategory,
  onDeleteCustomCategory,
  isLoading,
  categories
}: AddExpenseDialogProps) {
  const { t } = useTranslation();
  const defaultCategoryId = categories[0]?.id || 0;
  const [recentCurrencies, setRecentCurrencies] = useState<CurrencyEnum[]>([]);

  useEffect(() => {
    if (open) {
      setRecentCurrencies(getRecentCurrencies());
    }
  }, [open]);

  const orderedCurrencies = useMemo(
    () => getCurrenciesWithRecentFirst(recentCurrencies),
    [recentCurrencies]
  );

  const recentCurrencySet = useMemo(() => new Set(recentCurrencies), [recentCurrencies]);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    amount: '',
    currency: 'PLN',
    category_id: defaultCategoryId,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ApiReceiptLineItem[]>([]);
  const [parsedReceiptVendor, setParsedReceiptVendor] = useState<string | null>(null);
  const [parsedReceiptDate, setParsedReceiptDate] = useState<string | null>(null);
  const [parsedReceiptTotal, setParsedReceiptTotal] = useState<string | null>(null);
  const [receiptOcrStatus, setReceiptOcrStatus] = useState<string | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Helper to handle currency change and update recent currencies
  const handleCurrencyChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      currency: value as CurrencyEnum,
    }));
    setRecentCurrencies(rememberRecentCurrency(value as CurrencyEnum));
  };

  const handleSubmit = () => {
    if (formData.title && formData.amount) {
      setRecentCurrencies(rememberRecentCurrency(formData.currency));

      onSubmit({
        title: formData.title,
        amount: formData.amount,
        currency: formData.currency,
        category_id: formData.category_id,
        expense_date: formData.expense_date,
        notes: formData.notes || null,
        receipt_image_url: null,
        receipt_text: receiptText,
      });
      
      setFormData({
        title: '',
        amount: '',
        currency: 'PLN',
        category_id: defaultCategoryId,
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
      setReceiptText(null);
      setReceiptItems([]);
      setParsedReceiptVendor(null);
      setParsedReceiptDate(null);
      setParsedReceiptTotal(null);
      setReceiptOcrStatus(null);
      setReceiptUploadError(null);
      setReceiptFileName(null);
    }
  };

  const handleReceiptFileUpload = async (file: File) => {
    setReceiptUploadError(null);
    setIsUploadingReceipt(true);

    try {
      const uploadResult = await receiptsApi.upload(file);
      const parsedTotal = uploadResult.parsed_total ?? uploadResult.detected_amount ?? null;
      const parsedDate = uploadResult.parsed_date ?? null;
      const parsedVendor = uploadResult.parsed_vendor ?? null;

      setReceiptFileName(file.name);
      setReceiptText(uploadResult.receipt_text ?? null);
      setReceiptItems(uploadResult.parsed_items ?? uploadResult.detected_items ?? []);
      setParsedReceiptTotal(parsedTotal);
      setParsedReceiptDate(parsedDate);
      setParsedReceiptVendor(parsedVendor);
      setReceiptOcrStatus(uploadResult.ocr_status);

      if (parsedTotal && (!formData.amount || Number(formData.amount) <= 0)) {
        setFormData((previous) => ({
          ...previous,
          amount: parsedTotal,
        }));
      }

      if (parsedVendor && !formData.title.trim()) {
        setFormData((previous) => ({
          ...previous,
          title: parsedVendor,
        }));
      }

      const today = format(new Date(), "yyyy-MM-dd");
      if (parsedDate && formData.expense_date === today) {
        setFormData((previous) => ({
          ...previous,
          expense_date: parsedDate,
        }));
      }
    } catch (error) {
      const message = extractErrorMessage(error);
      setReceiptUploadError(message || t("addExpenseDialog.errors.receiptUploadFailed"));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleApplyDetectedAmount = () => {
    if (!parsedReceiptTotal) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      amount: parsedReceiptTotal,
    }));
  };

  const handleApplyDetectedVendor = () => {
    if (!parsedReceiptVendor) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      title: parsedReceiptVendor,
    }));
  };

  const handleApplyDetectedDate = () => {
    if (!parsedReceiptDate) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      expense_date: parsedReceiptDate,
    }));
  };

  const handleRemoveRecentCurrency = (currency: CurrencyEnum) => {
    setRecentCurrencies(removeRecentCurrency(currency));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <DialogTitle>{t("addExpenseDialog.title")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">{t("addExpenseDialog.titleLabel")}</Label>
            <Input
              id="title"
              placeholder={t("addExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="amount">{t("addExpenseDialog.amount")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder={t("addExpenseDialog.amountPlaceholder")}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="currency">{t("addExpenseDialog.currency")}</Label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {recentCurrencies.length > 0 && (
                    <>
                      <SelectGroup>
                        <SelectLabel>{t("addExpenseDialog.recentCurrencies")}</SelectLabel>
                        {orderedCurrencies
                          .filter((currency) => recentCurrencySet.has(currency))
                          .map((currency) => (
                            <SelectItem key={`recent-${currency}`} value={currency} className="group pr-12">
                              <span>{currency}</span>
                              <button
                                type="button"
                                tabIndex={-1}
                                aria-label={t("addExpenseDialog.removeRecentCurrency")}
                                className="ml-auto mr-4 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus:text-destructive focus:opacity-100 group-hover:opacity-100 cursor-pointer"
                                onPointerDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                                onPointerUp={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleRemoveRecentCurrency(currency);
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                      <SelectSeparator />
                    </>
                  )}

                  <SelectGroup>
                    {recentCurrencies.length > 0 && (
                      <SelectLabel>{t("addExpenseDialog.allCurrencies")}</SelectLabel>
                    )}
                    {SUPPORTED_CURRENCIES.filter((currency) => !recentCurrencySet.has(currency)).map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">{t("addExpenseDialog.category")}</Label>
            <CategoryPicker
              value={formData.category_id.toString()}
              onValueChange={(value) => setFormData(prev => ({
                ...prev,
                category_id: parseInt(value, 10)
              }))}
              categories={categories}
              onCreateCustomCategory={onCreateCustomCategory}
              onDeleteCustomCategory={onDeleteCustomCategory}
              trigger="button"
              showLabel={false}
              mobileInset={false}
              showSelectedGroupPrefix
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="expense_date">{t("addExpenseDialog.date")}</Label>
            <Input
              id="expense_date"
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData(prev => ({ ...prev, expense_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes">{t("addExpenseDialog.notes")}</Label>
            <Textarea
              id="notes"
              placeholder={t("addExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="personal-expense-receipt">{t("addExpenseDialog.receiptImage")}</Label>
            </div>

            <Input
              id="personal-expense-receipt"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isUploadingReceipt || isLoading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                void handleReceiptFileUpload(file);
                event.target.value = "";
              }}
            />

            {isUploadingReceipt ? (
              <p className="text-xs text-muted-foreground">{t("addExpenseDialog.receiptUploading")}</p>
            ) : null}

            {receiptFileName ? (
              <p className="text-xs text-muted-foreground">
                {t("addExpenseDialog.receiptUploadedFile", { fileName: receiptFileName })}
              </p>
            ) : null}

            {receiptOcrStatus ? (
              <p className="text-xs text-muted-foreground">
                {receiptOcrStatus === "done"
                  ? t("addExpenseDialog.ocrDone")
                  : receiptOcrStatus === "unavailable"
                    ? t("addExpenseDialog.ocrUnavailable")
                    : t("addExpenseDialog.ocrFailed")}
              </p>
            ) : null}

            {parsedReceiptTotal ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addExpenseDialog.detectedAmount", {
                    amount: parsedReceiptTotal,
                    currency: formData.currency,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedAmount}>
                  {t("addExpenseDialog.useDetectedAmount")}
                </Button>
              </div>
            ) : null}

            {parsedReceiptVendor ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addExpenseDialog.detectedVendor", {
                    vendor: parsedReceiptVendor,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedVendor}>
                  {t("addExpenseDialog.useDetectedVendor")}
                </Button>
              </div>
            ) : null}

            {parsedReceiptDate ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addExpenseDialog.detectedDate", {
                    date: parsedReceiptDate,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedDate}>
                  {t("addExpenseDialog.useDetectedDate")}
                </Button>
              </div>
            ) : null}

            {receiptItems.length > 0 ? (
              <div className="space-y-1 rounded-md bg-muted/50 px-2 py-2">
                <p className="text-xs font-medium text-foreground">{t("addExpenseDialog.detectedItemsLabel")}</p>
                <div className="space-y-1">
                  {receiptItems.slice(0, 6).map((item, index) => (
                    <p key={`${item.name}-${item.amount}-${index}`} className="text-xs text-muted-foreground">
                      {item.name} - {item.amount} {formData.currency}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {receiptText ? (
              <div className="space-y-1">
                <Label htmlFor="personal-expense-ocr-text">{t("addExpenseDialog.ocrText")}</Label>
                <Textarea
                  id="personal-expense-ocr-text"
                  rows={4}
                  value={receiptText}
                  onChange={(event) => setReceiptText(event.target.value)}
                />
              </div>
            ) : null}

            {receiptUploadError ? <p className="text-xs text-destructive">{receiptUploadError}</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addExpenseDialog.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!formData.title || !formData.amount || isLoading || isUploadingReceipt}
          >
            {t("addExpenseDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}