import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Wallet, Coins, UserPlus, Plus, ScanSearch, Pencil, Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SpeedDial from "@/components/ui/speed-dial";
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";
import GroupMembersPanel from "@/components/groups/GroupMembersPanel";
import GroupExpensesList from "@/components/groups/GroupExpensesList";
import AddGroupMemberDialog from "@/components/groups/AddGroupMemberDialog";
import AddGroupExpenseDialog from "@/components/groups/AddGroupExpenseDialog";
import AddGroupRecurringExpenseDialog from "@/components/groups/AddGroupRecurringExpenseDialog";
import EditRecurringExpenseDialog from "@/components/expenses/EditRecurringExpenseDialog";
import EditGroupDialog from "@/components/groups/EditGroupDialog";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { recurringExpensesApi } from "@/api/recurringExpensesApi";
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
  ApiRecurringGroupExpenseCreate,
  ApiRecurringExpenseUpdate,
  ApiRecurringExpenseResponse,
  ApiGroupResponse,
  ApiGroupUpdate,
  ApiInvitationResponse,
  ApiCategoryResponse,
  ApiSettlementResponse,
} from "@/types";
import type { CategorySection, PaymentMethod } from "@/types/enums";

const LIMIT = 20;
const CONTACTS_LIMIT = 100;
const SETTLEMENTS_LIMIT = 20;
const RECURRING_LIMIT = 50;

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { id } = useParams();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showAddRecurringExpenseDialog, setShowAddRecurringExpenseDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ApiGroupExpenseResponse | null>(null);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<ApiRecurringExpenseResponse | null>(null);
  const [mobileSection, setMobileSection] = useState<"expenses" | "balances" | "recurring" | "members">("expenses");
  const [settlementDialogTarget, setSettlementDialogTarget] = useState<{
    userId: number;
    memberName: string;
    absoluteAmount: number;
  } | null>(null);
  const [outsideAppConfirmTarget, setOutsideAppConfirmTarget] = useState<{
    userId: number;
    absoluteAmount: number;
  } | null>(null);
  const [inviteMemberError, setInviteMemberError] = useState<string | null>(null);
  const [createExpenseError, setCreateExpenseError] = useState<string | null>(null);
  const [editExpenseError, setEditExpenseError] = useState<string | null>(null);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
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

  const {
    data: recurringExpenses = [],
    isLoading: recurringLoading,
    error: recurringError,
  } = useQuery<ApiRecurringExpenseResponse[]>({
    queryKey: queryKeys.recurringExpenses.list({
      scope: "group",
      group_id: groupId,
      limit: RECURRING_LIMIT,
      offset: 0,
    }),
    queryFn: () =>
      recurringExpensesApi.list({
        scope: "group",
        group_id: groupId,
        limit: RECURRING_LIMIT,
        offset: 0,
      }),
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

  const updateGroupMutation = useMutation<ApiGroupResponse, Error, ApiGroupUpdate>({
    mutationFn: (payload) => groupsApi.update(groupId, payload),
    onMutate: () => {
      setEditGroupError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setEditGroupError(null);
      setShowEditGroupDialog(false);
    },
    onError: (mutationError) => {
      setEditGroupError(mapGroupUpdateError(mutationError.message));
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

  function mapGroupUpdateError(message: string | undefined) {
    return message === "You already have an active group with this name"
      ? t("createGroupDialog.errors.activeGroupNameTaken")
      : message === "Group name cannot be empty"
        ? t("createGroupDialog.errors.emptyName")
        : message === "Group name is too long"
          ? t("createGroupDialog.errors.nameTooLong")
          : message === "Group description is too long"
            ? t("createGroupDialog.errors.descriptionTooLong")
            : message === "Cannot change group currency when group has expenses"
              ? t("groupEditDialog.errors.currencyLocked")
              : message === "Not authorized"
                ? t("groupEditDialog.errors.notAuthorized")
                : message || t("groupEditDialog.errors.updateFailed");
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
    setSettlementDialogTarget(null);
    setOutsideAppConfirmTarget(null);
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
      setSettlementDialogTarget(null);
      setOutsideAppConfirmTarget(null);
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      setCreateExpenseError(null);
      setShowAddExpenseDialog(false);
    },
    onError: (mutationError) => {
      setCreateExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.createFailed"));
    },
  });

  const createRecurringExpenseMutation = useMutation<void, Error, ApiRecurringGroupExpenseCreate>({
    mutationFn: async (payload) => {
      const recurringExpense = await recurringExpensesApi.createGroup(groupId, payload);
      await recurringExpensesApi.generateNow(recurringExpense.id, { up_to_date: payload.starts_on });
    },
    onMutate: () => {
      setCreateExpenseError(null);
      setDeleteExpenseError(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
      setCreateExpenseError(null);
      setShowAddRecurringExpenseDialog(false);
    },
    onError: (mutationError) => {
      setCreateExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.createFailed"));
    },
  });

  const updateRecurringMutation = useMutation<
    ApiRecurringExpenseResponse,
    Error,
    { recurringExpenseId: number; payload: ApiRecurringExpenseUpdate }
  >({
    mutationFn: ({ recurringExpenseId, payload }) => recurringExpensesApi.update(recurringExpenseId, payload),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
      setEditingRecurringExpense(null);
    },
  });

  const recurringActionDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const invalidateRecurringGroupQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.recurringExpenses.all });
    await queryClient.invalidateQueries({ queryKey: ["expenses", "group", groupId] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
  };

  const generateNowRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) =>
      recurringExpensesApi.generateNow(recurringExpenseId, { up_to_date: recurringActionDate }),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const pauseRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.pause(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const resumeRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.resume(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const archiveRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.archive(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
    },
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: (recurringExpenseId: number) => recurringExpensesApi.delete(recurringExpenseId),
    onSuccess: async () => {
      await invalidateRecurringGroupQueries();
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.byId(groupId) });
      setDeleteExpenseError(null);
    },
    onError: (mutationError) => {
      setDeleteExpenseError(mapGroupExpenseError(mutationError.message, "addGroupExpenseDialog.errors.deleteFailed"));
    },
  });

  const createGroupCategoryMutation = useMutation<
    ApiCategoryResponse,
    Error,
    { name: string; section: CategorySection }
  >({
    mutationFn: (payload) => categoriesApi.createGroup(groupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.availableGroup(groupId) });
    },
  });

  const deleteGroupCategoryMutation = useMutation<void, Error, number>({
    mutationFn: (categoryId) => categoriesApi.deleteGroup(categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories.availableGroup(groupId) });
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

  const handleAddRecurringExpenseDialogOpenChange = (nextOpen: boolean) => {
    setShowAddRecurringExpenseDialog(nextOpen);
    if (!nextOpen) {
      setCreateExpenseError(null);
    }
    setDeleteExpenseError(null);
  };

  const handleEditRecurringExpenseDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setEditingRecurringExpense(null);
    }
  };

  const handleCreateGroupCategory = async (payload: {
    name: string;
    section: CategorySection;
  }): Promise<ApiCategoryResponse> => {
    return createGroupCategoryMutation.mutateAsync(payload);
  };

  const handleDeleteGroupCategory = async (categoryId: number): Promise<void> => {
    await deleteGroupCategoryMutation.mutateAsync(categoryId);
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

  const groupSpendChart = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key: monthKey,
        label: format(date, "MMM"),
        amount: 0,
      };
    });

    const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

    expenses.forEach((expense) => {
      const date = new Date(expense.expense_date);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const bucket = bucketByKey.get(monthKey);
      if (!bucket) {
        return;
      }

      bucket.amount += Number(expense.amount) || 0;
    });

    const maxAmount = Math.max(...buckets.map((bucket) => bucket.amount), 1);

    return {
      maxAmount,
      bars: buckets.map((bucket) => ({
        ...bucket,
        heightPercent: bucket.amount > 0 ? Math.max((bucket.amount / maxAmount) * 100, 10) : 4,
      })),
    };
  }, [expenses]);

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

  const formatDateSafe = (dateValue: string) => {
    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime()) ? dateValue : format(parsedDate, "MMM d, yyyy");
  };

  const mapRecurringFrequencyLabel = (frequency: ApiRecurringExpenseResponse["frequency"]) => {
    if (frequency === "daily") {
      return t("addExpenseDialog.recurringDaily", { defaultValue: "Daily" });
    }
    if (frequency === "weekly") {
      return t("addExpenseDialog.recurringWeekly", { defaultValue: "Weekly" });
    }
    if (frequency === "monthly") {
      return t("addExpenseDialog.recurringMonthly", { defaultValue: "Monthly" });
    }
    if (frequency === "quarterly") {
      return t("addExpenseDialog.recurringQuarterly", { defaultValue: "Quarterly" });
    }
    return t("addExpenseDialog.recurringYearly", { defaultValue: "Yearly" });
  };

  const mapRecurringStatusLabel = (status: ApiRecurringExpenseResponse["status"]) => {
    if (status === "active") {
      return t("recurringExpenses.statusActive", { defaultValue: "Active" });
    }
    if (status === "paused") {
      return t("recurringExpenses.statusPaused", { defaultValue: "Paused" });
    }
    if (status === "ended") {
      return t("recurringExpenses.statusEnded", { defaultValue: "Ended" });
    }
    return t("recurringExpenses.statusArchived", { defaultValue: "Archived" });
  };

  const recurringActionsPending =
    updateRecurringMutation.isPending ||
    generateNowRecurringMutation.isPending ||
    pauseRecurringMutation.isPending ||
    resumeRecurringMutation.isPending ||
    archiveRecurringMutation.isPending ||
    deleteRecurringMutation.isPending;

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

  if (groupError || membersError || categoriesError || expensesError || !group) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {groupError?.message || membersError?.message || categoriesError?.message || expensesError?.message || t("common.somethingWentWrong")}
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
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12"
        >
          <div className="min-w-0 lg:col-span-8">
            <Link to={createPageUrl("Groups")} className="hidden sm:inline-flex">
              <Button variant="ghost" className="-ml-2 mb-3">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("groupDetailPage.backToGroups")}
              </Button>
            </Link>

            <div className="flex max-w-full flex-wrap items-center gap-2">
              <h1 className="max-w-full break-all text-3xl font-bold text-foreground md:text-4xl">
                {formatGroupName(group.name)}
              </h1>

              {isCurrentUserAdmin ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setShowEditGroupDialog(true)}
                  aria-label={t("groupDetailPage.editGroup")}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
            <p className="mt-2 max-w-3xl text-muted-foreground [overflow-wrap:anywhere]">
              {group.description || t("groupDetailPage.noDescription")} · {t("groupDetailPage.currencyLabel")}: {group.currency}
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-start gap-2 lg:col-span-4 lg:justify-end">
            <Button size="sm" variant="outline" asChild className="hidden sm:inline-flex">
              <Link to={`/receipt-scan?mode=group&groupId=${groupId}`}>
                <ScanSearch className="mr-2 h-4 w-4" />
                {t("groupDetailPage.scanReceipt")}
              </Link>
            </Button>
            <Button size="sm" className="hidden sm:inline-flex" onClick={() => setShowAddExpenseDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("groupDetailPage.addExpense")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="hidden sm:inline-flex"
              onClick={() => setShowAddRecurringExpenseDialog(true)}
            >
              <Repeat2 className="mr-2 h-4 w-4" />
              {t("groupDetailPage.addRecurringExpense", { defaultValue: "Add recurring" })}
            </Button>
          </div>
        </motion.div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <Card className="order-2 border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:order-1 lg:col-span-8">
            <CardContent className="p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {t("groupDetailPage.chartTitle", { defaultValue: "Group chart" })}
                </h2>
                <span className="text-xs text-muted-foreground">{group.currency}</span>
              </div>

              <div className="h-56 rounded-lg border border-border bg-background/50 p-4">
                <div className="flex h-full items-end gap-3">
                  {groupSpendChart.bars.map((bar) => (
                    <div key={bar.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div className="flex h-full w-full items-end">
                        <div className="w-full rounded-md bg-primary/70" style={{ height: `${bar.heightPercent}%` }} />
                      </div>
                      <p className="text-[11px] text-muted-foreground">{bar.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {t("groupDetailPage.chartDescription", {
                  defaultValue: "Monthly group expenses from the last 6 months.",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("groupDetailPage.chartPeak", { defaultValue: "Peak month" })}: {groupSpendChart.maxAmount.toFixed(2)} {group.currency}
              </p>
            </CardContent>
          </Card>

          <div className="order-1 lg:order-2 lg:col-span-4">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 lg:grid-cols-2">
              <Card className="aspect-square border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="flex h-full flex-col p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-center sm:gap-2">
                    <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs md:text-base">
                      {t("groupDetailPage.summaryMembers")}
                    </p>
                    <Users className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-[clamp(1rem,5.2vw,1.85rem)] font-bold leading-none text-foreground sm:text-3xl md:text-5xl">
                      {group.members_count ?? members.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="aspect-square border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="flex h-full flex-col p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-center sm:gap-2">
                    <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs md:text-base">
                      {t("groupDetailPage.summaryExpenses")}
                    </p>
                    <Wallet className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-[clamp(1rem,5.2vw,1.85rem)] font-bold leading-none text-foreground sm:text-3xl md:text-5xl">
                      {group.expenses_count ?? expenses.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="aspect-square border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="flex h-full flex-col p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-center sm:gap-2">
                    <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs md:text-base">
                      {t("groupDetailPage.summaryTotal")}
                    </p>
                    <Coins className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                      <p className="text-[clamp(0.95rem,4.6vw,1.5rem)] font-bold leading-none text-foreground sm:text-2xl md:text-4xl">
                        {Number(group.total_amount ?? 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-[10px] font-medium text-muted-foreground sm:text-xs md:mt-2 md:text-sm">
                        {group.currency}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="aspect-square border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <CardContent className="flex h-full flex-col p-2 sm:p-3">
                  <div className="flex items-center justify-center gap-1 text-center sm:gap-2">
                    <p className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs md:text-base">
                      {t("globalHeader.navRecurring", { defaultValue: "Recurring" })}
                    </p>
                    <Repeat2 className="h-3.5 w-3.5 shrink-0 text-primary sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-[clamp(1rem,5.2vw,1.85rem)] font-bold leading-none text-foreground sm:text-3xl md:text-5xl">
                      {recurringLoading ? "..." : recurringExpenses.length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="mb-4 md:hidden">
          <div className="grid grid-cols-4 gap-1">
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "expenses" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("expenses")}
            >
              {t("groupDetailPage.mobileTabExpenses", { defaultValue: "Expenses" })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "balances" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("balances")}
            >
              {t("groupDetailPage.mobileTabBalances", { defaultValue: "Balances" })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "recurring" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("recurring")}
            >
              {t("groupDetailPage.mobileTabRecurring", { defaultValue: "Recurring" })}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "members" ? "default" : "outline"}
              className="h-8 px-1 text-[11px]"
              onClick={() => setMobileSection("members")}
            >
              {t("groupDetailPage.mobileTabMembers", { defaultValue: "Members" })}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12">
          <div
            className={`order-2 space-y-6 md:col-span-1 lg:order-1 lg:col-span-3 ${
              mobileSection === "expenses" || mobileSection === "members" ? "hidden md:block" : ""
            }`}
          >
            <div className={mobileSection === "recurring" ? "hidden md:block" : ""}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {t("groupDetailPage.balanceBreakdownTitle")}
                </h2>
              </div>

              <div>
                {balancesLoading ? (
                  <p className="text-sm text-muted-foreground">{t("groupDetailPage.balanceSummaryLoading")}</p>
                ) : balancesError ? (
                  <p className="text-sm text-destructive">{t("groupDetailPage.balanceSummaryError")}</p>
                ) : (
                  <>
                    <div
                      className={`mb-4 rounded-lg border bg-card/80 p-3 shadow-sm backdrop-blur-sm ${
                        userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
                          ? "border-rose-200 bg-rose-50"
                          : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-border bg-background/60"
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">
                        {userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
                          ? t("groupDetailPage.balanceYouOwe")
                          : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
                            ? t("groupDetailPage.balanceOthersOweYou")
                            : t("groupDetailPage.balanceAllSettled")}
                      </p>
                      <p
                        className={`mt-1 text-2xl font-bold ${
                          userBalanceSummary.iOweOthers > userBalanceSummary.othersOweMe
                            ? "text-rose-700"
                            : userBalanceSummary.othersOweMe > userBalanceSummary.iOweOthers
                              ? "text-emerald-700"
                              : "text-foreground"
                        }`}
                      >
                        {Math.abs(userBalanceSummary.othersOweMe - userBalanceSummary.iOweOthers).toFixed(2)} {group.currency}
                      </p>
                    </div>

                    <p className="mb-3 text-sm text-muted-foreground">
                      {userBalanceSummary.unsettledCount === 0
                        ? t("groupDetailPage.balanceAllSettled")
                        : t("groupDetailPage.balanceOpenCount", {
                            count: userBalanceSummary.unsettledCount,
                          })}
                    </p>

                    {groupSettlementFeedback ? (
                      <p
                        className={`mb-3 text-sm ${
                          groupSettlementFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"
                        }`}
                      >
                        {groupSettlementFeedback.message}
                      </p>
                    ) : null}

                    {balanceRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("groupDetailPage.balanceNoBreakdownRows")}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {balanceRows.map((row) => (
                          <div key={row.userId} className="rounded-lg border border-border bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{row.memberName}</p>
                                <p className="truncate text-xs text-muted-foreground">{row.relationLabel}</p>
                              </div>
                              <p
                                className={`whitespace-nowrap text-sm font-semibold ${
                                  row.amount > 0 ? "text-emerald-700" : row.amount < 0 ? "text-rose-700" : "text-foreground"
                                }`}
                              >
                                {row.absoluteAmount.toFixed(2)} {group.currency}
                              </p>
                            </div>

                            {row.amount < 0 ? (
                              <div className="flex">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSettlementDialogTarget({
                                      userId: row.userId,
                                      memberName: row.memberName,
                                      absoluteAmount: row.absoluteAmount,
                                    });
                                  }}
                                >
                                  {t("groupDetailPage.settle", { defaultValue: "Settle" })}
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6">
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
                      <div key={settlement.id} className="rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm">
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
              </div>
            </div>

            <div className={mobileSection === "balances" ? "hidden md:block" : ""}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  {t("globalHeader.navRecurring", { defaultValue: "Recurring" })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {recurringExpenses.filter((series) => series.status === "active").length}/{recurringExpenses.length}
                </p>
              </div>

              {recurringLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : recurringError ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
                  {(recurringError as Error).message || t("common.somethingWentWrong")}
                </p>
              ) : recurringExpenses.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                  {t("recurringExpenses.empty", {
                    defaultValue: "No recurring expenses yet. Use the Add recurring action to create your first series.",
                  })}
                </p>
              ) : (
                <div className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
                  {recurringExpenses.map((series) => (
                    <div
                      key={series.id}
                      className="group overflow-hidden rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Repeat2 className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold leading-tight text-foreground">{series.title}</p>

                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("recurringExpenses.cardAmount", { defaultValue: "Amount" })}: {Number(series.amount).toFixed(2)} {series.currency}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardFrequency", { defaultValue: "Frequency" })}: {mapRecurringFrequencyLabel(series.frequency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardInterval", { defaultValue: "Every {{count}} periods", count: series.interval_count })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.cardStatus", { defaultValue: "Status" })}: {mapRecurringStatusLabel(series.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("recurringExpenses.nextDue", { defaultValue: "Next due" })}: {formatDateSafe(series.next_due_on)}
                          </p>

                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 h-7 px-2 text-[11px]"
                            onClick={() => setEditingRecurringExpense(series)}
                          >
                            {t("recurringExpenses.editSeries", { defaultValue: "Edit / Manage" })}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`order-1 md:col-span-2 lg:order-2 lg:col-span-6 ${mobileSection !== "expenses" ? "hidden md:block" : ""}`}>
            <div className="mx-auto mb-3 flex w-full max-w-xl items-center justify-between gap-2 md:max-w-2xl lg:max-w-5xl">
              <h2 className="text-xl font-semibold text-foreground">{t("groupDetailPage.expensesSection")}</h2>
            </div>
            <div className="mx-auto w-full max-w-xl md:max-w-2xl lg:max-w-5xl">
              <GroupExpensesList
                expenses={expenses}
                categories={categories}
                memberNameById={memberNameById}
                currentUserId={user.id}
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
            </div>

            {deleteExpenseError ? (
              <p className="mt-3 text-sm text-destructive">{deleteExpenseError}</p>
            ) : null}

            {hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="w-full md:w-auto"
                >
                  {isFetchingNextPage ? t("groupDetailPage.loadingMore") : t("groupDetailPage.loadMore")}
                </Button>
              </div>
            )}
          </div>

          <div className={`order-3 space-y-4 md:col-span-1 lg:col-span-3 ${mobileSection !== "members" ? "hidden md:block" : ""}`}>
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
              canRemoveMembers={false}
              grantPendingUserId={grantAdminMutation.isPending ? grantAdminMutation.variables ?? null : null}
              removePendingUserId={removeMemberMutation.isPending ? removeMemberMutation.variables ?? null : null}
              leavePending={leaveGroupMutation.isPending}
              onGrantAdmin={(userId) => grantAdminMutation.mutate(userId)}
              onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
              onLeaveGroup={() => leaveGroupMutation.mutate()}
              isLoading={false}
            />

            {isCurrentUserAdmin && (
              <div>
                <h3 className="mb-3 text-base font-semibold text-foreground">
                  {t("groupDetailPage.pendingInvitations")}
                </h3>

                {pendingInvitationsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : pendingInvitationsError ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
                    {pendingInvitationsError.message || t("common.somethingWentWrong")}
                  </p>
                ) : pendingInvitations.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    {t("groupDetailPage.noPendingInvitations")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
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
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <SpeedDial
          onAddExpense={() => setShowAddExpenseDialog(true)}
          onAddRecurringExpense={() => setShowAddRecurringExpenseDialog(true)}
          onScanReceipt={() => navigate(`/receipt-scan?mode=group&groupId=${groupId}`)}
          addExpenseLabel={t("groupDetailPage.addExpense")}
          addRecurringExpenseLabel={t("groupDetailPage.addRecurringExpense", { defaultValue: "Add recurring" })}
          scanReceiptLabel={t("groupDetailPage.scanReceipt")}
        />
      </div>

      <Dialog
        open={settlementDialogTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSettlementDialogTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("groupDetailPage.settle", { defaultValue: "Settle" })}</DialogTitle>
            <DialogDescription>
              {settlementDialogTarget
                ? t("groupDetailPage.settlementDialogDescription", {
                    defaultValue: "Choose how to settle with {{member}}.",
                    member: settlementDialogTarget.memberName,
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                !settlementDialogTarget ||
                (settleGroupCashMutation.isPending &&
                  settleGroupCashMutation.variables === settlementDialogTarget.userId)
              }
              onClick={() => {
                if (!settlementDialogTarget) {
                  return;
                }

                setOutsideAppConfirmTarget({
                  userId: settlementDialogTarget.userId,
                  absoluteAmount: settlementDialogTarget.absoluteAmount,
                });
                setSettlementDialogTarget(null);
              }}
            >
              {settleGroupCashMutation.isPending
                ? t("groupDetailPage.settlingCash")
                : t("groupDetailPage.settleOutsideApp", { defaultValue: "Settle outside app" })}
            </Button>

            {isPayPalSdkEnabled ? (
              <div className="w-[165px]">
                <PayPalCurrencyButtons
                  currency={group.currency}
                  fundingSource="paypal"
                  style={{ layout: "horizontal", tagline: false, height: 34 }}
                  forceReRender={[settlementDialogTarget?.userId ?? 0, groupId]}
                  createOrder={async () => {
                    if (!settlementDialogTarget) {
                      throw new Error("Missing settlement target");
                    }

                    try {
                      return await createGroupPayPalOrder(settlementDialogTarget.userId);
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
                    if (!data.orderID || !settlementDialogTarget) {
                      setGroupSettlementFeedback({
                        tone: "error",
                        message: t("groupDetailPage.settlementErrors.paypalInitFailed"),
                      });
                      return;
                    }

                    try {
                      await finalizeGroupPayPalOrder(data.orderID, settlementDialogTarget.userId);
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
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={outsideAppConfirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOutsideAppConfirmTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("groupDetailPage.settlementOutsideConfirmTitle", {
                defaultValue: "Record settlement outside the app?",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {outsideAppConfirmTarget
                ? t("groupDetailPage.settlementOutsideConfirmDescription", {
                    defaultValue:
                      "Are you sure you want to record settlement outside the app for {{amount}} {{currency}}?",
                    amount: outsideAppConfirmTarget.absoluteAmount.toFixed(2),
                    currency: group.currency,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", { defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !outsideAppConfirmTarget ||
                (settleGroupCashMutation.isPending &&
                  settleGroupCashMutation.variables === outsideAppConfirmTarget.userId)
              }
              onClick={() => {
                if (!outsideAppConfirmTarget) {
                  return;
                }

                settleGroupCashMutation.mutate(outsideAppConfirmTarget.userId);
              }}
            >
              {settleGroupCashMutation.isPending
                ? t("groupDetailPage.settlingCash")
                : t("groupDetailPage.settlementOutsideConfirmAction", {
                    defaultValue: "Record settlement",
                  })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditGroupDialog
        open={showEditGroupDialog}
        group={group}
        onOpenChange={(nextOpen) => {
          setShowEditGroupDialog(nextOpen);
          if (!nextOpen) {
            setEditGroupError(null);
          }
        }}
        onSubmit={(payload) => updateGroupMutation.mutate(payload)}
        onArchive={() => updateGroupMutation.mutate({ status: "archived" })}
        isLoading={updateGroupMutation.isPending}
        isArchiving={updateGroupMutation.isPending}
        errorMessage={editGroupError}
      />

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
        onCreateGroupCategory={isCurrentUserAdmin ? handleCreateGroupCategory : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? handleDeleteGroupCategory : undefined}
        isLoading={createExpenseMutation.isPending}
        categories={categories}
        members={members}
        groupCurrency={group.currency}
        errorMessage={createExpenseError}
        mode="create"
        expense={null}
      />

      <AddGroupRecurringExpenseDialog
        open={showAddRecurringExpenseDialog}
        onOpenChange={handleAddRecurringExpenseDialogOpenChange}
        onSubmit={(payload) => createRecurringExpenseMutation.mutate(payload)}
        onCreateGroupCategory={isCurrentUserAdmin ? handleCreateGroupCategory : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? handleDeleteGroupCategory : undefined}
        isLoading={createRecurringExpenseMutation.isPending}
        categories={categories}
        members={members}
        groupCurrency={group.currency}
        errorMessage={createExpenseError}
      />

      <EditRecurringExpenseDialog
        open={!!editingRecurringExpense}
        recurringExpense={editingRecurringExpense}
        categories={categories}
        isSaving={updateRecurringMutation.isPending}
        isActionPending={recurringActionsPending}
        onOpenChange={handleEditRecurringExpenseDialogOpenChange}
        onSubmit={(payload) => {
          if (!editingRecurringExpense) {
            return;
          }

          updateRecurringMutation.mutate({
            recurringExpenseId: editingRecurringExpense.id,
            payload,
          });
        }}
        onGenerateNow={() => {
          if (!editingRecurringExpense) {
            return;
          }

          generateNowRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onPause={() => {
          if (!editingRecurringExpense) {
            return;
          }

          pauseRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onResume={() => {
          if (!editingRecurringExpense) {
            return;
          }

          resumeRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onArchive={() => {
          if (!editingRecurringExpense) {
            return;
          }

          archiveRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onDelete={() => {
          if (!editingRecurringExpense) {
            return;
          }

          deleteRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onCreateCustomCategory={isCurrentUserAdmin ? handleCreateGroupCategory : undefined}
        onDeleteCustomCategory={isCurrentUserAdmin ? handleDeleteGroupCategory : undefined}
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
        onCreateGroupCategory={isCurrentUserAdmin ? handleCreateGroupCategory : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? handleDeleteGroupCategory : undefined}
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
