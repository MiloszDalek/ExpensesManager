import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { useTranslation } from "react-i18next";
import { Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

import type { ApiGroupResponse } from "@/types";

interface GroupCardProps {
  group: ApiGroupResponse;
  index: number;
}

const accentGradients = [
  "from-cyan-500 to-teal-500",
  "from-emerald-500 to-lime-500",
  "from-blue-500 to-indigo-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

export default function GroupCard({ group, index }: GroupCardProps) {
  const { t } = useTranslation();
  const accent = accentGradients[index % accentGradients.length];
  const isActive = group.status === "active";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden border border-border bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
        <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
        <CardContent className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${accent} shadow-md`}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("groupsPage.currencyLabel")}: {group.currency}
                </p>
              </div>
            </div>

            <Badge variant={isActive ? "default" : "secondary"}>
              {t(isActive ? "groupsPage.statusActive" : "groupsPage.statusArchived")}
            </Badge>
          </div>

          {group.description && (
            <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{group.description}</p>
          )}

          <p className="mb-4 text-xs text-muted-foreground">
            {t("groupsPage.createdAt")}: {format(new Date(group.created_at), "MMM d, yyyy")}
          </p>

          <Link to={createPageUrl("GroupDetail", { id: group.id })}>
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