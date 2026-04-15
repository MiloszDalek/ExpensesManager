import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoriesApi } from "@/api/categoriesApi";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { expensesPersonalApi } from "@/api/expensesPersonalApi";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import { receiptsApi } from "@/api/receiptsApi";
import { getDefaultCategoryId } from "@/utils/category";
import { SUPPORTED_CURRENCIES, type CurrencyEnum } from "@/types/enums";
import type {
  ApiCategoryResponse,
  ApiExpenseShare,
  ApiGroupExpenseCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiPersonalExpenseCreate,
  ApiReceiptLineItem,
  OcrEngine,
  OcrEngineMode,
} from "@/types";

type ScannerItem = ApiReceiptLineItem & {
  id: string;
  is_used: boolean;
  is_selected: boolean;
};

type ExpenseScope = "personal" | "group";

const areNumberArraysEqual = (first: number[], second: number[]): boolean => {
  if (first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }

  return true;
};

const parseAmount = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDefaultTitle = (vendor: string | null, fallback: string) => {
  if (vendor && vendor.trim().length > 0) {
    return vendor.trim();
  }

  return fallback;
};

const toCents = (value: number): number => Math.round(value * 100);
const toAmountString = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

const buildEqualShares = (totalCents: number, participantIds: number[]): ApiExpenseShare[] => {
  if (participantIds.length === 0 || totalCents <= 0) {
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

export default function ReceiptScannerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get("mode");
  const groupIdParam = searchParams.get("groupId");
  const normalizedScopeFromUrl: ExpenseScope = modeParam === "group" ? "group" : "personal";
  const normalizedGroupIdFromUrl = Number.isInteger(Number(groupIdParam)) && Number(groupIdParam) > 0
    ? Number(groupIdParam)
    : 0;

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"done" | "unavailable" | "failed" | null>(null);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine | null>(null);
  const [ocrMode, setOcrMode] = useState<OcrEngineMode>("paddle");
  const [isUploading, setIsUploading] = useState(false);

  const [ocrText, setOcrText] = useState("");
  const [parsedTotal, setParsedTotal] = useState("");
  const [parsedDate, setParsedDate] = useState("");
  const [parsedVendor, setParsedVendor] = useState("");
  const [items, setItems] = useState<ScannerItem[]>([]);

  const [expenseScope, setExpenseScope] = useState<ExpenseScope>(normalizedScopeFromUrl);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(
    normalizedGroupIdFromUrl
  );
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [currency, setCurrency] = useState<CurrencyEnum>("PLN");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [titleDraft, setTitleDraft] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);

  const { data: personalCategories = [], isLoading: personalCategoriesLoading } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availablePersonal,
    queryFn: () => categoriesApi.getAvailablePersonal(),
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<ApiGroupResponse[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.listAll(),
    enabled: expenseScope === "group",
  });

  useEffect(() => {
    setExpenseScope((previous) => (previous === normalizedScopeFromUrl ? previous : normalizedScopeFromUrl));
    setSelectedGroupId((previous) => (previous === normalizedGroupIdFromUrl ? previous : normalizedGroupIdFromUrl));
  }, [normalizedScopeFromUrl, normalizedGroupIdFromUrl]);

  useEffect(() => {
    const hasMode = modeParam !== null;
    const hasGroupId = groupIdParam !== null;

    if (expenseScope === "group") {
      const expectedGroupId = selectedGroupId > 0 ? String(selectedGroupId) : null;
      const isModeSynced = modeParam === "group";
      const isGroupIdSynced = expectedGroupId === null ? !hasGroupId : groupIdParam === expectedGroupId;

      if (isModeSynced && isGroupIdSynced) {
        return;
      }

      const nextParams = new URLSearchParams();
      nextParams.set("mode", "group");
      if (expectedGroupId !== null) {
        nextParams.set("groupId", expectedGroupId);
      }
      setSearchParams(nextParams, { replace: true });
      return;
    }

    if (!hasMode && !hasGroupId) {
      return;
    }

    setSearchParams(new URLSearchParams(), { replace: true });
  }, [expenseScope, selectedGroupId, modeParam, groupIdParam, setSearchParams]);

  const activeGroups = useMemo(() => groups.filter((group) => group.status === "active"), [groups]);

  const selectedGroup = useMemo(
    () => activeGroups.find((group) => group.id === selectedGroupId) ?? null,
    [activeGroups, selectedGroupId]
  );

  const { data: groupCategories = [], isLoading: groupCategoriesLoading } = useQuery<ApiCategoryResponse[]>({
    queryKey: selectedGroupId ? queryKeys.categories.availableGroup(selectedGroupId) : ["categories", "available", "group", 0],
    queryFn: () => categoriesApi.getAvailableGroup(selectedGroupId),
    enabled: expenseScope === "group" && selectedGroupId > 0,
  });

  const { data: groupMembers = [], isLoading: groupMembersLoading } = useQuery<ApiGroupMemberResponse[]>({
    queryKey: selectedGroupId ? queryKeys.groups.members(selectedGroupId) : ["groups", "members", 0],
    queryFn: () => groupsApi.members(selectedGroupId),
    enabled: expenseScope === "group" && selectedGroupId > 0,
  });

  const activeGroupMembers = useMemo(
    () => groupMembers.filter((member) => member.status === "active"),
    [groupMembers]
  );

  const selectedParticipants = useMemo(
    () => activeGroupMembers.filter((member) => selectedMemberIds.includes(member.user_id)),
    [activeGroupMembers, selectedMemberIds]
  );

  const categories = expenseScope === "group" ? groupCategories : personalCategories;

  useEffect(() => {
    if (expenseScope !== "group") {
      return;
    }

    if (selectedGroupId > 0 && activeGroups.some((group) => group.id === selectedGroupId)) {
      return;
    }

    if (activeGroups.length > 0) {
      setSelectedGroupId(activeGroups[0].id);
    }
  }, [expenseScope, selectedGroupId, activeGroups]);

  useEffect(() => {
    if (expenseScope !== "group" || !selectedGroup) {
      return;
    }

    setCurrency(selectedGroup.currency);
  }, [expenseScope, selectedGroup]);

  useEffect(() => {
    if (activeGroupMembers.length === 0) {
      setSelectedMemberIds((previous) => (previous.length === 0 ? previous : []));
      return;
    }

    setSelectedMemberIds((previous) => {
      const validUserIds = activeGroupMembers.map((member) => member.user_id);
      const kept = previous.filter((userId) => validUserIds.includes(userId));
      const next = kept.length > 0 ? kept : validUserIds;
      return areNumberArraysEqual(previous, next) ? previous : next;
    });
  }, [activeGroupMembers]);

  useEffect(() => {
    if (categories.length === 0) {
      setCategoryId(0);
      return;
    }

    const hasCurrentCategory = categories.some((category) => category.id === categoryId);
    if (!hasCurrentCategory) {
      setCategoryId(getDefaultCategoryId(categories));
    }
  }, [categories, categoryId]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const createExpenseMutation = useMutation({
    mutationFn: (payload: ApiPersonalExpenseCreate) => expensesPersonalApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses.all });
    },
  });

  const createGroupExpenseMutation = useMutation({
    mutationFn: ({ groupId, payload }: { groupId: number; payload: ApiGroupExpenseCreate }) =>
      expensesGroupApi.create(groupId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["expenses", "group", variables.groupId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(variables.groupId) });
    },
  });

  const selectedItems = useMemo(
    () => items.filter((item) => item.is_selected && !item.is_used),
    [items]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + parseAmount(item.amount), 0),
    [selectedItems]
  );

  const handleUpload = async (file: File) => {
    setLocalError(null);
    setLocalSuccess(null);
    setIsUploading(true);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(URL.createObjectURL(file));
    setReceiptFileName(file.name);
    setOcrEngine(null);

    try {
      const result = await receiptsApi.upload(file, ocrMode);
      setOcrStatus(result.ocr_status);
      setOcrEngine(result.ocr_engine ?? null);
      setOcrText(result.receipt_text ?? "");
      setParsedTotal(result.parsed_total ?? result.detected_amount ?? "");
      setParsedDate(result.parsed_date ?? "");
      setParsedVendor(result.parsed_vendor ?? "");

      const sourceItems = result.parsed_items ?? result.detected_items ?? [];
      setItems(
        sourceItems.map((item, index) => ({
          id: `${Date.now()}-${index}`,
          name: item.name,
          amount: item.amount,
          confidence: item.confidence ?? null,
          is_used: false,
          is_selected: false,
        }))
      );

      if (result.parsed_vendor && titleDraft.trim().length === 0) {
        setTitleDraft(result.parsed_vendor);
      }
      if (result.parsed_date) {
        setExpenseDate(result.parsed_date);
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
      setLocalError(message || t("receiptScannerPage.errors.uploadFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleSelected = (id: string, checked: boolean) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, is_selected: checked } : item))
    );
  };

  const handleUpdateItem = (id: string, field: "name" | "amount", value: string) => {
    setItems((previous) =>
      previous.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  };

  const handleAddManualItem = () => {
    setItems((previous) => [
      ...previous,
      {
        id: `${Date.now()}-manual-${previous.length}`,
        name: "",
        amount: "0.00",
        confidence: null,
        is_used: false,
        is_selected: false,
      },
    ]);
  };

  const createExpense = async (amount: number, sourceItemIds: string[] = []) => {
    if (!categoryId) {
      setLocalError(t("receiptScannerPage.errors.categoryRequired"));
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setLocalError(t("receiptScannerPage.errors.invalidAmount"));
      return;
    }

    const basePayload = {
      title: getDefaultTitle(parsedVendor || titleDraft, t("receiptScannerPage.defaultTitle")),
      amount: amount.toFixed(2),
      currency,
      category_id: categoryId,
      expense_date: expenseDate,
      notes: null,
      receipt_image_url: null,
      receipt_text: ocrText || null,
    };

    setLocalError(null);
    try {
      if (expenseScope === "personal") {
        await createExpenseMutation.mutateAsync(basePayload);
      } else {
        if (!selectedGroup || selectedGroupId <= 0) {
          setLocalError(t("receiptScannerPage.errors.groupRequired"));
          return;
        }

        if (selectedParticipants.length === 0) {
          setLocalError(t("receiptScannerPage.errors.participantsRequired"));
          return;
        }

        const totalCents = toCents(amount);
        const shares = buildEqualShares(
          totalCents,
          selectedParticipants.map((member) => member.user_id)
        );

        const groupPayload: ApiGroupExpenseCreate = {
          ...basePayload,
          currency: selectedGroup.currency,
          split_type: "equal",
          shares,
        };
        await createGroupExpenseMutation.mutateAsync({
          groupId: selectedGroupId,
          payload: groupPayload,
        });
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : "";
      setLocalError(message || t("common.somethingWentWrong"));
      return;
    }

    if (sourceItemIds.length > 0) {
      setItems((previous) =>
        previous.map((item) =>
          sourceItemIds.includes(item.id)
            ? { ...item, is_used: true, is_selected: false }
            : item
        )
      );
    }

    setLocalSuccess(
      sourceItemIds.length > 0
        ? t("receiptScannerPage.success.createdFromItems", {
            count: sourceItemIds.length,
            amount: amount.toFixed(2),
            currency: expenseScope === "group" ? selectedGroup?.currency ?? currency : currency,
          })
        : t("receiptScannerPage.success.createdFromTotal", {
            amount: amount.toFixed(2),
            currency: expenseScope === "group" ? selectedGroup?.currency ?? currency : currency,
          })
    );
  };

  const handleCreateFromSelected = async () => {
    const validItems = selectedItems.filter((item) => item.name.trim().length > 0 && parseAmount(item.amount) > 0);
    if (validItems.length === 0) {
      setLocalError(t("receiptScannerPage.errors.noSelectedItems"));
      return;
    }

    const amount = validItems.reduce((sum, item) => sum + parseAmount(item.amount), 0);
    await createExpense(amount, validItems.map((item) => item.id));
  };

  const handleCreateFromParsedTotal = async () => {
    await createExpense(parseAmount(parsedTotal));
  };

  if (
    personalCategoriesLoading ||
    (expenseScope === "group" && groupsLoading) ||
    (expenseScope === "group" && (groupCategoriesLoading || groupMembersLoading))
  ) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("receiptScannerPage.title")}</h1>
            <p className="mt-2 text-muted-foreground">{t("receiptScannerPage.subtitle")}</p>
          </div>
          <Button asChild variant="outline">
            <Link to={expenseScope === "group" && selectedGroupId ? `/groups/${selectedGroupId}` : "/personal"}>
              {expenseScope === "group" ? t("receiptScannerPage.backToGroup") : t("receiptScannerPage.backToPersonal")}
            </Link>
          </Button>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <Label htmlFor="receipt-scan-file">{t("receiptScannerPage.uploadLabel")}</Label>

            <div className="space-y-2">
              <Label>{t("receiptScannerPage.ocrModeLabel")}</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={ocrMode === "tesseract" ? "default" : "outline"}
                  size="sm"
                  disabled={isUploading || createExpenseMutation.isPending || createGroupExpenseMutation.isPending}
                  onClick={() => setOcrMode("tesseract")}
                >
                  {t("receiptScannerPage.ocrModeFast")}
                </Button>
                <Button
                  type="button"
                  variant={ocrMode === "paddle" ? "default" : "outline"}
                  size="sm"
                  disabled={isUploading || createExpenseMutation.isPending || createGroupExpenseMutation.isPending}
                  onClick={() => setOcrMode("paddle")}
                >
                  {t("receiptScannerPage.ocrModeAccurate")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("receiptScannerPage.ocrModeHint")}</p>
            </div>

            <Input
              id="receipt-scan-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={isUploading || createExpenseMutation.isPending || createGroupExpenseMutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }

                void handleUpload(file);
                event.target.value = "";
              }}
            />

            {isUploading ? <p className="text-xs text-muted-foreground">{t("receiptScannerPage.uploading")}</p> : null}
            {receiptFileName ? (
              <p className="text-xs text-muted-foreground">
                {t("receiptScannerPage.uploadedFile", { fileName: receiptFileName })}
              </p>
            ) : null}

            {ocrStatus ? (
              <p className="text-xs text-muted-foreground">
                {ocrStatus === "done"
                  ? t("receiptScannerPage.ocrDone")
                  : ocrStatus === "unavailable"
                    ? t("receiptScannerPage.ocrUnavailable")
                    : t("receiptScannerPage.ocrFailed")}
                {ocrEngine ? ` (${ocrEngine.toUpperCase()})` : ""}
              </p>
            ) : null}

            {imagePreviewUrl ? (
              <div className="overflow-hidden rounded-md border border-border bg-background/60">
                <img src={imagePreviewUrl} alt={t("receiptScannerPage.previewAlt")} className="max-h-80 w-full object-contain" />
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="receipt-scan-ocr-text">{t("receiptScannerPage.ocrText")}</Label>
              <Textarea
                id="receipt-scan-ocr-text"
                rows={8}
                value={ocrText}
                onChange={(event) => setOcrText(event.target.value)}
              />
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="receipt-scan-scope">{t("receiptScannerPage.scopeLabel")}</Label>
                <Select
                  value={expenseScope}
                  onValueChange={(value) => {
                    setExpenseScope(value as ExpenseScope);
                    setLocalError(null);
                    setLocalSuccess(null);
                  }}
                >
                  <SelectTrigger id="receipt-scan-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="personal">{t("receiptScannerPage.scopePersonal")}</SelectItem>
                      <SelectItem value="group">{t("receiptScannerPage.scopeGroup")}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {expenseScope === "group" ? (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="receipt-scan-group">{t("receiptScannerPage.group")}</Label>
                  <Select
                    value={selectedGroupId > 0 ? String(selectedGroupId) : ""}
                    onValueChange={(value) => {
                      setSelectedGroupId(Number(value));
                      setLocalError(null);
                      setLocalSuccess(null);
                    }}
                  >
                    <SelectTrigger id="receipt-scan-group">
                      <SelectValue placeholder={t("receiptScannerPage.groupPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {activeGroups.map((group) => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="receipt-scan-title">{t("receiptScannerPage.titleField")}</Label>
                <Input
                  id="receipt-scan-title"
                  value={titleDraft}
                  onChange={(event) => setTitleDraft(event.target.value)}
                  placeholder={t("receiptScannerPage.titlePlaceholder")}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-scan-vendor">{t("receiptScannerPage.parsedVendor")}</Label>
                <Input
                  id="receipt-scan-vendor"
                  value={parsedVendor}
                  onChange={(event) => setParsedVendor(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-scan-total">{t("receiptScannerPage.parsedTotal")}</Label>
                <Input
                  id="receipt-scan-total"
                  value={parsedTotal}
                  onChange={(event) => setParsedTotal(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-scan-date">{t("receiptScannerPage.parsedDate")}</Label>
                <DatePicker
                  id="receipt-scan-date"
                  value={parsedDate}
                  onChange={(value) => {
                    setParsedDate(value);
                    setExpenseDate(value);
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-expense-date">{t("receiptScannerPage.expenseDate")}</Label>
                <DatePicker
                  id="receipt-expense-date"
                  value={expenseDate}
                  onChange={setExpenseDate}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-scan-currency">{t("receiptScannerPage.currency")}</Label>
                {expenseScope === "group" ? (
                  <Input id="receipt-scan-currency" value={selectedGroup?.currency ?? currency} disabled />
                ) : (
                  <Select value={currency} onValueChange={(value) => setCurrency(value as CurrencyEnum)}>
                    <SelectTrigger id="receipt-scan-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {SUPPORTED_CURRENCIES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="receipt-scan-category">{t("receiptScannerPage.category")}</Label>
                <CategoryPicker
                  value={categoryId ? String(categoryId) : "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setCategoryId(0);
                      return;
                    }

                    setCategoryId(Number(value));
                  }}
                  categories={categories}
                  trigger="button"
                  showLabel={false}
                  mobileInset={false}
                  showSelectedGroupPrefix
                />
              </div>

              {expenseScope === "group" ? (
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{t("receiptScannerPage.participants")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("receiptScannerPage.selectedParticipants", {
                        count: selectedParticipants.length,
                      })}
                    </p>
                  </div>

                  <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border bg-background/40 p-2">
                    {activeGroupMembers.map((member) => {
                      const checked = selectedMemberIds.includes(member.user_id);
                      return (
                        <label
                          key={member.id}
                          htmlFor={`scanner-participant-${member.user_id}`}
                          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60"
                        >
                          <span className="text-sm text-foreground">{member.username}</span>
                          <input
                            id={`scanner-participant-${member.user_id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              setSelectedMemberIds((previous) =>
                                nextChecked
                                  ? [...previous, member.user_id]
                                  : previous.filter((id) => id !== member.user_id)
                              );
                            }}
                            className="h-4 w-4"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateFromParsedTotal}
                disabled={
                  createExpenseMutation.isPending ||
                  createGroupExpenseMutation.isPending ||
                  parseAmount(parsedTotal) <= 0
                }
              >
                {t("receiptScannerPage.createFromTotal")}
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreateFromSelected()}
                disabled={
                  createExpenseMutation.isPending ||
                  createGroupExpenseMutation.isPending ||
                  selectedItems.length === 0
                }
              >
                {t("receiptScannerPage.createFromSelected")}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("receiptScannerPage.selectedTotal", {
                amount: selectedTotal.toFixed(2),
                currency: expenseScope === "group" ? selectedGroup?.currency ?? currency : currency,
              })}
            </p>

            {expenseScope === "group" && activeGroups.length === 0 ? (
              <p className="text-xs text-destructive">{t("receiptScannerPage.errors.noActiveGroups")}</p>
            ) : null}

            {localError ? <p className="text-xs text-destructive">{localError}</p> : null}
            {localSuccess ? <p className="text-xs text-emerald-600">{localSuccess}</p> : null}
          </section>
        </div>

        <section className="space-y-3 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">{t("receiptScannerPage.itemsTitle")}</h2>
            <Button type="button" variant="outline" size="sm" onClick={handleAddManualItem}>
              {t("receiptScannerPage.addItem")}
            </Button>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("receiptScannerPage.noItems")}</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[auto_1fr_120px_auto] items-center gap-2 rounded-md border border-border bg-background/60 p-2">
                  <input
                    type="checkbox"
                    checked={item.is_selected}
                    disabled={item.is_used}
                    onChange={(event) => handleToggleSelected(item.id, event.target.checked)}
                    className="h-4 w-4"
                  />

                  <Input
                    value={item.name}
                    onChange={(event) => handleUpdateItem(item.id, "name", event.target.value)}
                    placeholder={t("receiptScannerPage.itemNamePlaceholder")}
                    disabled={item.is_used}
                  />

                  <Input
                    value={item.amount}
                    onChange={(event) => handleUpdateItem(item.id, "amount", event.target.value)}
                    placeholder="0.00"
                    disabled={item.is_used}
                  />

                  <div className="flex items-center gap-2">
                    {item.is_used ? (
                      <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                        {t("receiptScannerPage.usedBadge")}
                      </span>
                    ) : null}
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                      {t("receiptScannerPage.removeItem")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
