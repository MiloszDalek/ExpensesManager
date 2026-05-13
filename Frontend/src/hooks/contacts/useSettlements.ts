import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { paypalConfig } from "@/config/paypal";
import { formatGroupName } from "@/utils/group";
import type { ApiGroupResponse } from "@/types";

export function useSettlements(groupById: Record<number, ApiGroupResponse>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [settlementFeedback, setSettlementFeedback] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isPayPalProcessing, setIsPayPalProcessing] = useState(false);
  const pollingRef = useRef(false);
  const [totalSettlementOptionsTarget, setTotalSettlementOptionsTarget] = useState<{
    contactUserId: number;
    contactUsername: string;
    currency: string;
  } | null>(null);
  const [groupSettlementOptionsTarget, setGroupSettlementOptionsTarget] = useState<{
    contactUserId: number;
    contactUsername: string;
    groupId: number;
    groupName: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [groupSettlementTarget, setGroupSettlementTarget] = useState<{
    contactUserId: number;
    contactUsername: string;
    groupId: number;
    groupName: string;
    amount: number;
    currency: string;
  } | null>(null);
  const [totalSettlementTarget, setTotalSettlementTarget] = useState<{
    contactUserId: number;
    contactUsername: string;
  } | null>(null);

  const isPayPalButtonEnabled = paypalConfig.isPayPalButtonEnabled;

  const getPayPalUnavailableMessage = () => {
    return paypalConfig.isDisabled
      ? t("contactsBalancesPage.settlementErrors.paypalDisabled")
      : t("contactsBalancesPage.settlementErrors.paypalSdkNotConfigured");
  };

  const mapTotalSettlementError = (message: string | undefined) => {
    return message === "Cannot settle with yourself"
      ? t("contactsBalancesPage.settlementErrors.cannotSettleWithYourself")
      : message === "No debts to settle"
        ? t("contactsBalancesPage.settlementErrors.noDebtsToSettle")
        : message === "Not authorized"
          ? t("contactsBalancesPage.settlementErrors.notAuthorized")
          : message === "Group not found"
            ? t("contactsBalancesPage.settlementErrors.groupNotFound")
            : message || t("contactsBalancesPage.settlementErrors.settleFailed");
  };

  const mapGroupSettlementError = (message: string | undefined) => {
    return message === "Cannot settle with yourself"
      ? t("contactsBalancesPage.settlementErrors.cannotSettleWithYourself")
      : message === "Group id is required"
        ? t("contactsBalancesPage.settlementErrors.groupIdRequired")
        : message === "Member not found"
          ? t("contactsBalancesPage.settlementErrors.memberNotFound")
          : message === "No balance with this user"
            ? t("contactsBalancesPage.settlementErrors.noBalanceWithUser")
            : message === "No debt between users"
              ? t("contactsBalancesPage.settlementErrors.noDebtBetweenUsers")
              : message === "This user owes you money"
                ? t("contactsBalancesPage.settlementErrors.otherUserOwesYou")
                : message === "Group not found"
                  ? t("contactsBalancesPage.settlementErrors.groupNotFound")
                  : message === "Not authorized"
                    ? t("contactsBalancesPage.settlementErrors.notAuthorized")
                    : message || t("contactsBalancesPage.settlementErrors.settleGroupFailed");
  };

  const mapPayPalSettlementError = (message: string | undefined) => {
    return message === "PayPal integration disabled"
      ? t("contactsBalancesPage.settlementErrors.paypalDisabled")
      : message === "PayPal integration not configured"
      ? t("contactsBalancesPage.settlementErrors.paypalNotConfigured")
      : message === "Could not create PayPal order"
        ? t("contactsBalancesPage.settlementErrors.paypalCreateOrderFailed")
        : message === "PayPal request failed"
          ? t("contactsBalancesPage.settlementErrors.paypalCreateOrderFailed")
          : message === "PayPal capture was not completed"
            ? t("contactsBalancesPage.settlementErrors.paypalCaptureFailed")
          : message === "Total PayPal settlement supports one currency at a time"
            ? t("contactsBalancesPage.settlementErrors.paypalMultiCurrencyNotSupported")
            : message === "No payable amount for PayPal settlement"
              ? t("contactsBalancesPage.settlementErrors.paypalNoPayableAmount")
              : message || t("contactsBalancesPage.settlementErrors.paypalInitFailed");
  };

  const createTotalPayPalOrder = async (toUserId: number): Promise<string> => {
    setSettlementFeedback(null);
    const response = await settlementsApi.initiateTotalPayPal({ to_user_id: toUserId });
    return response.order_id;
  };

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const pollForTotalSettlementCompletion = async (
    orderId: string,
    maxAttempts = 5,
    intervalMs = 1000
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await delay(intervalMs);
      const data = await settlementsApi.getByUser({ limit: 5, offset: 0 });
      if (data.some((s) => s.paypal_order_id === orderId && s.status === "completed")) {
        return true;
      }
    }
    return false;
  };

  const finalizeTotalPayPalOrder = async (orderId: string, toUserId: number) => {
    if (isPayPalProcessing || pollingRef.current) return;
    setIsPayPalProcessing(true);
    pollingRef.current = true;
    setSettlementFeedback({ tone: "info", message: t("contactsBalancesPage.processingPayment") });

    try {
      await settlementsApi.finalizePayPal({ order_id: orderId });
      await pollForTotalSettlementCompletion(orderId);
    } catch (error) {
      pollingRef.current = false;
      setIsPayPalProcessing(false);
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });

    setSettlementFeedback({
      tone: "success",
      message: t("contactsBalancesPage.settlementSuccess"),
    });
    setTotalSettlementOptionsTarget(null);
    setTotalSettlementTarget(null);
    pollingRef.current = false;
    setIsPayPalProcessing(false);
  };

  const createGroupPayPalOrder = async (toUserId: number, groupId: number): Promise<string> => {
    setSettlementFeedback(null);
    const response = await settlementsApi.initiateGroupPayPal({
      to_user_id: toUserId,
      group_id: groupId,
    });
    return response.order_id;
  };

  const pollForGroupSettlementCompletion = async (
    orderId: string,
    groupId: number,
    maxAttempts = 5,
    intervalMs = 1000
  ): Promise<boolean> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await delay(intervalMs);
      const data = await settlementsApi.getByGroup(groupId, { limit: 5, offset: 0 });
      if (data.some((s) => s.paypal_order_id === orderId && s.status === "completed")) {
        return true;
      }
    }
    return false;
  };

  const finalizeGroupPayPalOrder = async (orderId: string, toUserId: number, groupId: number) => {
    if (isPayPalProcessing || pollingRef.current) return;
    setIsPayPalProcessing(true);
    pollingRef.current = true;
    setSettlementFeedback({ tone: "info", message: t("contactsBalancesPage.processingPayment") });

    try {
      await settlementsApi.finalizePayPal({ order_id: orderId });
      await pollForGroupSettlementCompletion(orderId, groupId);
    } catch (error) {
      pollingRef.current = false;
      setIsPayPalProcessing(false);
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });

    const groupName = groupById[groupId]
      ? formatGroupName(groupById[groupId].name)
      : t("contactsBalancesPage.unknownGroup", { groupId });

    setSettlementFeedback({
      tone: "success",
      message: t("contactsBalancesPage.settlementGroupSuccess", { groupName }),
    });
    setGroupSettlementOptionsTarget(null);
    setGroupSettlementTarget(null);
    pollingRef.current = false;
    setIsPayPalProcessing(false);
  };

  const settleTotalCashMutation = useMutation({
    mutationFn: (toUserId: number) =>
      settlementsApi.createTotalCash({
        to_user_id: toUserId,
      }),
    onMutate: () => {
      setSettlementFeedback(null);
    },
    onSuccess: async (_data, toUserId) => {
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

      setSettlementFeedback({
        tone: "success",
        message: t("contactsBalancesPage.settlementSuccess"),
      });
      setTotalSettlementOptionsTarget(null);
      setTotalSettlementTarget(null);
    },
    onError: (mutationError: Error) => {
      setSettlementFeedback({
        tone: "error",
        message: mapTotalSettlementError(mutationError.message),
      });
    },
  });

  const settleGroupCashMutation = useMutation({
    mutationFn: (payload: { toUserId: number; groupId: number }) =>
      settlementsApi.createGroupCash({
        to_user_id: payload.toUserId,
        group_id: payload.groupId,
      }),
    onMutate: () => {
      setSettlementFeedback(null);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(variables.groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(variables.toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(variables.groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

      const groupName = groupById[variables.groupId]
        ? formatGroupName(groupById[variables.groupId].name)
        : t("contactsBalancesPage.unknownGroup", { groupId: variables.groupId });

      setSettlementFeedback({
        tone: "success",
        message: t("contactsBalancesPage.settlementGroupSuccess", {
          groupName,
        }),
      });
      setGroupSettlementOptionsTarget(null);
      setGroupSettlementTarget(null);
    },
    onError: (mutationError: Error) => {
      setSettlementFeedback({
        tone: "error",
        message: mapGroupSettlementError(mutationError.message),
      });
    },
  });

  return {
    settlementFeedback,
    setSettlementFeedback,
    totalSettlementOptionsTarget,
    setTotalSettlementOptionsTarget,
    groupSettlementOptionsTarget,
    setGroupSettlementOptionsTarget,
    groupSettlementTarget,
    setGroupSettlementTarget,
    totalSettlementTarget,
    setTotalSettlementTarget,
    isPayPalButtonEnabled,
    getPayPalUnavailableMessage,
    mapTotalSettlementError,
    mapGroupSettlementError,
    isPayPalProcessing,
    mapPayPalSettlementError,
    createTotalPayPalOrder,
    finalizeTotalPayPalOrder,
    createGroupPayPalOrder,
    finalizeGroupPayPalOrder,
    settleTotalCashMutation,
    settleGroupCashMutation,
  };
}
