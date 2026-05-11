import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LoadingSpinnerWrapper } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import PageInfoButton from "@/components/help/PageInfoButton";
import { useAuth } from "@/contexts/AuthContext";
import { createPageUrl } from "@/utils/url";
import { useContactsData } from "@/hooks/contacts/useContactsData";
import { useInvitations } from "@/hooks/contacts/useInvitations";
import { useSettlements } from "@/hooks/contacts/useSettlements";
import ContactsList from "@/components/contacts/ContactsList";
import InvitationsPanel from "@/components/contacts/InvitationsPanel";
import TotalSettlementDialog from "@/components/contacts/TotalSettlementDialog";
import GroupSettlementDialog from "@/components/contacts/GroupSettlementDialog";
import TotalSettlementConfirmDialog from "@/components/contacts/TotalSettlementConfirmDialog";
import GroupSettlementConfirmDialog from "@/components/contacts/GroupSettlementConfirmDialog";

export default function ContactsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [mobileSection, setMobileSection] = useState<"contacts" | "invitations">("contacts");

  const contactsData = useContactsData();
  const invitations = useInvitations();
  const settlements = useSettlements(contactsData.groupById);

  if (!user || contactsData.contactsLoading || contactsData.groupsLoading) {
    return <LoadingSpinnerWrapper className="h-screen" />;
  }

  if (contactsData.contactsError || contactsData.groupsError) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {contactsData.contactsError?.message || contactsData.groupsError?.message || t("common.somethingWentWrong")}
          </p>
          <Link to={createPageUrl("Dashboard")} className="mt-4 inline-block">
            <Button variant="outline">{t("contactsBalancesPage.backToDashboard")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex max-w-full flex-wrap items-center justify-between gap-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("contactsBalancesPage.title")}</h1>
              <PageInfoButton pageKey="contacts" autoOpen={true} className="lg:hidden" />
            </div>
            <p className="mt-2 text-muted-foreground">{t("contactsBalancesPage.subtitle")}</p>
          </div>
          <PageInfoButton pageKey="contacts" autoOpen={true} className="hidden lg:inline-flex" />
        </div>

        <div className="mb-4 lg:hidden">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "contacts" ? "default" : "outline"}
              className={`h-8 px-2 text-sm ${mobileSection !== "contacts" ? "border border-border bg-card/80" : ""}`}
              onClick={() => setMobileSection("contacts")}
            >
              {t("contactsBalancesPage.mobileTabContacts")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "invitations" ? "default" : "outline"}
              className={`h-8 px-2 text-sm ${mobileSection !== "invitations" ? "border border-border bg-card/80" : ""}`}
              onClick={() => setMobileSection("invitations")}
            >
              {t("contactsBalancesPage.mobileTabInvitations")}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[55%_45%]">
          <div className={`space-y-3 ${mobileSection !== "contacts" ? "hidden lg:block" : ""}`}>
            <ContactsList
              filteredContactRows={contactsData.filteredContactRows}
              contactSearch={contactsData.contactSearch}
              onContactSearchChange={contactsData.setContactSearch}
              expandedContactUserId={contactsData.expandedContactUserId}
              onToggleContact={(contactUserId) =>
                contactsData.setExpandedContactUserId((previous) =>
                  previous === contactUserId ? null : contactUserId
                )
              }
              expandedBreakdownLoading={contactsData.expandedBreakdownLoading}
              expandedBreakdownError={contactsData.expandedBreakdownError}
              expandedGroupRows={contactsData.expandedGroupRows}
              settlementFeedback={settlements.settlementFeedback}
              onSettleTotal={(target) => settlements.setTotalSettlementOptionsTarget(target)}
              onSettleGroup={(target) => settlements.setGroupSettlementOptionsTarget(target)}
            />
          </div>

          <div className={`${mobileSection !== "invitations" ? "hidden lg:block" : ""}`}>
            <InvitationsPanel
              inviteEmail={invitations.inviteEmail}
              onInviteEmailChange={invitations.setInviteEmail}
              inviteFeedback={invitations.inviteFeedback}
              onInviteFeedbackClear={() => invitations.setInviteFeedback(null)}
              onSendContactInvite={invitations.handleSendContactInvite}
              sendContactInvitationPending={invitations.sendContactInvitationMutation.isPending}
              sentInvitationsLoading={invitations.sentInvitationsLoading}
              sentInvitationsError={invitations.sentInvitationsError}
              sentContactInvitations={invitations.sentContactInvitations}
              onCancelInvitation={invitations.cancelContactInvitationMutation.mutate}
              cancelContactInvitationPending={invitations.cancelContactInvitationMutation.isPending}
              cancelContactInvitationTargetId={invitations.cancelContactInvitationMutation.variables}
              pendingInvitationsLoading={invitations.pendingInvitationsLoading}
              pendingInvitationsError={invitations.pendingInvitationsError}
              receivedContactInvitations={invitations.receivedContactInvitations}
              onAcceptInvitation={invitations.acceptInvitationMutation.mutate}
              onDeclineInvitation={invitations.declineInvitationMutation.mutate}
              acceptInvitationPending={invitations.acceptInvitationMutation.isPending}
              acceptInvitationTargetId={invitations.acceptInvitationMutation.variables}
              declineInvitationPending={invitations.declineInvitationMutation.isPending}
              declineInvitationTargetId={invitations.declineInvitationMutation.variables}
            />
          </div>
        </div>
      </div>

      <TotalSettlementDialog
        open={settlements.totalSettlementOptionsTarget !== null}
        onOpenChange={(open) => {
          if (!open) settlements.setTotalSettlementOptionsTarget(null);
        }}
        contactUsername={settlements.totalSettlementOptionsTarget?.contactUsername}
        currency={settlements.totalSettlementOptionsTarget?.currency ?? "PLN"}
        contactUserId={settlements.totalSettlementOptionsTarget?.contactUserId}
        settleTotalCashPending={
          settlements.settleTotalCashMutation.isPending &&
          settlements.settleTotalCashMutation.variables === settlements.totalSettlementOptionsTarget?.contactUserId
        }
        isPayPalButtonEnabled={settlements.isPayPalButtonEnabled}
        getPayPalUnavailableMessage={settlements.getPayPalUnavailableMessage}
        onCashClick={() => {
          if (!settlements.totalSettlementOptionsTarget) return;
          settlements.setTotalSettlementTarget({
            contactUserId: settlements.totalSettlementOptionsTarget.contactUserId,
            contactUsername: settlements.totalSettlementOptionsTarget.contactUsername,
          });
          settlements.setTotalSettlementOptionsTarget(null);
        }}
        onPayPalCreateOrder={async () => {
          if (!settlements.totalSettlementOptionsTarget) {
            throw new Error("Missing total settlement target");
          }
          try {
            return await settlements.createTotalPayPalOrder(
              settlements.totalSettlementOptionsTarget.contactUserId
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            settlements.setSettlementFeedback({
              tone: "error",
              message: settlements.mapPayPalSettlementError(message),
            });
            throw error;
          }
        }}
        onPayPalApprove={async (data) => {
          if (!data.orderID || !settlements.totalSettlementOptionsTarget) {
            settlements.setSettlementFeedback({
              tone: "error",
              message: t("contactsBalancesPage.settlementErrors.paypalInitFailed"),
            });
            return;
          }
          try {
            await settlements.finalizeTotalPayPalOrder(
              data.orderID,
              settlements.totalSettlementOptionsTarget.contactUserId
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            settlements.setSettlementFeedback({
              tone: "error",
              message: settlements.mapPayPalSettlementError(message),
            });
          }
        }}
        onPayPalCancel={() => {
          settlements.setSettlementFeedback({
            tone: "error",
            message: t("contactsBalancesPage.settlementErrors.paypalCancelled"),
          });
        }}
        onPayPalError={(error) => {
          const message = error instanceof Error ? error.message : undefined;
          settlements.setSettlementFeedback({
            tone: "error",
            message: settlements.mapPayPalSettlementError(message),
          });
        }}
      />

      <GroupSettlementDialog
        open={settlements.groupSettlementOptionsTarget !== null}
        onOpenChange={(open) => {
          if (!open) settlements.setGroupSettlementOptionsTarget(null);
        }}
        groupName={settlements.groupSettlementOptionsTarget?.groupName}
        currency={settlements.groupSettlementOptionsTarget?.currency ?? "PLN"}
        contactUserId={settlements.groupSettlementOptionsTarget?.contactUserId}
        groupId={settlements.groupSettlementOptionsTarget?.groupId}
        settleGroupCashPending={
          settlements.settleGroupCashMutation.isPending &&
          settlements.settleGroupCashMutation.variables?.groupId === settlements.groupSettlementOptionsTarget?.groupId &&
          settlements.settleGroupCashMutation.variables?.toUserId === settlements.groupSettlementOptionsTarget?.contactUserId
        }
        isPayPalButtonEnabled={settlements.isPayPalButtonEnabled}
        getPayPalUnavailableMessage={settlements.getPayPalUnavailableMessage}
        onCashClick={() => {
          if (!settlements.groupSettlementOptionsTarget) return;
          settlements.setGroupSettlementTarget(settlements.groupSettlementOptionsTarget);
          settlements.setGroupSettlementOptionsTarget(null);
        }}
        onPayPalCreateOrder={async () => {
          if (!settlements.groupSettlementOptionsTarget) {
            throw new Error("Missing group settlement target");
          }
          try {
            return await settlements.createGroupPayPalOrder(
              settlements.groupSettlementOptionsTarget.contactUserId,
              settlements.groupSettlementOptionsTarget.groupId
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            settlements.setSettlementFeedback({
              tone: "error",
              message: settlements.mapPayPalSettlementError(message),
            });
            throw error;
          }
        }}
        onPayPalApprove={async (data) => {
          if (!data.orderID || !settlements.groupSettlementOptionsTarget) {
            settlements.setSettlementFeedback({
              tone: "error",
              message: t("contactsBalancesPage.settlementErrors.paypalInitFailed"),
            });
            return;
          }
          try {
            await settlements.finalizeGroupPayPalOrder(
              data.orderID,
              settlements.groupSettlementOptionsTarget.contactUserId,
              settlements.groupSettlementOptionsTarget.groupId
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : undefined;
            settlements.setSettlementFeedback({
              tone: "error",
              message: settlements.mapPayPalSettlementError(message),
            });
          }
        }}
        onPayPalCancel={() => {
          settlements.setSettlementFeedback({
            tone: "error",
            message: t("contactsBalancesPage.settlementErrors.paypalCancelled"),
          });
        }}
        onPayPalError={(error) => {
          const message = error instanceof Error ? error.message : undefined;
          settlements.setSettlementFeedback({
            tone: "error",
            message: settlements.mapPayPalSettlementError(message),
          });
        }}
      />

      <GroupSettlementConfirmDialog
        open={settlements.groupSettlementTarget !== null}
        onOpenChange={(open) => {
          if (!open) settlements.setGroupSettlementTarget(null);
        }}
        contactUsername={settlements.groupSettlementTarget?.contactUsername}
        groupName={settlements.groupSettlementTarget?.groupName}
        amount={settlements.groupSettlementTarget?.amount ?? 0}
        currency={settlements.groupSettlementTarget?.currency ?? "PLN"}
        settleGroupCashPending={settlements.settleGroupCashMutation.isPending}
        onConfirm={() => {
          if (!settlements.groupSettlementTarget) return;
          settlements.settleGroupCashMutation.mutate({
            toUserId: settlements.groupSettlementTarget.contactUserId,
            groupId: settlements.groupSettlementTarget.groupId,
          });
        }}
      />

      <TotalSettlementConfirmDialog
        open={settlements.totalSettlementTarget !== null}
        onOpenChange={(open) => {
          if (!open) settlements.setTotalSettlementTarget(null);
        }}
        contactUsername={settlements.totalSettlementTarget?.contactUsername}
        settleTotalCashPending={settlements.settleTotalCashMutation.isPending}
        onConfirm={() => {
          if (!settlements.totalSettlementTarget) return;
          settlements.settleTotalCashMutation.mutate(settlements.totalSettlementTarget.contactUserId);
        }}
      />
    </div>
  );
}
