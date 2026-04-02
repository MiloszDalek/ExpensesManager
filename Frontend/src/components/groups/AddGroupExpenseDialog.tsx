import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import { receiptsApi } from "@/api/receiptsApi";

import type {
  ApiCategoryResponse,
  ApiExpenseShare,
  ApiGroupExpenseCreate,
  ApiGroupExpenseResponse,
  ApiGroupMemberResponse,
  ApiReceiptLineItem,
} from "@/types";
import type { CurrencyEnum, SplitType } from "@/types/enums";

type AddGroupExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (expenseData: ApiGroupExpenseCreate) => void;
  isLoading?: boolean;
  categories: ApiCategoryResponse[];
  members: ApiGroupMemberResponse[];
  groupCurrency: CurrencyEnum;
  errorMessage?: string | null;
  mode?: "create" | "edit";
  expense?: ApiGroupExpenseResponse | null;
};

type FormData = {
  title: string;
  amount: string;
  split_type: SplitType;
  category_id: number;
  expense_date: string;
  notes: string;
  selectedMemberIds: number[];
};

const parseDecimal = (value: string): number => Number(value.replace(",", "."));

const extractErrorMessage = (error: unknown): string => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }
  }

  return "";
};

const toAmountString = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

const toCents = (value: number): number => Math.round(value * 100);

const buildEqualPercentInputs = (participantIds: number[]): Record<number, string> => {
  const inputs: Record<number, string> = {};

  if (participantIds.length === 0) {
    return inputs;
  }

  const totalBasisPoints = 10000;
  const base = Math.floor(totalBasisPoints / participantIds.length);
  const remainder = totalBasisPoints - base * participantIds.length;

  participantIds.forEach((userId, index) => {
    const basisPoints = base + (index < remainder ? 1 : 0);
    inputs[userId] = (basisPoints / 100).toFixed(2);
  });

  return inputs;
};

const buildEqualShares = (totalCents: number, participantIds: number[]): ApiExpenseShare[] => {
  if (participantIds.length === 0) {
    return [];
  }

  const baseShareCents = Math.floor(totalCents / participantIds.length);
  const remainderCents = totalCents - baseShareCents * participantIds.length;

  return participantIds.map((userId, index) => {
    const cents = baseShareCents + (index < remainderCents ? 1 : 0);
    return {
      user_id: userId,
      share_amount: toAmountString(cents / 100),
    };
  });
};

const buildPercentInputsFromShares = (
  shares: ApiExpenseShare[],
  totalCents: number,
  participantIds: number[]
): Record<number, string> => {
  if (participantIds.length === 0) {
    return {};
  }

  if (totalCents <= 0) {
    return buildEqualPercentInputs(participantIds);
  }

  const shareCentsByUser = shares.reduce<Record<number, number>>((accumulator, share) => {
    accumulator[share.user_id] = toCents(Number(share.share_amount));
    return accumulator;
  }, {});

  const result: Record<number, string> = {};
  let assigned = 0;

  participantIds.forEach((userId, index) => {
    if (index === participantIds.length - 1) {
      const remainder = Math.max(0, Math.round((100 - assigned) * 100) / 100);
      result[userId] = remainder.toFixed(2);
      return;
    }

    const shareCents = shareCentsByUser[userId] ?? 0;
    const percent = Math.round(((shareCents * 100) / totalCents) * 100) / 100;
    assigned = Math.round((assigned + percent) * 100) / 100;
    result[userId] = percent.toFixed(2);
  });

  return result;
};

const buildPercentShares = (
  totalCents: number,
  participantIds: number[],
  percentInputs: Record<number, string>
): ApiExpenseShare[] => {
  if (participantIds.length === 0 || totalCents <= 0) {
    return [];
  }

  const rawPercentages = participantIds.map((userId) => {
    const value = parseDecimal(percentInputs[userId] ?? "0");
    return Number.isFinite(value) && value > 0 ? value : 0;
  });

  const totalPercent = rawPercentages.reduce((sum, value) => sum + value, 0);
  if (totalPercent <= 0) {
    return [];
  }

  const normalized = rawPercentages.map((value) => value / totalPercent);
  const rawCents = normalized.map((ratio) => totalCents * ratio);
  const baseCents = rawCents.map((value) => Math.floor(value));
  let remainingCents = totalCents - baseCents.reduce((sum, value) => sum + value, 0);

  const remainders = rawCents
    .map((value, index) => ({
      index,
      remainder: value - baseCents[index],
      userId: participantIds[index],
    }))
    .sort((first, second) => {
      if (second.remainder !== first.remainder) {
        return second.remainder - first.remainder;
      }

      return first.userId - second.userId;
    });

  while (remainingCents > 0) {
    for (const item of remainders) {
      if (remainingCents === 0) {
        break;
      }

      baseCents[item.index] += 1;
      remainingCents -= 1;
    }
  }

  return participantIds.map((userId, index) => ({
    user_id: userId,
    share_amount: toAmountString(baseCents[index] / 100),
  }));
};

const buildExactShares = (
  participantIds: number[],
  exactInputs: Record<number, string>
): ApiExpenseShare[] => {
  return participantIds.map((userId) => {
    const value = parseDecimal(exactInputs[userId] ?? "0");
    const cents = Number.isFinite(value) ? Math.max(0, toCents(value)) : 0;
    return {
      user_id: userId,
      share_amount: toAmountString(cents / 100),
    };
  });
};

export default function AddGroupExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  categories,
  members,
  groupCurrency,
  errorMessage,
  mode = "create",
  expense = null,
}: AddGroupExpenseDialogProps) {
  const { t } = useTranslation();
  const isEditMode = mode === "edit";

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );

  const defaultCategoryId = categories[0]?.id ?? 0;

  const buildInitialState = (): FormData => ({
    title: "",
    amount: "",
    split_type: "equal",
    category_id: defaultCategoryId,
    expense_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
    selectedMemberIds: activeMembers.map((member) => member.user_id),
  });

  const [formData, setFormData] = useState<FormData>(buildInitialState);
  const [exactShareInputs, setExactShareInputs] = useState<Record<number, string>>({});
  const [percentShareInputs, setPercentShareInputs] = useState<Record<number, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [receiptItems, setReceiptItems] = useState<ApiReceiptLineItem[]>([]);
  const [parsedReceiptVendor, setParsedReceiptVendor] = useState<string | null>(null);
  const [parsedReceiptDate, setParsedReceiptDate] = useState<string | null>(null);
  const [parsedReceiptTotal, setParsedReceiptTotal] = useState<string | null>(null);
  const [detectedReceiptAmount, setDetectedReceiptAmount] = useState<string | null>(null);
  const [receiptOcrStatus, setReceiptOcrStatus] = useState<string | null>(null);
  const [receiptUploadError, setReceiptUploadError] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && expense) {
      const expenseAmount = Number(expense.amount);
      const expenseTotalCents = Number.isFinite(expenseAmount) && expenseAmount > 0 ? toCents(expenseAmount) : 0;
      const participantIds = expense.shares.map((share) => share.user_id);
      const exactInputs = expense.shares.reduce<Record<number, string>>((accumulator, share) => {
        accumulator[share.user_id] = toAmountString(Number(share.share_amount));
        return accumulator;
      }, {});

      setFormData({
        title: expense.title,
        amount: toAmountString(Number(expense.amount)),
        split_type: expense.split_type,
        category_id: expense.category_id,
        expense_date: format(new Date(expense.expense_date), "yyyy-MM-dd"),
        notes: expense.notes ?? "",
        selectedMemberIds: participantIds,
      });
      setExactShareInputs(exactInputs);
      setPercentShareInputs(buildPercentInputsFromShares(expense.shares, expenseTotalCents, participantIds));
      setReceiptImageUrl(expense.receipt_image_url ?? null);
      setReceiptText(expense.receipt_text ?? null);
      setReceiptItems([]);
      setParsedReceiptVendor(null);
      setParsedReceiptDate(null);
      setParsedReceiptTotal(null);
      setDetectedReceiptAmount(null);
      setReceiptOcrStatus(null);
      setReceiptUploadError(null);
      setReceiptFileName(null);
      setLocalError(null);
      return;
    }

    setFormData(buildInitialState());
    setExactShareInputs({});
    setPercentShareInputs(buildEqualPercentInputs(activeMembers.map((member) => member.user_id)));
    setReceiptImageUrl(null);
    setReceiptText(null);
    setReceiptItems([]);
    setParsedReceiptVendor(null);
    setParsedReceiptDate(null);
    setParsedReceiptTotal(null);
    setDetectedReceiptAmount(null);
    setReceiptOcrStatus(null);
    setReceiptUploadError(null);
    setReceiptFileName(null);
    setLocalError(null);
  }, [open, defaultCategoryId, activeMembers, isEditMode, expense]);

  const selectedMemberIdSet = useMemo(
    () => new Set(formData.selectedMemberIds),
    [formData.selectedMemberIds]
  );

  const selectedParticipantIds = useMemo(
    () =>
      activeMembers
        .filter((member) => selectedMemberIdSet.has(member.user_id))
        .map((member) => member.user_id),
    [activeMembers, selectedMemberIdSet]
  );

  useEffect(() => {
    setExactShareInputs((previous) => {
      const next: Record<number, string> = {};
      selectedParticipantIds.forEach((userId) => {
        next[userId] = previous[userId] ?? "0.00";
      });
      return next;
    });

    setPercentShareInputs((previous) => {
      const next: Record<number, string> = {};
      selectedParticipantIds.forEach((userId) => {
        next[userId] = previous[userId] ?? "0.00";
      });
      return next;
    });
  }, [selectedParticipantIds]);

  const normalizedAmount = Number(formData.amount);
  const totalCents = Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? toCents(normalizedAmount) : 0;

  const equalShares = useMemo(
    () => buildEqualShares(totalCents, selectedParticipantIds),
    [totalCents, selectedParticipantIds]
  );

  const exactShares = useMemo(
    () => buildExactShares(selectedParticipantIds, exactShareInputs),
    [selectedParticipantIds, exactShareInputs]
  );

  const percentShares = useMemo(
    () => buildPercentShares(totalCents, selectedParticipantIds, percentShareInputs),
    [totalCents, selectedParticipantIds, percentShareInputs]
  );

  const computedShares =
    formData.split_type === "equal" ? equalShares : formData.split_type === "exact" ? exactShares : percentShares;

  const computedShareByUserId = useMemo(() => {
    return computedShares.reduce<Record<number, string>>((accumulator, share) => {
      accumulator[share.user_id] = toAmountString(Number(share.share_amount));
      return accumulator;
    }, {});
  }, [computedShares]);

  const memberNameById = useMemo(() => {
    return activeMembers.reduce<Record<number, string>>((accumulator, member) => {
      accumulator[member.user_id] = member.username;
      return accumulator;
    }, {});
  }, [activeMembers]);

  const sharedAmountLabel = useMemo(() => {
    if (equalShares.length === 0 || selectedParticipantIds.length === 0) {
      return null;
    }

    const firstShareAmount = Number(equalShares[0]?.share_amount ?? 0).toFixed(2);
    return t("addGroupExpenseDialog.equalSplitPreview", {
      amount: firstShareAmount,
      currency: groupCurrency,
    });
  }, [equalShares, groupCurrency, selectedParticipantIds.length, t]);

  const exactAssignedCents = useMemo(
    () =>
      selectedParticipantIds.reduce((sum, userId) => {
        const value = parseDecimal(exactShareInputs[userId] ?? "0");
        return sum + (Number.isFinite(value) ? Math.max(0, toCents(value)) : 0);
      }, 0),
    [selectedParticipantIds, exactShareInputs]
  );

  const percentAssigned = useMemo(() => {
    return selectedParticipantIds.reduce((sum, userId) => {
      const value = parseDecimal(percentShareInputs[userId] ?? "0");
      return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
    }, 0);
  }, [selectedParticipantIds, percentShareInputs]);

  const handleParticipantToggle = (userId: number, checked: boolean) => {
    setLocalError(null);
    setFormData((previous) => {
      const nextIds = checked
        ? [...previous.selectedMemberIds, userId]
        : previous.selectedMemberIds.filter((id) => id !== userId);

      return {
        ...previous,
        selectedMemberIds: nextIds,
      };
    });
  };

  const handleSplitTypeChange = (splitType: SplitType) => {
    setLocalError(null);

    if (splitType === formData.split_type) {
      return;
    }

    if (splitType === "exact" && totalCents > 0) {
      const defaults = buildEqualShares(totalCents, selectedParticipantIds).reduce<Record<number, string>>(
        (accumulator, share) => {
          accumulator[share.user_id] = toAmountString(Number(share.share_amount));
          return accumulator;
        },
        {}
      );
      setExactShareInputs(defaults);
    }

    if (splitType === "percent") {
      setPercentShareInputs(buildEqualPercentInputs(selectedParticipantIds));
    }

    setFormData((previous) => ({
      ...previous,
      split_type: splitType,
    }));
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
      setReceiptImageUrl(uploadResult.image_url ?? null);
      setReceiptText(uploadResult.receipt_text ?? null);
      setReceiptItems(uploadResult.parsed_items ?? uploadResult.detected_items ?? []);
      setDetectedReceiptAmount(uploadResult.detected_amount ?? parsedTotal);
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
      setReceiptUploadError(message || t("addGroupExpenseDialog.errors.receiptUploadFailed"));
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleApplyDetectedAmount = () => {
    const nextAmount = parsedReceiptTotal ?? detectedReceiptAmount;
    if (!nextAmount) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      amount: nextAmount,
    }));
    setLocalError(null);
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

  const handleSubmit = () => {
    const title = formData.title.trim();

    if (!title) {
      setLocalError(t("addGroupExpenseDialog.errors.titleRequired"));
      return;
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setLocalError(t("addGroupExpenseDialog.errors.invalidAmount"));
      return;
    }

    if (totalCents <= 0) {
      setLocalError(t("addGroupExpenseDialog.errors.invalidAmount"));
      return;
    }

    if (!formData.category_id) {
      setLocalError(t("addGroupExpenseDialog.errors.categoryRequired"));
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setLocalError(t("addGroupExpenseDialog.errors.participantsRequired"));
      return;
    }

    if (new Set(selectedParticipantIds).size !== selectedParticipantIds.length) {
      setLocalError(t("addGroupExpenseDialog.errors.duplicateParticipants"));
      return;
    }

    if (formData.split_type === "exact") {
      for (const userId of selectedParticipantIds) {
        const value = parseDecimal(exactShareInputs[userId] ?? "");
        if (!Number.isFinite(value) || value <= 0) {
          setLocalError(t("addGroupExpenseDialog.errors.exactShareRequired"));
          return;
        }
      }

      if (exactAssignedCents !== totalCents) {
        setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
        return;
      }
    }

    if (formData.split_type === "percent") {
      for (const userId of selectedParticipantIds) {
        const value = parseDecimal(percentShareInputs[userId] ?? "");
        if (!Number.isFinite(value) || value <= 0) {
          setLocalError(t("addGroupExpenseDialog.errors.invalidPercent"));
          return;
        }
      }

      if (Math.abs(percentAssigned - 100) > 0.01) {
        setLocalError(t("addGroupExpenseDialog.errors.percentTotalMustBe100"));
        return;
      }
    }

    if (computedShares.length !== selectedParticipantIds.length) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
      return;
    }

    const hasNonPositiveShare = computedShares.some((share) => Number(share.share_amount) <= 0);
    if (hasNonPositiveShare) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesPositive"));
      return;
    }

    const assignedTotalCents = computedShares.reduce((sum, share) => {
      return sum + toCents(Number(share.share_amount));
    }, 0);

    if (assignedTotalCents !== totalCents) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
      return;
    }

    setLocalError(null);

    onSubmit({
      title,
      amount: toAmountString(totalCents / 100),
      currency: groupCurrency,
      split_type: formData.split_type,
      shares: computedShares,
      category_id: formData.category_id,
      expense_date: formData.expense_date,
      notes: formData.notes.trim() ? formData.notes.trim() : null,
      receipt_image_url: receiptImageUrl,
      receipt_text: receiptText,
    });
  };

  const displayedError = localError ?? errorMessage ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t("addGroupExpenseDialog.titleEdit") : t("addGroupExpenseDialog.titleCreate")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="group-expense-title">{t("addGroupExpenseDialog.titleLabel")}</Label>
            <Input
              id="group-expense-title"
              placeholder={t("addGroupExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(event) => {
                setLocalError(null);
                setFormData((previous) => ({ ...previous, title: event.target.value }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="group-expense-amount">{t("addGroupExpenseDialog.amount")}</Label>
              <Input
                id="group-expense-amount"
                type="number"
                step="0.01"
                placeholder={t("addGroupExpenseDialog.amountPlaceholder")}
                value={formData.amount}
                onChange={(event) => {
                  setLocalError(null);
                  setFormData((previous) => ({ ...previous, amount: event.target.value }));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-expense-currency">{t("addGroupExpenseDialog.currency")}</Label>
              <Input id="group-expense-currency" value={groupCurrency} disabled />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-expense-split-type">{t("addGroupExpenseDialog.splitType")}</Label>
            <Select value={formData.split_type} onValueChange={(value) => handleSplitTypeChange(value as SplitType)}>
              <SelectTrigger id="group-expense-split-type" className="w-full">
                <SelectValue placeholder={t("addGroupExpenseDialog.splitTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">{t("addGroupExpenseDialog.splitTypeEqual")}</SelectItem>
                <SelectItem value="exact">{t("addGroupExpenseDialog.splitTypeExact")}</SelectItem>
                <SelectItem value="percent">{t("addGroupExpenseDialog.splitTypePercent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-expense-category">{t("addGroupExpenseDialog.category")}</Label>
            <CategoryPicker
              value={String(formData.category_id)}
              onValueChange={(value) => {
                setLocalError(null);
                setFormData((previous) => ({
                  ...previous,
                  category_id: Number(value),
                }));
              }}
              categories={categories}
              trigger="button"
              showLabel={false}
              mobileInset={false}
              showSelectedGroupPrefix
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-expense-date">{t("addGroupExpenseDialog.date")}</Label>
            <Input
              id="group-expense-date"
              type="date"
              value={formData.expense_date}
              onChange={(event) => {
                setLocalError(null);
                setFormData((previous) => ({ ...previous, expense_date: event.target.value }));
              }}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-expense-notes">{t("addGroupExpenseDialog.notes")}</Label>
            <Textarea
              id="group-expense-notes"
              placeholder={t("addGroupExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(event) => {
                setLocalError(null);
                setFormData((previous) => ({ ...previous, notes: event.target.value }));
              }}
              rows={2}
            />
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="group-expense-receipt">{t("addGroupExpenseDialog.receiptImage")}</Label>
              {receiptImageUrl ? (
                <a
                  href={receiptImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  {t("addGroupExpenseDialog.viewReceipt")}
                </a>
              ) : null}
            </div>

            <Input
              id="group-expense-receipt"
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
              <p className="text-xs text-muted-foreground">{t("addGroupExpenseDialog.receiptUploading")}</p>
            ) : null}

            {receiptFileName ? (
              <p className="text-xs text-muted-foreground">
                {t("addGroupExpenseDialog.receiptUploadedFile", { fileName: receiptFileName })}
              </p>
            ) : null}

            {receiptOcrStatus ? (
              <p className="text-xs text-muted-foreground">
                {receiptOcrStatus === "done"
                  ? t("addGroupExpenseDialog.ocrDone")
                  : receiptOcrStatus === "unavailable"
                    ? t("addGroupExpenseDialog.ocrUnavailable")
                    : t("addGroupExpenseDialog.ocrFailed")}
              </p>
            ) : null}

            {detectedReceiptAmount ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addGroupExpenseDialog.detectedAmount", {
                    amount: parsedReceiptTotal ?? detectedReceiptAmount,
                    currency: groupCurrency,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedAmount}>
                  {t("addGroupExpenseDialog.useDetectedAmount")}
                </Button>
              </div>
            ) : null}

            {parsedReceiptVendor ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addGroupExpenseDialog.detectedVendor", {
                    vendor: parsedReceiptVendor,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedVendor}>
                  {t("addGroupExpenseDialog.useDetectedVendor")}
                </Button>
              </div>
            ) : null}

            {parsedReceiptDate ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1.5">
                <p className="text-xs text-foreground">
                  {t("addGroupExpenseDialog.detectedDate", {
                    date: parsedReceiptDate,
                  })}
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleApplyDetectedDate}>
                  {t("addGroupExpenseDialog.useDetectedDate")}
                </Button>
              </div>
            ) : null}

            {receiptItems.length > 0 ? (
              <div className="space-y-1 rounded-md bg-muted/50 px-2 py-2">
                <p className="text-xs font-medium text-foreground">{t("addGroupExpenseDialog.detectedItemsLabel")}</p>
                <div className="space-y-1">
                  {receiptItems.slice(0, 6).map((item, index) => (
                    <p key={`${item.name}-${item.amount}-${index}`} className="text-xs text-muted-foreground">
                      {item.name} - {item.amount} {groupCurrency}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {receiptText ? (
              <div className="space-y-1">
                <Label htmlFor="group-expense-ocr-text">{t("addGroupExpenseDialog.ocrText")}</Label>
                <Textarea
                  id="group-expense-ocr-text"
                  rows={4}
                  value={receiptText}
                  onChange={(event) => setReceiptText(event.target.value)}
                />
              </div>
            ) : null}

            {receiptUploadError ? <p className="text-xs text-destructive">{receiptUploadError}</p> : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("addGroupExpenseDialog.participants")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("addGroupExpenseDialog.selectedParticipants", {
                  count: selectedParticipantIds.length,
                })}
              </p>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {activeMembers.map((member) => {
                const checked = selectedMemberIdSet.has(member.user_id);

                return (
                  <label
                    key={member.id}
                    htmlFor={`participant-${member.user_id}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60"
                  >
                    <span className="text-sm text-foreground">{member.username}</span>
                    <input
                      id={`participant-${member.user_id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => handleParticipantToggle(member.user_id, event.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>

            {sharedAmountLabel ? (
              <p className="text-xs text-muted-foreground">{sharedAmountLabel}</p>
            ) : null}

            {formData.split_type === "exact" ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                {selectedParticipantIds.map((userId) => (
                  <div key={`exact-share-${userId}`} className="grid grid-cols-[1fr_140px] items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {memberNameById[userId] ?? `${t("groupExpensesList.userPrefix")}#${userId}`}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={exactShareInputs[userId] ?? ""}
                      onChange={(event) => {
                        setLocalError(null);
                        setExactShareInputs((previous) => ({
                          ...previous,
                          [userId]: event.target.value,
                        }));
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {t("addGroupExpenseDialog.exactSplitSummary", {
                    assigned: toAmountString(exactAssignedCents / 100),
                    total: toAmountString(totalCents / 100),
                    currency: groupCurrency,
                  })}
                </p>
              </div>
            ) : null}

            {formData.split_type === "percent" ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                {selectedParticipantIds.map((userId) => (
                  <div key={`percent-share-${userId}`} className="grid grid-cols-[1fr_90px_120px] items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {memberNameById[userId] ?? `${t("groupExpensesList.userPrefix")}#${userId}`}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={percentShareInputs[userId] ?? ""}
                      onChange={(event) => {
                        setLocalError(null);
                        setPercentShareInputs((previous) => ({
                          ...previous,
                          [userId]: event.target.value,
                        }));
                      }}
                    />
                    <span className="text-right text-xs text-muted-foreground">
                      {computedShareByUserId[userId] ?? "0.00"} {groupCurrency}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {t("addGroupExpenseDialog.percentSplitSummary", {
                    assigned: (Math.round(percentAssigned * 100) / 100).toFixed(2),
                  })}
                </p>
              </div>
            ) : null}
          </div>

          {displayedError ? <p className="text-sm text-destructive">{displayedError}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addGroupExpenseDialog.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || isUploadingReceipt}>
            {isLoading
              ? isEditMode
                ? t("addGroupExpenseDialog.submittingEdit")
                : t("addGroupExpenseDialog.submittingCreate")
              : isEditMode
                ? t("addGroupExpenseDialog.submitEdit")
                : t("addGroupExpenseDialog.submitCreate")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
