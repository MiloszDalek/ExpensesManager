import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Wallet, Coins, UserPlus, Plus, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";
import GroupMembersPanel from "@/components/groups/GroupMembersPanel";
import GroupExpensesList from "@/components/groups/GroupExpensesList";
import AddGroupMemberDialog from "@/components/groups/AddGroupMemberDialog";
import AddGroupExpenseDialog from "@/components/groups/AddGroupExpenseDialog";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { categoriesApi } from "@/api/categoriesApi";
import { contactsApi } from "@/api/contactsApi";
import { invitationsApi } from "@/api/invitationsApi";
import { balancesApi } from "@/api/balancesApi";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";

import type {
  ApiGroupBalances,
  ApiContactResponse,
  ApiGroupExpenseCreate,
  ApiGroupExpenseUpdate,
  ApiGroupExpenseResponse,
  ApiGroupInvitationCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiInvitationResponse,
  ApiCategoryResponse,
  ApiSettlementResponse,
} from "@/types";
import type { PaymentMethod } from "@/types/enums";

const LIMIT = 20;
const CONTACTS_LIMIT = 100;
const SETTLEMENTS_LIMIT = 20;

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { id } = useParams();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ApiGroupExpenseResponse | null>(null);
  const [inviteMemberError, setInviteMemberError] = useState<string | null>(null);
  const [createExpenseError, setCreateExpenseError] = useState<string | null>(null);
  const [editExpenseError, setEditExpenseError] = useState<string | null>(null);
  const [deleteExpenseError, setDeleteExpenseError] = useState<string | null>(null);
  const [groupSettlementFeedback, setGroupSettlementFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const isPayPalSdkEnabled = Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID);

  const groupId = Number(id);
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0;
  const groupPendingInvitationsQueryKey = queryKeys.invitations.groupPending(groupId, {
    limit: 100,
    offset: 0,
  });

  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
  } = useQuery<ApiGroupResponse>({
    queryKey: queryKeys.groups.byId(groupId),
    queryFn: () => groupsApi.getById(groupId),
    enabled: !!user && isValidGroupId,
  });

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
  } = useQuery<ApiGroupMemberResponse[]>({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsApi.members(groupId),
    enabled: !!user && isValidGroupId,
  });

  const currentMember = useMemo(
    () => members.find((member) => member.user_id === user?.id) ?? null,
    [members, user?.id]
  );
  const isCurrentUserAdmin = currentMember?.role === "admin";

  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery<ApiContactResponse[]>({
    queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    queryFn: () => contactsApi.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    enabled: !!user && isValidGroupId && isCurrentUserAdmin,
  });

  const {
    data: pendingInvitations = [],
    isLoading: pendingInvitationsLoading,
    error: pendingInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: groupPendingInvitationsQueryKey,
    queryFn: () => invitationsApi.listGroupPending(groupId, { limit: 100, offset: 0 }),
    enabled: !!user && isValidGroupId && isCurrentUserAdmin,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availableGroup(groupId),
    queryFn: () => categoriesApi.getAvailableGroup(groupId),
    enabled: !!user && isValidGroupId,
  });

  const {
    data: groupBalances,
    isLoading: balancesLoading,
    error: balancesError,
  } = useQuery<ApiGroupBalances>({
    queryKey: queryKeys.balances.group(groupId),
    queryFn: () => balancesApi.getGroup(groupId),
    enabled: !!user && isValidGroupId,
  });

  const {
    data: expensePages,
    isLoading: expensesLoading,
    error: expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ApiGroupExpenseResponse[]>({
    queryKey: [...queryKeys.groupExpenses.list(groupId), "infinite"],
    queryFn: ({ pageParam = 0 }) =>
      expensesGroupApi.list(groupId, {
        limit: LIMIT,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === LIMIT ? allPages.length * LIMIT : undefined;
    },
    initialPageParam: 0,
    enabled: !!user && isValidGroupId,
  });

  const {
    data: settlements = [],
    isLoading: settlementsLoading,
    error: settlementsError,
  } = useQuery<ApiSettlementResponse[]>({
    queryKey: queryKeys.settlements.group(groupId, { limit: SETTLEMENTS_LIMIT, offset: 0 }),
    queryFn: () => settlementsApi.getByGroup(groupId, { limit: SETTLEMENTS_LIMIT, offset: 0 }),
    enabled: !!user && isValidGroupId,
  });

  const expenses = useMemo(() => expensePages?.pages.flatMap((page) => page) ?? [], [expensePages]);

  const inviteMemberMutation = useMutation<ApiInvitationResponse, Error, ApiGroupInvitationCreate>({
    mutationFn: (payload) => invitationsApi.sendToGroup(payload),
    onMutate: () => {
      setInviteMemberError(null);
    },
    onSuccess: async (createdInvitation) => {
      queryClient.setQueryData<ApiInvitationResponse[]>(groupPendingInvitationsQueryKey, (previous = []) => {
        if (previous.some((invitation) => invitation.id === createdInvitation.id)) {
          return previous;
        }

        return [createdInvitation, ...previous];
      });
      await queryClient.invalidateQueries({ queryKey: groupPendingInvitationsQueryKey });
      setInviteMemberError(null);
      setShowAddMemberDialog(false);
    },
    onError: (mutationError) => {
      setInviteMemberError(mapGroupInvitationError(mutationError.message));
    },
  });

  const grantAdminMutation = useMutation<ApiGroupMemberResponse, Error, number>({
    mutationFn: (targetUserId) => groupsApi.grantAdmin(groupId, targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
    },
  });

  const removeMemberMutation = useMutation<void, Error, number>({
    mutationFn: (targetUserId) => groupsApi.removeMember(groupId, targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.members(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      await queryClient.invalidateQueries({ queryKey: ["invitations", "group", groupId, "pending"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    },
  });

  const leaveGroupMutation = useMutation<void, Error>({
    mutationFn: () => groupsApi.leaveGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      navigate(createPageUrl("Groups"));
    },
  });

  const cancelInvitationMutation = useMutation<ApiInvitationResponse, Error, number>({
    mutationFn: (invitationId) => invitationsApi.cancel(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupPendingInvitationsQueryKey });
    },
  });

  const mapGroupExpenseError = (message: string | undefined, fallbackKey: string) => {
    return message === "Participant not found in group"
      ? t("addGroupExpenseDialog.errors.participantNotFoundInGroup")
      : message === "Duplicate participants"
        ? t("addGroupExpenseDialog.errors.duplicateParticipants")
        : message === "Expense must have at least one participant"
          ? t("addGroupExpenseDialog.errors.participantsRequired")
          : message === "Share amounts must be positive"
            ? t("addGroupExpenseDialog.errors.sharesPositive")
            : message === "Split amounts must add up to total expense amount"
              ? t("addGroupExpenseDialog.errors.sharesSumMismatch")
              : message === "Expense currency must match group currency"
                ? t("addGroupExpenseDialog.errors.currencyMismatch")
                : message === "Group not found"
                  ? t("addGroupExpenseDialog.errors.groupNotFound")
                  : message === "Expense not found"
                    ? t("addGroupExpenseDialog.errors.expenseNotFound")
                    : message === "Updating amount requires expense shares"
                      ? t("addGroupExpenseDialog.errors.updateRequiresShares")
                      : message === "Not authorized admin group role required or being expense creator"
                        ? t("addGroupExpenseDialog.errors.managePermissionRequired")
                        : message === "Not authorized"
                          ? t("addGroupExpenseDialog.errors.notAuthorized")
                          : message || t(fallbackKey);
  };

  const mapGroupSettlementError = (message: string | undefined) => {
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
  };

  function mapGroupInvitationError(message: string | undefined) {
    return message === "Cannot invite yourself"
      ? t("dashboardInbox.errors.cannotInviteYourself")
      : message === "Invitation already accepted"
        ? t("dashboardInbox.errors.invitationAlreadyAccepted")
        : message === "Invitation is already pending. Wait for response or cancel the existing invitation."
          ? t("dashboardInbox.errors.invitationAlreadyPending")
          : message === "Group invitation is already pending. Wait for response or cancel the existing invitation."
            ? t("dashboardInbox.errors.groupInvitationAlreadyPending")
            : message === "User with this email does not exist"
              ? t("dashboardInbox.errors.userWithEmailNotFound")
              : message === "Not authorized"
                ? t("dashboardInbox.errors.notAuthorized")
                : message || t("common.somethingWentWrong");
    }

  const mapPayPalSettlementError = (message: string | undefined) => {
    return message === "PayPal integration not configured"
      ? t("groupDetailPage.settlementErrors.paypalNotConfigured")
      : message === "Could not create PayPal order"
        ? t("groupDetailPage.settlementErrors.paypalCreateOrderFailed")
        : message === "PayPal request failed"
          ? t("groupDetailPage.settlementErrors.paypalCreateOrderFailed")
          : message === "PayPal capture was not completed"
            ? t("groupDetailPage.settlementErrors.paypalCaptureFailed")
          : message || t("groupDetailPage.settlementErrors.paypalInitFailed");
  };

  const createGroupPayPalOrder = async (toUserId: number): Promise<string> => {
    setGroupSettlementFeedback(null);
    const response = await settlementsApi.initiateGroupPayPal({
      to_user_id: toUserId,
      group_id: groupId,
    });
    return response.order_id;
  };

  const finalizeGroupPayPalOrder = async (orderId: string, toUserId: number) => {
    await settlementsApi.finalizePayPal({ order_id: orderId });

    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contacts });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

    setGroupSettlementFeedback({
      tone: "success",
      message: t("groupDetailPage.settlementSuccess"),
    });
  };

  const settleGroupCashMutation = useMutation({
    mutationFn: (toUserId: number) =>
      settlementsApi.createGroupCash({
        to_user_id: toUserId,
        group_id: groupId,
      }),
    onMutate: () => {
      setGroupSettlementFeedback(null);
    },
    onSuccess: async (_data, toUserId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contacts });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

      setGroupSettlementFeedback({
        tone: "success",
        message: t("groupDetailPage.settlementSuccess"),
      });
    },
    onError: (mutationError: Error) => {
      setGroupSettlementFeedback({
        tone: "error",
        message: mapGroupSettlementError(mutationError.message),
      });
    },
  });

  const createExpenseMutation = useMutation<ApiGroupExpenseResponse, Error, ApiGroupExpenseCreate>({
    mutationFn: (expenseData) => expensesGroupApi.create(groupId, expenseData),
    onMutate: () => {
      setCreateExpenseError(null);
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      setCreateExpenseError(null);
      setShowAddExpenseDialog(false);
    },
    onError: (mutationError) => {
      setCreateExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.createFailed"));
    },
  });

  const updateExpenseMutation = useMutation<
    ApiGroupExpenseResponse,
    Error,
    { expenseId: number; payload: ApiGroupExpenseUpdate }
  >({
    mutationFn: ({ expenseId, payload }) => expensesGroupApi.update(groupId, expenseId, payload),
    onMutate: () => {
      setEditExpenseError(null);
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      setEditExpenseError(null);
      setEditingExpense(null);
    },
    onError: (mutationError) => {
      setEditExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.updateFailed"));
    },
  });

  const deleteExpenseMutation = useMutation<void, Error, number>({
    mutationFn: (expenseId) => expensesGroupApi.delete(groupId, expenseId),
    onMutate: () => {
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      setDeleteExpenseError(null);
    },
    onError: (mutationError) => {
      setDeleteExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.deleteFailed"));
    },
  });

  const handleInviteByContact = async (toUserId: number) => {
    await inviteMemberMutation.mutateAsync({
      group_id: groupId,
      to_user_id: toUserId,
    });
  };

  const handleInviteByEmail = async (email: string) => {
    await inviteMemberMutation.mutateAsync({
      group_id: groupId,
      to_user_email: email,
    });
  };

  const handleAddExpenseDialogOpenChange = (nextOpen: boolean) => {
    setShowAddExpenseDialog(nextOpen);
    if (!nextOpen) {
      setCreateExpenseError(null);
    }
    setDeleteExpenseError(null);
  };

  const handleAddMemberDialogOpenChange = (nextOpen: boolean) => {
    setShowAddMemberDialog(nextOpen);
    setInviteMemberError(null);
  };

  const handleEditExpenseDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingExpense(null);
      setEditExpenseError(null);
    }
    setDeleteExpenseError(null);
  };

  const memberNameById = useMemo(() => {
    return members.reduce<Record<number, string>>((accumulator, member) => {
      accumulator[member.user_id] = member.username;
      return accumulator;
    }, {});
  }, [members]);

  const pendingInvitationUserIds = useMemo(() => {
    const pendingUserIdSet = new Set<number>();

    pendingInvitations.forEach((invitation) => {
      if (invitation.status === "pending") {
        pendingUserIdSet.add(invitation.to_user_id);
      }
    });

    return Array.from(pendingUserIdSet);
  }, [pendingInvitations]);

  const defaultCurrency = group?.currency ?? "PLN";

  const totalByCurrencyLabel = useMemo(() => {
    const totalsByCurrency = expenses.reduce<Record<string, number>>((accumulator, expense) => {
      const currency = expense.currency ?? defaultCurrency;
      accumulator[currency] = (accumulator[currency] ?? 0) + Number(expense.amount);
      return accumulator;
    }, {});

    return Object.entries(totalsByCurrency)
      .map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`)
      .join(" · ");
  }, [expenses, defaultCurrency]);

  const userBalanceSummary = useMemo(() => {
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

  const balanceRows = useMemo(() => {
    const balances = groupBalances?.balances ?? [];

    return balances
      .map((item) => {
        const amount = Number(item.amount);
        const absoluteAmount = Math.abs(amount);
        const memberName =
          memberNameById[item.user_id] ??
          t("groupDetailPage.balanceUnknownUser", {
            userId: item.user_id,
          });

        const relationLabel = amount > 0
          ? t("groupDetailPage.balanceRowOwesYou")
          : amount < 0
            ? t("groupDetailPage.balanceRowYouOwe")
            : t("groupDetailPage.balanceRowSettled");

        return {
          userId: item.user_id,
          memberName,
          relationLabel,
          amount,
          absoluteAmount,
        };
      })
      .filter((row) => row.amount !== 0)
      .sort((left, right) => right.absoluteAmount - left.absoluteAmount);
  }, [groupBalances, memberNameById, t]);

  const completedSettlements = useMemo(() => {
    return settlements.filter((settlement) => settlement.status === "completed");
  }, [settlements]);

  const getMemberDisplayName = (userId: number) => {
    if (userId === user?.id) {
      return t("groupDetailPage.youLabel");
    }

    return (
      memberNameById[userId] ??
      t("groupDetailPage.userFallback", {
        userId,
      })
    );
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

  if (!isValidGroupId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">{t("groupDetailPage.invalidGroupTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("groupDetailPage.invalidGroupDescription")}</p>
            <Link to={createPageUrl("Groups")} className="mt-4 inline-block">
              <Button>{t("groupDetailPage.backToGroups")}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || groupLoading || membersLoading || categoriesLoading || expensesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (groupError || membersError || categoriesError || expensesError || contactsError || pendingInvitationsError || !group) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {groupError?.message || membersError?.message || categoriesError?.message || expensesError?.message || contactsError?.message || pendingInvitationsError?.message || t("common.somethingWentWrong")}
          </p>
          <Link to={createPageUrl("Groups")} className="mt-4 inline-block">
            <Button variant="outline">{t("groupDetailPage.backToGroups")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to={createPageUrl("Groups")}> 
            <Button variant="ghost" className="mb-3 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("groupDetailPage.backToGroups")}
            </Button>
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{formatGroupName(group.name)}</h1>
          <p className="mt-2 text-muted-foreground">
            {group.description || t("groupDetailPage.noDescription")} · {t("groupDetailPage.currencyLabel")}: {group.currency}
          </p>
        </motion.div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("groupDetailPage.summaryMembers")}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
                <Users className="h-5 w-5 text-primary" />
                {members.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("groupDetailPage.summaryExpenses")}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
                <Wallet className="h-5 w-5 text-primary" />
                {expenses.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("groupDetailPage.summaryTotal")}</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground md:text-base">
                <Coins className="h-5 w-5 text-primary" />
                {totalByCurrencyLabel || "0.00"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                {t("groupDetailPage.balanceSummarySection")}
              </h2>
              <span className="text-xs text-muted-foreground">{group.currency}</span>
            </div>

            {balancesLoading ? (
              <p className="text-sm text-muted-foreground">{t("groupDetailPage.balanceSummaryLoading")}</p>
            ) : balancesError ? (
              <p className="text-sm text-destructive">{t("groupDetailPage.balanceSummaryError")}</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-sm text-emerald-700">{t("groupDetailPage.balanceOthersOweYou")}</p>
                    <p className="mt-1 text-xl font-semibold text-emerald-900">
                      {userBalanceSummary.othersOweMe.toFixed(2)} {group.currency}
                    </p>
                  </div>
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                    <p className="text-sm text-rose-700">{t("groupDetailPage.balanceYouOwe")}</p>
                    <p className="mt-1 text-xl font-semibold text-rose-900">
                      {userBalanceSummary.iOweOthers.toFixed(2)} {group.currency}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {userBalanceSummary.unsettledCount === 0
                    ? t("groupDetailPage.balanceAllSettled")
                    : t("groupDetailPage.balanceOpenCount", {
                        count: userBalanceSummary.unsettledCount,
                      })}
                </p>

                {groupSettlementFeedback ? (
                  <p
                    className={`mt-2 text-sm ${
                      groupSettlementFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"
                    }`}
                  >
                    {groupSettlementFeedback.message}
                  </p>
                ) : null}

                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {t("groupDetailPage.balanceBreakdownTitle")}
                  </p>

                  {balanceRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t("groupDetailPage.balanceNoBreakdownRows")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {balanceRows.map((row) => (
                        <div
                          key={row.userId}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{row.memberName}</p>
                            <p className="truncate text-xs text-muted-foreground">{row.relationLabel}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="whitespace-nowrap text-sm font-semibold text-foreground">
                              {row.absoluteAmount.toFixed(2)} {group.currency}
                            </p>

                            {row.amount < 0 ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={
                                    settleGroupCashMutation.isPending &&
                                    settleGroupCashMutation.variables === row.userId
                                  }
                                  onClick={() => settleGroupCashMutation.mutate(row.userId)}
                                >
                                  {settleGroupCashMutation.isPending &&
                                  settleGroupCashMutation.variables === row.userId
                                    ? t("groupDetailPage.settlingCash")
                                    : t("groupDetailPage.settleCash")}
                                </Button>
                                {isPayPalSdkEnabled ? (
                                  <div className="w-[165px]">
                                    <PayPalCurrencyButtons
                                      currency={group.currency}
                                      fundingSource="paypal"
                                      style={{ layout: "horizontal", tagline: false, height: 34 }}
                                      forceReRender={[row.userId, groupId]}
                                      createOrder={async () => {
                                        try {
                                          return await createGroupPayPalOrder(row.userId);
                                        } catch (error) {
                                          const message = error instanceof Error ? error.message : undefined;
                                          setGroupSettlementFeedback({
                                            tone: "error",
                                            message: mapPayPalSettlementError(message),
                                          });
                                          throw error;
                                        }
                                      }}
                                      onApprove={async (data) => {
                                        if (!data.orderID) {
                                          setGroupSettlementFeedback({
                                            tone: "error",
                                            message: t("groupDetailPage.settlementErrors.paypalInitFailed"),
                                          });
                                          return;
                                        }

                                        try {
                                          await finalizeGroupPayPalOrder(data.orderID, row.userId);
                                        } catch (error) {
                                          const message = error instanceof Error ? error.message : undefined;
                                          setGroupSettlementFeedback({
                                            tone: "error",
                                            message: mapPayPalSettlementError(message),
                                          });
                                        }
                                      }}
                                      onCancel={() => {
                                        setGroupSettlementFeedback({
                                          tone: "error",
                                          message: t("groupDetailPage.settlementErrors.paypalCancelled"),
                                        });
                                      }}
                                      onError={(error) => {
                                        const message = error instanceof Error ? error.message : undefined;
                                        setGroupSettlementFeedback({
                                          tone: "error",
                                          message: mapPayPalSettlementError(message),
                                        });
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                                    {t("groupDetailPage.settlementErrors.paypalSdkNotConfigured")}
                                  </p>
                                )}
                              </>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">{t("groupDetailPage.expensesSection")}</h2>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/receipt-scan?mode=group&groupId=${groupId}`}>
                    <ScanSearch className="mr-2 h-4 w-4" />
                    {t("groupDetailPage.scanReceipt")}
                  </Link>
                </Button>
                <Button size="sm" onClick={() => setShowAddExpenseDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("groupDetailPage.addExpense")}
                </Button>
              </div>
            </div>
            <GroupExpensesList
              expenses={expenses}
              categories={categories}
              memberNameById={memberNameById}
              fallbackCurrency={group.currency}
              isLoading={false}
              onEdit={(expense) => {
                setEditingExpense(expense);
                setEditExpenseError(null);
                setDeleteExpenseError(null);
              }}
              onDelete={(expenseId) => {
                deleteExpenseMutation.mutate(expenseId);
              }}
              canManageExpense={(expense) => isCurrentUserAdmin || expense.user_id === user.id}
            />

            {deleteExpenseError ? (
              <p className="mt-3 text-sm text-destructive">{deleteExpenseError}</p>
            ) : null}

            {hasNextPage && (
              <Button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                variant="outline"
                className="mt-4"
              >
                {isFetchingNextPage ? t("groupDetailPage.loadingMore") : t("groupDetailPage.loadMore")}
              </Button>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-foreground">{t("groupDetailPage.membersSection")}</h2>
              {isCurrentUserAdmin && (
                <Button size="sm" variant="outline" onClick={() => setShowAddMemberDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("groupDetailPage.addMember")}
                </Button>
              )}
            </div>
            <GroupMembersPanel
              members={members}
              currentUserId={user.id}
              canManageMembers={isCurrentUserAdmin}
              grantPendingUserId={grantAdminMutation.isPending ? grantAdminMutation.variables ?? null : null}
              removePendingUserId={removeMemberMutation.isPending ? removeMemberMutation.variables ?? null : null}
              leavePending={leaveGroupMutation.isPending}
              onGrantAdmin={(userId) => grantAdminMutation.mutate(userId)}
              onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
              onLeaveGroup={() => leaveGroupMutation.mutate()}
              isLoading={false}
            />

            <Card className="mt-4 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="mb-3 text-base font-semibold text-foreground">
                  {t("groupDetailPage.settlementsSection")}
                </h3>

                {settlementsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-14 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : settlementsError ? (
                  <p className="text-sm text-destructive">
                    {t("groupDetailPage.settlementsLoadError")}
                  </p>
                ) : completedSettlements.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    {t("groupDetailPage.settlementsEmpty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {completedSettlements.map((settlement) => (
                      <div key={settlement.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">
                          {t("groupDetailPage.settlementItem", {
                            from: getMemberDisplayName(settlement.from_user_id),
                            to: getMemberDisplayName(settlement.to_user_id),
                          })}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {Number(settlement.amount).toFixed(2)} {settlement.currency} · {getSettlementMethodLabel(settlement.payment_method)} · {format(new Date(settlement.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isCurrentUserAdmin && (
              <Card className="mt-4 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="p-4">
                  <h3 className="mb-3 text-base font-semibold text-foreground">
                    {t("groupDetailPage.pendingInvitations")}
                  </h3>

                  {pendingInvitationsLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((item) => (
                        <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                      ))}
                    </div>
                  ) : pendingInvitations.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                      {t("groupDetailPage.noPendingInvitations")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {pendingInvitations.map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {t("groupDetailPage.pendingInvitationUser", {
                                userId: invitation.to_user_id,
                              })}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancelInvitationMutation.isPending && cancelInvitationMutation.variables === invitation.id}
                            onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                          >
                            {cancelInvitationMutation.isPending && cancelInvitationMutation.variables === invitation.id
                              ? t("groupDetailPage.cancelling")
                              : t("groupDetailPage.cancelInvitation")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AddGroupMemberDialog
        open={showAddMemberDialog}
        onOpenChange={handleAddMemberDialogOpenChange}
        contacts={contacts}
        members={members}
        pendingInvitationUserIds={pendingInvitationUserIds}
        isSubmitting={inviteMemberMutation.isPending || contactsLoading}
        errorMessage={inviteMemberError}
        onInviteByContact={handleInviteByContact}
        onInviteByEmail={handleInviteByEmail}
      />

      <AddGroupExpenseDialog
        open={showAddExpenseDialog}
        onOpenChange={handleAddExpenseDialogOpenChange}
        onSubmit={(data) => createExpenseMutation.mutate(data)}
        isLoading={createExpenseMutation.isPending}
        categories={categories}
        members={members}
        groupCurrency={group.currency}
        errorMessage={createExpenseError}
        mode="create"
        expense={null}
      />

      <AddGroupExpenseDialog
        open={!!editingExpense}
        onOpenChange={handleEditExpenseDialogOpenChange}
        onSubmit={(data) => {
          if (!editingExpense) {
            return;
          }

          updateExpenseMutation.mutate({
            expenseId: editingExpense.id,
            payload: data,
          });
        }}
        isLoading={updateExpenseMutation.isPending}
        categories={categories}
        members={members}
        groupCurrency={group.currency}
        errorMessage={editExpenseError}
        mode="edit"
        expense={editingExpense}
      />
    </div>
  );
}
