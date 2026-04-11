import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";
import { useTranslation } from "react-i18next";
import { Users, ArrowRight, ReceiptText } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import type { ApiGroupResponse } from "@/types";

interface GroupCardProps {
  group: ApiGroupResponse;
  index: number;
}

export default function GroupCard({ group, index }: GroupCardProps) {
  const { t } = useTranslation();
  const isActive = group.status === "active";

  return (
    <motion.div
      className="min-w-0 w-full max-w-[440px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group h-full w-full min-w-0 overflow-hidden border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
        <CardContent className="flex min-h-[270px] min-w-0 flex-col overflow-hidden p-6">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="overflow-hidden break-all text-lg font-semibold leading-tight text-foreground">
                {formatGroupName(group.name)}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("groupsPage.currencyLabel")}: {group.currency}
              </p>
            </div>

            <Badge variant={isActive ? "default" : "secondary"} className="shrink-0 whitespace-nowrap">
              {t(isActive ? "groupsPage.statusActive" : "groupsPage.statusArchived")}
            </Badge>
          </div>

          <p className="mb-4 h-10 w-full min-w-0 max-w-full overflow-hidden whitespace-normal break-words text-sm text-muted-foreground [overflow-wrap:anywhere] [word-break:break-word]">
            {group.description || t("groupsPage.noDescription")}
          </p>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("groupsPage.members")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                {group.members_count ?? 0}
              </p>
            </div>

            <div className="rounded-md border border-border/70 bg-muted/35 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("groupsPage.expenses")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <ReceiptText className="h-4 w-4 text-muted-foreground" />
                {group.expenses_count ?? 0}
              </p>
            </div>
          </div>

          <p className="mb-4 text-xs text-muted-foreground">
            {t("groupsPage.createdAt")}: {format(new Date(group.created_at), "MMM d, yyyy")}
          </p>

          <Link to={createPageUrl("GroupDetail", { id: group.id })} className="mt-auto block">
            <Button className="w-full">
              {t("groupsPage.viewGroup")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}