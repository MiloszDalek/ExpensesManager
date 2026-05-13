import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { balancesApi } from "@/api/balancesApi";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { paypalConfig } from "@/config/paypal";
import type { ApiGroupBalances, ApiSettlementResponse } from "@/types";
import type { PaymentMethod } from "@/types/enums";
import type { SettlementDialogTarget, OutsideAppConfirmTarget, BalanceRow, UserBalanceSummary } from "@/types";

const SETTLEMENTS_LIMIT = 20;

function mapGroupSettlementError(t: (key: string) => string, message: string | undefined) {
  return message === "Cannot settle with yourself"
    ? t("groupDetailPage.settlementErrors.cannotSettleWithYourself")
    : message === "Group id is required"
      ? t("groupDetailPage.settlementErrors.groupIdRequired")
      : message === "Member not found"
        ? t("groupDetailPage.settlementErrors.memberNotFound")
        : message === "No balance with this user"
          ? t("groupDetailPage.settlementErrors.noBalanceWithUser")
          : message === "No debt between users"
            ? t("groupDetailPage.settlementErrors.noDebtBetweenUsers")
            : message === "This user owes you money"
              ? t("groupDetailPage.settlementErrors.otherUserOwesYou")
              : message === "Group not found"
                ? t("groupDetailPage.settlementErrors.groupNotFound")
                : message === "Not authorized"
                  ? t("groupDetailPage.settlementErrors.notAuthorized")
                  : message || t("groupDetailPage.settlementErrors.settleFailed");
}

function mapPayPalSettlementError(t: (key: string) => string, message: string | undefined) {
  return message === "PayPal integration disabled"
    ? t("groupDetailPage.settlementErrors.paypalDisabled")
    : message === "PayPal integration not configured"
      ? t("groupDetailPage.settlementErrors.paypalNotConfigured")
      : message === "Could not create PayPal order"
        ? t("groupDetailPage.settlementErrors.paypalCreateOrderFailed")
        : message === "PayPal request failed"
          ? t("groupDetailPage.settlementErrors.paypalCreateOrderFailed")
          : message === "PayPal capture was not completed"
            ? t("groupDetailPage.settlementErrors.paypalCaptureFailed")
            : message || t("groupDetailPage.settlementErrors.paypalInitFailed");
}

export function useGroupSettlements(
  groupId: number,
  enabled: boolean,
  currentUserId: number | undefined,
  memberNameById: Record<number, string>
) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [settlementDialogTarget, setSettlementDialogTarget] = useState<SettlementDialogTarget | null>(null);
  const [outsideAppConfirmTarget, setOutsideAppConfirmTarget] = useState<OutsideAppConfirmTarget | null>(null);
  const [groupSettlementFeedback, setGroupSettlementFeedback] = useState<{
    tone: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [isPayPalProcessing, setIsPayPalProcessing] = useState(false);
  const pollingRef = useRef(false);

  const isPayPalButtonEnabled = paypalConfig.isPayPalButtonEnabled;
  const getPayPalUnavailableMessage = () => {
    return paypalConfig.isDisabled
      ? t("groupDetailPage.settlementErrors.paypalDisabled")
      : t("groupDetailPage.settlementErrors.paypalSdkNotConfigured");
  };

  const {
    data: groupBalances,
    isLoading: balancesLoading,
    error: balancesError,
  } = useQuery<ApiGroupBalances>({
    queryKey: queryKeys.balances.group(groupId),
    queryFn: () => balancesApi.getGroup(groupId),
    enabled,
  });

  const {
    data: settlements = [],
    isLoading: settlementsLoading,
    error: settlementsError,
  } = useQuery<ApiSettlementResponse[]>({
    queryKey: queryKeys.settlements.group(groupId, { limit: SETTLEMENTS_LIMIT, offset: 0 }),
    queryFn: () => settlementsApi.getByGroup(groupId, { limit: SETTLEMENTS_LIMIT, offset: 0 }),
    enabled,
  });

  const userBalanceSummary = useMemo<UserBalanceSummary>(() => {
    const balances = groupBalances?.balances ?? [];
    return balances.reduce(
      (accumulator, item) => {
        const amount = Number(item.amount);
        if (amount > 0) {
          accumulator.othersOweMe += amount;
          accumulator.unsettledCount += 1;
        } else if (amount < 0) {
          accumulator.iOweOthers += Math.abs(amount);
          accumulator.unsettledCount += 1;
        }
        return accumulator;
      },
      { othersOweMe: 0, iOweOthers: 0, unsettledCount: 0 }
    );
  }, [groupBalances]);

  const balanceRows = useMemo<BalanceRow[]>(() => {
    const balances = groupBalances?.balances ?? [];
    return balances
      .map((item) => {
        const amount = Number(item.amount);
        const absoluteAmount = Math.abs(amount);
        const memberName =
          memberNameById[item.user_id] ??
          t("groupDetailPage.balanceUnknownUser", { userId: item.user_id });
        const relationLabel =
          amount > 0
            ? t("groupDetailPage.balanceRowOwesYou")
            : amount < 0
              ? t("groupDetailPage.balanceRowYouOwe")
              : t("groupDetailPage.balanceRowSettled");
        return { userId: item.user_id, memberName, relationLabel, amount, absoluteAmount };
      })
      .filter((row) => row.amount !== 0)
      .sort((left, right) => right.absoluteAmount - left.absoluteAmount);
  }, [groupBalances, memberNameById, t]);

  const completedSettlements = useMemo(() => {
    return settlements.filter((settlement) => settlement.status === "completed");
  }, [settlements]);

  const getMemberDisplayName = (userId: number) => {
    if (userId === currentUserId) {
      return t("groupDetailPage.youLabel");
    }
    return memberNameById[userId] ?? t("groupDetailPage.userFallback", { userId });
  };

  const getSettlementMethodLabel = (paymentMethod: PaymentMethod) => {
    if (paymentMethod === "offset_applied" || paymentMethod === "offset_forgiven") {
      return t("groupDetailPage.settlementMethodOffset");
    }
    if (paymentMethod === "paypal") {
      return t("groupDetailPage.settlementMethodPaypal");
    }
    return t("groupDetailPage.settlementMethodCash");
  };

  const createGroupPayPalOrder = async (toUserId: number): Promise<string> => {
    setGroupSettlementFeedback(null);
    const response = await settlementsApi.initiateGroupPayPal({
      to_user_id: toUserId,
      group_id: groupId,
    });
    return response.order_id;
  };

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const pollForSettlementCompletion = async (
    orderId: string,
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

  const finalizeGroupPayPalOrder = async (orderId: string, toUserId: number) => {
    if (isPayPalProcessing || pollingRef.current) return;
    setIsPayPalProcessing(true);
    pollingRef.current = true;
    setGroupSettlementFeedback({ tone: "info", message: t("groupDetailPage.processingPayment") });

    try {
      await settlementsApi.finalizePayPal({ order_id: orderId });
      await pollForSettlementCompletion(orderId);
    } catch (error) {
      pollingRef.current = false;
      setIsPayPalProcessing(false);
      throw error;
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contacts });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });
    await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });

    setGroupSettlementFeedback({ tone: "success", message: t("groupDetailPage.settlementSuccess") });
    setSettlementDialogTarget(null);
    setOutsideAppConfirmTarget(null);
    pollingRef.current = false;
    setIsPayPalProcessing(false);
  };

  const settleGroupCashMutation = useMutation<ApiSettlementResponse, Error, number>({
    mutationFn: (toUserId) =>
      settlementsApi.createGroupCash({ to_user_id: toUserId, group_id: groupId }),
    onMutate: () => {
      setGroupSettlementFeedback(null);
    },
    onSuccess: async (_data, toUserId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contacts });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });
      setGroupSettlementFeedback({ tone: "success", message: t("groupDetailPage.settlementSuccess") });
      setSettlementDialogTarget(null);
      setOutsideAppConfirmTarget(null);
    },
    onError: (mutationError) => {
      setGroupSettlementFeedback({
        tone: "error",
        message: mapGroupSettlementError(t, mutationError.message),
      });
    },
  });

  return {
    balancesLoading,
    balancesError,
    settlementsLoading,
    settlementsError,
    userBalanceSummary,
    balanceRows,
    completedSettlements,
    getMemberDisplayName,
    getSettlementMethodLabel,
    settlementDialogTarget,
    setSettlementDialogTarget,
    outsideAppConfirmTarget,
    setOutsideAppConfirmTarget,
    groupSettlementFeedback,
    setGroupSettlementFeedback,
    isPayPalButtonEnabled,
    getPayPalUnavailableMessage,
    createGroupPayPalOrder,
    finalizeGroupPayPalOrder,
    settleGroupCashMutation,
    isPayPalProcessing,
    mapPayPalSettlementError: (message?: string) => mapPayPalSettlementError(t, message),
  };
}
