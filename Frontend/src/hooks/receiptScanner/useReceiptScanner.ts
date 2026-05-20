import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { categoriesApi } from "@/api/categoriesApi";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { expensesPersonalApi } from "@/api/expensesPersonalApi";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import { receiptsApi } from "@/api/receiptsApi";
import { getDefaultCategoryId } from "@/utils/category";
import { type CurrencyEnum } from "@/types/enums";
import { useHasCamera } from "@/hooks/useHasCamera";
import {
  areNumberArraysEqual,
  buildEqualShares,
  compressImageFile,
  parseAmount,
  toCents,
} from "@/utils/receiptScanner";
import type {
  ApiCategoryResponse,
  ApiGroupExpenseCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiPersonalExpenseCreate,
  OcrEngine,
  OcrEngineMode,
  ScannerItem,
  ExpenseScope,
} from "@/types/receiptScanner";

const getDefaultTitle = (fallback: string) => {
  return fallback;
};

export function useReceiptScanner() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const modeParam = searchParams.get("mode");
  const groupIdParam = searchParams.get("groupId");
  const normalizedScopeFromUrl: ExpenseScope = modeParam === "group" ? "group" : "personal";
  const normalizedGroupIdFromUrl =
    Number.isInteger(Number(groupIdParam)) && Number(groupIdParam) > 0 ? Number(groupIdParam) : 0;

  const hasCamera = useHasCamera();

  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<"done" | "unavailable" | "failed" | null>(null);
  const [ocrEngine, setOcrEngine] = useState<OcrEngine | null>(null);
  const [ocrMode, setOcrMode] = useState<OcrEngineMode>("paddle");
  const [isUploading, setIsUploading] = useState(false);

  const [ocrText, setOcrText] = useState("");
  const [parsedTotal, setParsedTotal] = useState("");
  const [items, setItems] = useState<ScannerItem[]>([]);

  const [expenseScope, setExpenseScope] = useState<ExpenseScope>(normalizedScopeFromUrl);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(normalizedGroupIdFromUrl);
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [currency, setCurrency] = useState<CurrencyEnum>("PLN");
  const [categoryId, setCategoryId] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [titleDraft, setTitleDraft] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);
  const [localWarning, setLocalWarning] = useState<string | null>(null);
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
    setLocalWarning(null);
    setLocalSuccess(null);
    setIsUploading(true);

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    let uploadFile = file;
    try {
      uploadFile = await compressImageFile(file);
    } catch {
      // compression failed, use original file
    }
    setImagePreviewUrl(URL.createObjectURL(uploadFile));
    setReceiptFileName(file.name);
    setOcrEngine(null);

    try {
      const result = await receiptsApi.upload(uploadFile, ocrMode);
      const didFallbackToTesseract = ocrMode === "paddle" && result.ocr_engine === "tesseract";

      setOcrStatus(result.ocr_status);
      setOcrEngine(result.ocr_engine ?? null);
      setLocalWarning(didFallbackToTesseract ? t("receiptScannerPage.ocrFallbackToTesseract") : null);
      setOcrText(result.receipt_text ?? "");
      setParsedTotal(result.parsed_total ?? result.detected_amount ?? "");
      if (result.parsed_date) {
        setExpenseDate(result.parsed_date);
      }

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
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
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
      title: getDefaultTitle(titleDraft || t("receiptScannerPage.defaultTitle")),
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
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
      setLocalError(message || t("common.somethingWentWrong"));
      return;
    }

    if (sourceItemIds.length > 0) {
      setItems((previous) =>
        previous.map((item) =>
          sourceItemIds.includes(item.id) ? { ...item, is_used: true, is_selected: false } : item
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

  const isLoading =
    personalCategoriesLoading ||
    (expenseScope === "group" && groupsLoading) ||
    (expenseScope === "group" && (groupCategoriesLoading || groupMembersLoading));

  return {
    hasCamera,
    imagePreviewUrl,
    receiptFileName,
    ocrStatus,
    ocrEngine,
    ocrMode,
    isUploading,
    ocrText,
    parsedTotal,
    items,
    expenseScope,
    selectedGroupId,
    selectedMemberIds,
    currency,
    categoryId,
    expenseDate,
    titleDraft,
    localError,
    localWarning,
    localSuccess,
    activeGroups,
    activeGroupMembers,
    selectedParticipants,
    selectedGroup,
    categories,
    selectedItems,
    selectedTotal,
    createExpenseMutation,
    createGroupExpenseMutation,
    isLoading,
    setOcrMode,
    setOcrText,
    setParsedTotal,
    setExpenseScope,
    setSelectedGroupId,
    setSelectedMemberIds,
    setCurrency,
    setCategoryId,
    setExpenseDate,
    setTitleDraft,
    setLocalError,
    setLocalWarning,
    setLocalSuccess,
    handleUpload,
    handleToggleSelected,
    handleUpdateItem,
    handleRemoveItem,
    handleAddManualItem,
    handleCreateFromSelected,
    handleCreateFromParsedTotal,
  };
}
