import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import GroupMembersPanel from "@/components/groups/GroupMembersPanel";
import { format } from "date-fns";
import type { ApiGroupMemberResponse, ApiInvitationResponse } from "@/types";

interface GroupMembersSectionProps {
  members: ApiGroupMemberResponse[];
  currentUserId: number;
  isCurrentUserAdmin: boolean;
  canManageMembers: boolean;
  onGrantAdmin: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onLeaveGroup: () => void;
  grantPendingUserId: number | null;
  removePendingUserId: number | null;
  leavePending: boolean;
  onAddMember: () => void;
  pendingInvitations: ApiInvitationResponse[];
  pendingInvitationsLoading: boolean;
  pendingInvitationsError: Error | null;
  onCancelInvitation: (invitationId: number) => void;
  cancelInvitationPending: boolean;
  cancelInvitationTargetId: number | undefined;
}

export default function GroupMembersSection({
  members,
  currentUserId,
  isCurrentUserAdmin,
  canManageMembers,
  onGrantAdmin,
  onRemoveMember,
  onLeaveGroup,
  grantPendingUserId,
  removePendingUserId,
  leavePending,
  onAddMember,
  pendingInvitations,
  pendingInvitationsLoading,
  pendingInvitationsError,
  onCancelInvitation,
  cancelInvitationPending,
  cancelInvitationTargetId,
}: GroupMembersSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-foreground hidden md:block">
          {t("groupDetailPage.membersSection")}
        </h2>
        {isCurrentUserAdmin && (
          <Button size="sm" variant="outline" onClick={onAddMember} className="border border-border bg-card/80">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("groupDetailPage.addMember")}
          </Button>
        )}
      </div>

      <GroupMembersPanel
        members={members}
        currentUserId={currentUserId}
        canManageMembers={canManageMembers}
        canRemoveMembers={false}
        grantPendingUserId={grantPendingUserId}
        removePendingUserId={removePendingUserId}
        leavePending={leavePending}
        onGrantAdmin={onGrantAdmin}
        onRemoveMember={onRemoveMember}
        onLeaveGroup={onLeaveGroup}
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
              {pendingInvitations.map((invitation) => {
                const recipientLabel =
                  invitation.to_user_username ?? invitation.to_user_email ?? `#${invitation.to_user_id}`;
                return (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t("groupDetailPage.pendingInvitationUser", { username: recipientLabel })}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={cancelInvitationPending && cancelInvitationTargetId === invitation.id}
                      onClick={() => onCancelInvitation(invitation.id)}
                    >
                      {cancelInvitationPending && cancelInvitationTargetId === invitation.id
                        ? t("groupDetailPage.cancelling")
                        : t("groupDetailPage.cancelInvitation")}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
