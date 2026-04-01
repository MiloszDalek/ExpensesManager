import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ApiGroupMemberResponse } from "@/types";

type GroupMembersPanelProps = {
  members: ApiGroupMemberResponse[];
  isLoading: boolean;
};

const roleVariant: Record<ApiGroupMemberResponse["role"], "default" | "secondary"> = {
  admin: "default",
  member: "secondary",
};

export default function GroupMembersPanel({ members, isLoading }: GroupMembersPanelProps) {
  const { t } = useTranslation();

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
    <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">{t("groupMembersPanel.title")}</h3>
          <Badge variant="outline">{members.length}</Badge>
        </div>

        <div className="space-y-2">
          {members.map((member) => {
            const initials = (member.username || member.email).slice(0, 1).toUpperCase();
            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{member.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={roleVariant[member.role]}>{t(`groupMembersPanel.role.${member.role}`)}</Badge>
                  <Badge variant="outline">{t(`groupMembersPanel.status.${member.status}`)}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
