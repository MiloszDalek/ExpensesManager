import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { contactsApi } from "@/api/contactsApi";
import { invitationsApi } from "@/api/invitationsApi";
import { categoriesApi } from "@/api/categoriesApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import type {
  ApiGroupResponse,
  ApiGroupMemberResponse,
  ApiContactResponse,
  ApiInvitationResponse,
  ApiCategoryResponse,
  ApiGroupInvitationCreate,
  ApiGroupUpdate,
} from "@/types";

const CONTACTS_LIMIT = 100;

const getErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

function mapGroupInvitationError(t: (key: string) => string, message: string | undefined) {
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

function mapGroupUpdateError(t: (key: string) => string, message: string | undefined) {
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

export function useGroupData() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [inviteMemberError, setInviteMemberError] = useState<string | null>(null);
  const [editGroupError, setEditGroupError] = useState<string | null>(null);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);

  const groupId = Number(id);
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0;
  const canQueryGroup = !!user && isValidGroupId;

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
    enabled: canQueryGroup,
    retry: (failureCount, error) => {
      const status = getErrorStatus(error);
      if (status === 403 || status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const groupErrorStatus = getErrorStatus(groupError);
  const isAccessDenied = groupErrorStatus === 403 || groupErrorStatus === 404;
  const canLoadGroupData = canQueryGroup && !isAccessDenied && !!group && !isLeavingGroup;

  const {
    data: members = [],
    isLoading: membersLoading,
    error: membersError,
  } = useQuery<ApiGroupMemberResponse[]>({
    queryKey: queryKeys.groups.members(groupId),
    queryFn: () => groupsApi.members(groupId),
    enabled: canLoadGroupData,
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
    enabled: canLoadGroupData && isCurrentUserAdmin,
  });

  const {
    data: pendingInvitations = [],
    isLoading: pendingInvitationsLoading,
    error: pendingInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: groupPendingInvitationsQueryKey,
    queryFn: () => invitationsApi.listGroupPending(groupId, { limit: 100, offset: 0 }),
    enabled: canLoadGroupData && isCurrentUserAdmin,
  });

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery<ApiCategoryResponse[]>({
    queryKey: queryKeys.categories.availableGroup(groupId),
    queryFn: () => categoriesApi.getAvailableGroup(groupId),
    enabled: canLoadGroupData,
  });

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
    },
    onError: (mutationError) => {
      setInviteMemberError(mapGroupInvitationError(t, mutationError.message));
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
    onMutate: async () => {
      setIsLeavingGroup(true);
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.groups.byId(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.groups.members(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.categories.availableGroup(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.balances.group(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.groupExpenses.list(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.settlements.group(groupId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.recurringExpenses.list({ scope: "group", group_id: groupId }) }),
        queryClient.cancelQueries({ queryKey: groupPendingInvitationsQueryKey }),
      ]);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.groups.byId(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groups.members(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.categories.availableGroup(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.balances.group(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.groupExpenses.list(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.settlements.group(groupId) });
      queryClient.removeQueries({ queryKey: queryKeys.recurringExpenses.list({ scope: "group", group_id: groupId }) });
      queryClient.removeQueries({ queryKey: groupPendingInvitationsQueryKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      navigate(createPageUrl("Groups"));
    },
    onError: () => {
      setIsLeavingGroup(false);
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
    },
    onError: (mutationError) => {
      setEditGroupError(mapGroupUpdateError(t, mutationError.message));
    },
  });

  const createGroupCategoryMutation = useMutation<
    ApiCategoryResponse,
    Error,
    { name: string; section: import("@/types/enums").CategorySection }
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

  return {
    groupId,
    isValidGroupId,
    isAccessDenied,
    canLoadGroupData,
    group,
    groupLoading,
    groupError,
    members,
    membersLoading,
    membersError,
    currentMember,
    isCurrentUserAdmin,
    contacts,
    contactsLoading,
    pendingInvitations,
    pendingInvitationsLoading,
    pendingInvitationsError,
    categories,
    categoriesLoading,
    categoriesError,
    inviteMemberError,
    setInviteMemberError,
    editGroupError,
    setEditGroupError,
    isLeavingGroup,
    inviteMemberMutation,
    grantAdminMutation,
    removeMemberMutation,
    leaveGroupMutation,
    cancelInvitationMutation,
    updateGroupMutation,
    createGroupCategoryMutation,
    deleteGroupCategoryMutation,
  };
}
