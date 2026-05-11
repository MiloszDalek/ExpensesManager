import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ApiInvitationResponse } from "@/types";

interface InvitationsPanelProps {
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  inviteFeedback: { tone: "success" | "error"; message: string } | null;
  onInviteFeedbackClear: () => void;
  onSendContactInvite: () => void;
  sendContactInvitationPending: boolean;
  sentInvitationsLoading: boolean;
  sentInvitationsError: Error | null;
  sentContactInvitations: ApiInvitationResponse[];
  onCancelInvitation: (invitationId: number) => void;
  cancelContactInvitationPending: boolean;
  cancelContactInvitationTargetId: number | undefined;
  pendingInvitationsLoading: boolean;
  pendingInvitationsError: Error | null;
  receivedContactInvitations: ApiInvitationResponse[];
  onAcceptInvitation: (invitationId: number) => void;
  onDeclineInvitation: (invitationId: number) => void;
  acceptInvitationPending: boolean;
  acceptInvitationTargetId: number | undefined;
  declineInvitationPending: boolean;
  declineInvitationTargetId: number | undefined;
}

export default function InvitationsPanel({
  inviteEmail,
  onInviteEmailChange,
  inviteFeedback,
  onInviteFeedbackClear,
  onSendContactInvite,
  sendContactInvitationPending,
  sentInvitationsLoading,
  sentInvitationsError,
  sentContactInvitations,
  onCancelInvitation,
  cancelContactInvitationPending,
  cancelContactInvitationTargetId,
  pendingInvitationsLoading,
  pendingInvitationsError,
  receivedContactInvitations,
  onAcceptInvitation,
  onDeclineInvitation,
  acceptInvitationPending,
  acceptInvitationTargetId,
  declineInvitationPending,
  declineInvitationTargetId,
}: InvitationsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("contactsBalancesPage.invitationsTitle")}
        </h2>
      </div>

      <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("contactsBalancesPage.inviteByEmailTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("contactsBalancesPage.inviteByEmailDescription")}
            </p>
          </div>

          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => {
              onInviteEmailChange(event.target.value);
              if (inviteFeedback) {
                onInviteFeedbackClear();
              }
            }}
            placeholder={t("dashboardInbox.contactEmailPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("addGroupMemberDialog.emailHint")}</p>

          {inviteFeedback ? (
            <p
              className={`text-sm ${inviteFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"}`}
            >
              {inviteFeedback.message}
            </p>
          ) : null}

          <Button
            onClick={onSendContactInvite}
            disabled={sendContactInvitationPending || !inviteEmail.trim()}
            className="w-full"
          >
            {sendContactInvitationPending
              ? t("dashboardInbox.sendingInvite")
              : t("dashboardInbox.sendInvite")}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {t("dashboardInbox.sentInvitationsTitle")}
        </h3>

        {sentInvitationsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : sentInvitationsError ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
            {sentInvitationsError.message || t("common.somethingWentWrong")}
          </p>
        ) : sentContactInvitations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t("dashboardInbox.sentInvitationsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {sentContactInvitations.map((invitation) => {
              const recipientLabel =
                invitation.to_user_username ?? invitation.to_user_email ?? `#${invitation.to_user_id}`;
              const isCancelling =
                cancelContactInvitationPending && cancelContactInvitationTargetId === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t("contactsBalancesPage.invitationTo", { username: recipientLabel })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCancelling}
                    onClick={() => onCancelInvitation(invitation.id)}
                  >
                    {isCancelling ? t("dashboardInbox.cancellingInvite") : t("dashboardInbox.cancelInvite")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {t("dashboardInbox.receivedInvitationsTitle")}
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
        ) : receivedContactInvitations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t("dashboardInbox.receivedInvitationsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {receivedContactInvitations.map((invitation) => {
              const senderLabel =
                invitation.from_user_username ?? invitation.from_user_email ?? t("dashboardInbox.userFallback");
              const isAccepting =
                acceptInvitationPending && acceptInvitationTargetId === invitation.id;
              const isDeclining =
                declineInvitationPending && declineInvitationTargetId === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t("contactsBalancesPage.invitationFrom", { username: senderLabel })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isAccepting || isDeclining}
                      onClick={() => onAcceptInvitation(invitation.id)}
                    >
                      {isAccepting ? t("dashboardInbox.acceptingInvite") : t("dashboardInbox.acceptInvite")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isAccepting || isDeclining}
                      onClick={() => onDeclineInvitation(invitation.id)}
                    >
                      {isDeclining ? t("dashboardInbox.decliningInvite") : t("dashboardInbox.declineInvite")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
