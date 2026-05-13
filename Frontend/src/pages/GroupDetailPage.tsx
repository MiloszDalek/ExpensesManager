import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PageInfoButton from "@/components/help/PageInfoButton";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import SpeedDial from "@/components/ui/speed-dial";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils/url";
import type { CurrencyEnum } from "@/types/enums";
import { useGroupData } from "@/hooks/groupDetail/useGroupData";
import { useGroupExpenses } from "@/hooks/groupDetail/useGroupExpenses";
import { useGroupRecurring } from "@/hooks/groupDetail/useGroupRecurring";
import { useGroupSettlements } from "@/hooks/groupDetail/useGroupSettlements";
import GroupHeader from "@/components/groupDetail/GroupHeader";
import GroupSummaryCards from "@/components/groupDetail/GroupSummaryCards";
import GroupBalancesPanel from "@/components/groupDetail/GroupBalancesPanel";
import GroupSettlementsList from "@/components/groupDetail/GroupSettlementsList";
import GroupRecurringList from "@/components/groupDetail/GroupRecurringList";
import GroupMembersSection from "@/components/groupDetail/GroupMembersSection";
import GroupSettlementDialog from "@/components/groupDetail/GroupSettlementDialog";
import GroupSettlementConfirmDialog from "@/components/groupDetail/GroupSettlementConfirmDialog";
import GroupExpensesList from "@/components/groups/GroupExpensesList";
import { GroupSpendingTrendChart } from "@/components/groups/GroupSpendingTrendChart";
import AddGroupMemberDialog from "@/components/groups/AddGroupMemberDialog";
import AddGroupExpenseDialog from "@/components/groups/AddGroupExpenseDialog";
import AddGroupRecurringExpenseDialog from "@/components/groups/AddGroupRecurringExpenseDialog";
import EditRecurringExpenseDialog from "@/components/expenses/EditRecurringExpenseDialog";
import EditGroupDialog from "@/components/groups/EditGroupDialog";

export default function GroupDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const groupData = useGroupData();
  const {
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
    inviteMemberMutation,
    grantAdminMutation,
    removeMemberMutation,
    leaveGroupMutation,
    cancelInvitationMutation,
    updateGroupMutation,
    createGroupCategoryMutation,
    deleteGroupCategoryMutation,
  } = groupData;

  const groupExpenses = useGroupExpenses(groupId, canLoadGroupData);
  const {
    expenses,
    expensesLoading,
    expensesError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    createExpenseError,
    setCreateExpenseError,
    editExpenseError,
    setEditExpenseError,
    deleteExpenseError,
    setDeleteExpenseError,
    editingExpense,
    setEditingExpense,
    createExpenseMutation,
    updateExpenseMutation,
    deleteExpenseMutation,
  } = groupExpenses;

  const groupRecurring = useGroupRecurring(groupId, canLoadGroupData);
  const {
    recurringExpenses,
    recurringLoading,
    recurringError,
    editingRecurringExpense,
    setEditingRecurringExpense,
    createRecurringExpenseMutation,
    updateRecurringMutation,
    generateNowRecurringMutation,
    pauseRecurringMutation,
    resumeRecurringMutation,
    archiveRecurringMutation,
    recurringActionsPending,
    mapRecurringFrequencyLabel,
    mapRecurringStatusLabel,
    formatDateSafe,
  } = groupRecurring;

  const memberNameById = members.reduce<Record<number, string>>((acc, member) => {
    acc[member.user_id] = member.username;
    return acc;
  }, {});

  const groupSettlements = useGroupSettlements(groupId, canLoadGroupData, user?.id, memberNameById);
  const {
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
    isPayPalProcessing,
    createGroupPayPalOrder,
    finalizeGroupPayPalOrder,
    settleGroupCashMutation,
    mapPayPalSettlementError,
  } = groupSettlements;

  const [mobileSection, setMobileSection] = useState<"expenses" | "balances" | "recurring" | "members">(
    searchParams.get("tab") === "recurring" ? "recurring" :
    searchParams.get("tab") === "balances" ? "balances" :
    searchParams.get("tab") === "members" ? "members" :
    "expenses"
  );

  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showAddRecurringExpenseDialog, setShowAddRecurringExpenseDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);

  const pendingInvitationUserIds = pendingInvitations
    .filter((inv) => inv.status === "pending")
    .map((inv) => inv.to_user_id);

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

  if (isAccessDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold text-foreground">{t("groupDetailPage.accessDeniedTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("groupDetailPage.accessDeniedDescription")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("groupDetailPage.accessDeniedHint")}</p>
            <div className="mt-4 flex justify-center">
              <Button asChild>
                <Link to={createPageUrl("Groups")}>{t("groupDetailPage.backToGroups")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || groupLoading || membersLoading || categoriesLoading || expensesLoading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if ((groupError && !isAccessDenied) || membersError || categoriesError || expensesError || !group) {
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
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute top-4 right-4 flex items-center gap-2 md:hidden">
        <PageInfoButton pageKey="groupDetail" autoOpen={true} />
      </div>
      <div className="mx-auto max-w-7xl">
        <GroupHeader
          group={group}
          groupId={groupId}
          isCurrentUserAdmin={isCurrentUserAdmin}
          onEditGroup={() => setShowEditGroupDialog(true)}
          onAddExpense={() => setShowAddExpenseDialog(true)}
          onAddRecurringExpense={() => setShowAddRecurringExpenseDialog(true)}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-8">
            <GroupSpendingTrendChart
              groupId={groupId}
              currency={group.currency as CurrencyEnum}
            />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-4">
            <GroupSummaryCards
              membersCount={group.members_count ?? members.length}
              expensesCount={group.expenses_count ?? expenses.length}
              totalAmount={Number(group.total_amount ?? 0)}
              currency={group.currency}
              recurringCount={recurringExpenses.length}
              recurringLoading={recurringLoading}
            />
          </div>
        </div>

        <div className="mb-4 md:hidden">
          <div className="grid grid-cols-4 gap-1">
            {(["expenses", "balances", "recurring", "members"] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                size="sm"
                variant={mobileSection === tab ? "default" : "outline"}
                className={`h-8 px-1 text-[11px] border border-border ${
                  mobileSection === tab ? "bg-primary text-primary-foreground" : "bg-card/80"
                }`}
                onClick={() => setMobileSection(tab)}
              >
                {t(`groupDetailPage.mobileTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
              </Button>
            ))}
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
                <h2 className="text-xl font-semibold text-foreground hidden md:block">
                  {t("groupDetailPage.balanceBreakdownTitle")}
                </h2>
              </div>
              <GroupBalancesPanel
                userBalanceSummary={userBalanceSummary}
                balanceRows={balanceRows}
                groupSettlementFeedback={groupSettlementFeedback}
                balancesLoading={balancesLoading}
                balancesError={balancesError}
                currency={group.currency}
                onSettle={(target) => setSettlementDialogTarget(target)}
              />

              <div className="mt-6">
                <h3 className="mb-3 text-base font-semibold text-foreground">
                  {t("groupDetailPage.settlementsSection")}
                </h3>
                <GroupSettlementsList
                  settlements={completedSettlements}
                  settlementsLoading={settlementsLoading}
                  settlementsError={settlementsError}
                  getMemberDisplayName={getMemberDisplayName}
                  getSettlementMethodLabel={getSettlementMethodLabel}
                />
              </div>
            </div>

            <div className={mobileSection === "balances" ? "hidden md:block" : ""}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground hidden md:block">
                  {t("globalHeader.navRecurring")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {recurringExpenses.filter((s) => s.status === "active").length}/{recurringExpenses.length}
                </p>
              </div>
              <GroupRecurringList
                recurringExpenses={recurringExpenses}
                recurringLoading={recurringLoading}
                recurringError={recurringError}
                mapFrequencyLabel={mapRecurringFrequencyLabel}
                mapStatusLabel={mapRecurringStatusLabel}
                formatDate={formatDateSafe}
                onEdit={(series) => setEditingRecurringExpense(series)}
              />
            </div>
          </div>

          <div className={`order-1 md:col-span-2 lg:order-2 lg:col-span-6 ${mobileSection !== "expenses" ? "hidden md:block" : ""}`}>
            <div className="mx-auto mb-3 flex w-full max-w-xl items-center justify-between gap-2 md:max-w-2xl lg:max-w-5xl">
              <h2 className="text-xl font-semibold text-foreground hidden md:block">{t("groupDetailPage.expensesSection")}</h2>
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
                onDelete={(expenseId) => deleteExpenseMutation.mutate(expenseId)}
                canManageExpense={(expense) => isCurrentUserAdmin || expense.user_id === user.id}
              />
            </div>
            {deleteExpenseError ? <p className="mt-3 text-sm text-destructive">{deleteExpenseError}</p> : null}
            {hasNextPage && (
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="w-full md:w-auto border border-border bg-card/80"
                >
                  {isFetchingNextPage ? t("groupDetailPage.loadingMore") : t("groupDetailPage.loadMore")}
                </Button>
              </div>
            )}
          </div>

          <div className={`order-3 space-y-4 md:col-span-1 lg:col-span-3 ${mobileSection !== "members" ? "hidden md:block" : ""}`}>
            <GroupMembersSection
              members={members}
              currentUserId={user.id}
              isCurrentUserAdmin={isCurrentUserAdmin}
              canManageMembers={isCurrentUserAdmin}
              onGrantAdmin={(userId) => grantAdminMutation.mutate(userId)}
              onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
              onLeaveGroup={() => leaveGroupMutation.mutate()}
              grantPendingUserId={grantAdminMutation.isPending ? grantAdminMutation.variables ?? null : null}
              removePendingUserId={removeMemberMutation.isPending ? removeMemberMutation.variables ?? null : null}
              leavePending={leaveGroupMutation.isPending}
              onAddMember={() => setShowAddMemberDialog(true)}
              pendingInvitations={pendingInvitations}
              pendingInvitationsLoading={pendingInvitationsLoading}
              pendingInvitationsError={pendingInvitationsError}
              onCancelInvitation={(invitationId) => cancelInvitationMutation.mutate(invitationId)}
              cancelInvitationPending={cancelInvitationMutation.isPending}
              cancelInvitationTargetId={cancelInvitationMutation.variables}
            />
          </div>
        </div>
      </div>

      <div className="sm:hidden">
        <SpeedDial
          onAddExpense={() => setShowAddExpenseDialog(true)}
          onAddRecurringExpense={() => setShowAddRecurringExpenseDialog(true)}
          onScanReceipt={() => window.location.href = `/receipt-scan?mode=group&groupId=${groupId}`}
          addExpenseLabel={t("groupDetailPage.addExpense")}
          addRecurringExpenseLabel={t("groupDetailPage.addRecurringExpense")}
          scanReceiptLabel={t("groupDetailPage.scanReceipt")}
        />
      </div>

      <GroupSettlementDialog
        open={settlementDialogTarget !== null}
        onOpenChange={(open) => { if (!open) setSettlementDialogTarget(null); }}
        memberName={settlementDialogTarget?.memberName}
        currency={group.currency}
        groupId={groupId}
        userId={settlementDialogTarget?.userId}
        settleCashPending={settleGroupCashMutation.isPending}
        isPayPalButtonEnabled={isPayPalButtonEnabled}
        isPayPalProcessing={isPayPalProcessing}
        getPayPalUnavailableMessage={getPayPalUnavailableMessage}
        onCashClick={() => {
          if (!settlementDialogTarget) return;
          setOutsideAppConfirmTarget({
            userId: settlementDialogTarget.userId,
            absoluteAmount: settlementDialogTarget.absoluteAmount,
          });
          setSettlementDialogTarget(null);
        }}
        onPayPalCreateOrder={async () => {
          if (!settlementDialogTarget) throw new Error("Missing settlement target");
          try {
            return await createGroupPayPalOrder(settlementDialogTarget.userId);
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            setGroupSettlementFeedback({ tone: "error", message: mapPayPalSettlementError(message) });
            throw error;
          }
        }}
        onPayPalApprove={async (data) => {
          if (!data.orderID || !settlementDialogTarget) {
            setGroupSettlementFeedback({ tone: "error", message: t("groupDetailPage.settlementErrors.paypalInitFailed") });
            return;
          }
          try {
            await finalizeGroupPayPalOrder(data.orderID, settlementDialogTarget.userId);
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            setGroupSettlementFeedback({ tone: "error", message: mapPayPalSettlementError(message) });
          }
        }}
        onPayPalCancel={() => {
          setGroupSettlementFeedback({ tone: "error", message: t("groupDetailPage.settlementErrors.paypalCancelled") });
        }}
        onPayPalError={(error) => {
          const message = error instanceof Error ? error.message : undefined;
          setGroupSettlementFeedback({ tone: "error", message: mapPayPalSettlementError(message) });
        }}
      />

      <GroupSettlementConfirmDialog
        open={outsideAppConfirmTarget !== null}
        onOpenChange={(open) => { if (!open) setOutsideAppConfirmTarget(null); }}
        amount={outsideAppConfirmTarget?.absoluteAmount ?? 0}
        currency={group.currency}
        userId={outsideAppConfirmTarget?.userId}
        settleCashPending={
          settleGroupCashMutation.isPending &&
          settleGroupCashMutation.variables === outsideAppConfirmTarget?.userId
        }
        onConfirm={() => {
          if (!outsideAppConfirmTarget) return;
          settleGroupCashMutation.mutate(outsideAppConfirmTarget.userId);
        }}
      />

      <EditGroupDialog
        open={showEditGroupDialog}
        group={group}
        onOpenChange={(nextOpen) => {
          setShowEditGroupDialog(nextOpen);
          if (!nextOpen) setEditGroupError(null);
        }}
        onSubmit={(payload) => updateGroupMutation.mutate(payload)}
        onArchive={() => updateGroupMutation.mutate({ status: "archived" })}
        isLoading={updateGroupMutation.isPending}
        isArchiving={updateGroupMutation.isPending}
        errorMessage={editGroupError}
      />

      <AddGroupMemberDialog
        open={showAddMemberDialog}
        onOpenChange={(nextOpen) => {
          setShowAddMemberDialog(nextOpen);
          setInviteMemberError(null);
        }}
        contacts={contacts}
        members={members}
        pendingInvitationUserIds={pendingInvitationUserIds}
        isSubmitting={inviteMemberMutation.isPending || contactsLoading}
        errorMessage={inviteMemberError}
        onInviteByContact={async (toUserId) => {
          await inviteMemberMutation.mutateAsync({ group_id: groupId, to_user_id: toUserId });
        }}
        onInviteByEmail={async (email) => {
          await inviteMemberMutation.mutateAsync({ group_id: groupId, to_user_email: email });
        }}
      />

      <AddGroupExpenseDialog
        open={showAddExpenseDialog}
        onOpenChange={(nextOpen) => {
          setShowAddExpenseDialog(nextOpen);
          if (!nextOpen) setCreateExpenseError(null);
          setDeleteExpenseError(null);
        }}
        onSubmit={(data) => createExpenseMutation.mutate(data)}
        onCreateGroupCategory={isCurrentUserAdmin ? (payload) => createGroupCategoryMutation.mutateAsync(payload) : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? (categoryId) => deleteGroupCategoryMutation.mutateAsync(categoryId) : undefined}
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
        onOpenChange={(nextOpen) => {
          setShowAddRecurringExpenseDialog(nextOpen);
          if (!nextOpen) setCreateExpenseError(null);
          setDeleteExpenseError(null);
        }}
        onSubmit={(payload) => createRecurringExpenseMutation.mutate(payload)}
        onCreateGroupCategory={isCurrentUserAdmin ? (payload) => createGroupCategoryMutation.mutateAsync(payload) : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? (categoryId) => deleteGroupCategoryMutation.mutateAsync(categoryId) : undefined}
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
        onOpenChange={(nextOpen) => { if (!nextOpen) setEditingRecurringExpense(null); }}
        onSubmit={(payload) => {
          if (!editingRecurringExpense) return;
          updateRecurringMutation.mutate({ recurringExpenseId: editingRecurringExpense.id, payload });
        }}
        onGenerateNow={() => {
          if (!editingRecurringExpense) return;
          generateNowRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onPause={() => {
          if (!editingRecurringExpense) return;
          pauseRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onResume={() => {
          if (!editingRecurringExpense) return;
          resumeRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onArchive={() => {
          if (!editingRecurringExpense) return;
          archiveRecurringMutation.mutate(editingRecurringExpense.id);
        }}
        onCreateCustomCategory={isCurrentUserAdmin ? (payload) => createGroupCategoryMutation.mutateAsync(payload) : undefined}
        onDeleteCustomCategory={isCurrentUserAdmin ? (categoryId) => deleteGroupCategoryMutation.mutateAsync(categoryId) : undefined}
      />

      <AddGroupExpenseDialog
        open={!!editingExpense}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setEditingExpense(null);
            setEditExpenseError(null);
          }
          setDeleteExpenseError(null);
        }}
        onSubmit={(data) => {
          if (!editingExpense) return;
          updateExpenseMutation.mutate({ expenseId: editingExpense.id, payload: data });
        }}
        onCreateGroupCategory={isCurrentUserAdmin ? (payload) => createGroupCategoryMutation.mutateAsync(payload) : undefined}
        onDeleteGroupCategory={isCurrentUserAdmin ? (categoryId) => deleteGroupCategoryMutation.mutateAsync(categoryId) : undefined}
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
