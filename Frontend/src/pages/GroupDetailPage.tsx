import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Wallet, Coins, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import GroupMembersPanel from "@/components/groups/GroupMembersPanel";
import GroupExpensesList from "@/components/groups/GroupExpensesList";
import AddGroupMemberDialog from "@/components/groups/AddGroupMemberDialog";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { expensesGroupApi } from "@/api/expensesGroupApi";
import { categoriesApi } from "@/api/categoriesApi";
import { contactsApi } from "@/api/contactsApi";
import { invitationsApi } from "@/api/invitationsApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";

import type {
  ApiContactResponse,
  ApiGroupExpenseResponse,
  ApiGroupInvitationCreate,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ApiInvitationResponse,
  ApiCategoryResponse,
} from "@/types";

const LIMIT = 20;
const CONTACTS_LIMIT = 100;

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { id } = useParams();
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);

  const groupId = Number(id);
  const isValidGroupId = Number.isInteger(groupId) && groupId > 0;

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
    queryKey: queryKeys.invitations.groupPending(groupId, { limit: 100, offset: 0 }),
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

  const expenses = useMemo(() => expensePages?.pages.flatMap((page) => page) ?? [], [expensePages]);

  const inviteMemberMutation = useMutation<ApiInvitationResponse, Error, ApiGroupInvitationCreate>({
    mutationFn: (payload) => invitationsApi.sendToGroup(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invitations", "group", groupId, "pending"] });
      setShowAddMemberDialog(false);
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
    },
  });

  const leaveGroupMutation = useMutation<void, Error>({
    mutationFn: () => groupsApi.leaveGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      navigate(createPageUrl("Groups"));
    },
  });

  const cancelInvitationMutation = useMutation<ApiInvitationResponse, Error, number>({
    mutationFn: (invitationId) => invitationsApi.cancel(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["invitations", "group", groupId, "pending"] });
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

  const memberNameById = useMemo(() => {
    return members.reduce<Record<number, string>>((accumulator, member) => {
      accumulator[member.user_id] = member.username;
      return accumulator;
    }, {});
  }, [members]);

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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-xl font-semibold text-foreground">{t("groupDetailPage.expensesSection")}</h2>
            <GroupExpensesList
              expenses={expenses}
              categories={categories}
              memberNameById={memberNameById}
              fallbackCurrency={group.currency}
              isLoading={false}
            />

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
        onOpenChange={setShowAddMemberDialog}
        contacts={contacts}
        members={members}
        isSubmitting={inviteMemberMutation.isPending || contactsLoading}
        onInviteByContact={handleInviteByContact}
        onInviteByEmail={handleInviteByEmail}
      />
    </div>
  );
}
