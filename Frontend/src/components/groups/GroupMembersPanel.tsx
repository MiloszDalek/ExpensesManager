import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import type { ApiGroupMemberResponse } from "@/types";

type GroupMembersPanelProps = {
  members: ApiGroupMemberResponse[];
  currentUserId: number;
  canManageMembers: boolean;
  canRemoveMembers?: boolean;
  grantPendingUserId?: number | null;
  removePendingUserId?: number | null;
  leavePending?: boolean;
  onGrantAdmin: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  onLeaveGroup: () => void;
  isLoading: boolean;
};

const roleVariant: Record<ApiGroupMemberResponse["role"], "default" | "secondary"> = {
  admin: "default",
  member: "secondary",
};

export default function GroupMembersPanel({
  members,
  currentUserId,
  canManageMembers,
  canRemoveMembers = true,
  grantPendingUserId,
  removePendingUserId,
  leavePending,
  onGrantAdmin,
  onRemoveMember,
  onLeaveGroup,
  isLoading,
}: GroupMembersPanelProps) {
  const { t } = useTranslation();
  const activeMembers = members.filter((member) => member.status === "active");
  const currentMember = members.find((member) => member.user_id === currentUserId) ?? null;
  const isCurrentUserLastActiveMember =
    currentMember?.status === "active" && activeMembers.length === 1;

  if (isLoading) {
    return (
      <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (members.length === 0) {
    return (
      <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <h3 className="text-base font-semibold text-foreground">{t("groupMembersPanel.emptyTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("groupMembersPanel.emptyDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {members.map((member) => {
          const initials = (member.username || member.email).slice(0, 1).toUpperCase();
          const isCurrentUser = member.user_id === currentUserId;
          const canManageTarget = canManageMembers && !isCurrentUser && member.status === "active";
          return (
            <div
              key={member.id}
              className="rounded-lg border border-border bg-card/80 px-3 py-2 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{member.username}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  {isCurrentUser && <Badge variant="outline">{t("groupMembersPanel.you")}</Badge>}
                  <Badge variant={roleVariant[member.role]}>{t(`groupMembersPanel.role.${member.role}`)}</Badge>
                  <Badge variant="outline">{t(`groupMembersPanel.status.${member.status}`)}</Badge>
                  {canManageTarget && member.role !== "admin" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={grantPendingUserId === member.user_id}
                        >
                          {grantPendingUserId === member.user_id
                            ? t("groupMembersPanel.grantingAdmin")
                            : t("groupMembersPanel.grantAdmin")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("groupMembersPanel.grantConfirmTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("groupMembersPanel.grantConfirmDescription", { username: member.username })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("groupMembersPanel.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onGrantAdmin(member.user_id)}>
                            {t("groupMembersPanel.grantAdmin")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {canManageTarget && canRemoveMembers && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={removePendingUserId === member.user_id}
                        >
                          {removePendingUserId === member.user_id
                            ? t("groupMembersPanel.removing")
                            : t("groupMembersPanel.remove")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("groupMembersPanel.removeConfirmTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("groupMembersPanel.removeConfirmDescription", { username: member.username })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("groupMembersPanel.cancel")}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onRemoveMember(member.user_id)}>
                            {t("groupMembersPanel.remove")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={leavePending}>
              {t("groupMembersPanel.leaveGroup")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("groupMembersPanel.leaveConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {isCurrentUserLastActiveMember
                  ? t("groupMembersPanel.leaveConfirmDescriptionLastMember")
                  : t("groupMembersPanel.leaveConfirmDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("groupMembersPanel.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={onLeaveGroup}>
                {t("groupMembersPanel.leaveGroup")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
