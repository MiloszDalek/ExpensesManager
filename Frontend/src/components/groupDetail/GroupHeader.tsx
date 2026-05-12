import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Repeat2, ScanSearch } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import PageInfoButton from "@/components/help/PageInfoButton";
import { formatGroupName } from "@/utils/group";
import type { ApiGroupResponse } from "@/types";

interface GroupHeaderProps {
  group: ApiGroupResponse;
  groupId: number;
  isCurrentUserAdmin: boolean;
  onEditGroup: () => void;
  onAddExpense: () => void;
  onAddRecurringExpense: () => void;
}

export default function GroupHeader({
  group,
  groupId,
  isCurrentUserAdmin,
  onEditGroup,
  onAddExpense,
  onAddRecurringExpense,
}: GroupHeaderProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-12"
    >
      <div className="min-w-0 lg:col-span-7 lg:col-start-2 pr-12 md:pr-0">
        <div className="flex max-w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="max-w-full break-words text-3xl font-bold text-foreground md:text-4xl">
              {formatGroupName(group.name)}
            </h1>
            {isCurrentUserAdmin ? (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onEditGroup}
                aria-label={t("groupDetailPage.editGroup")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-2 max-w-3xl text-muted-foreground [overflow-wrap:anywhere]">
          {group.description || t("groupDetailPage.noDescription")} · {t("groupDetailPage.currencyLabel")}: {group.currency}
        </p>
      </div>

      <div className="flex flex-row items-start justify-end gap-2 lg:col-span-4">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <Button size="sm" className="hidden sm:inline-flex" onClick={onAddExpense}>
            <Plus className="mr-2 h-4 w-4" />
            {t("groupDetailPage.addExpense")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex border border-border bg-card/80"
            onClick={onAddRecurringExpense}
          >
            <Repeat2 className="mr-2 h-4 w-4" />
            {t("groupDetailPage.addRecurringExpense")}
          </Button>
          <Button size="sm" variant="outline" asChild className="hidden sm:inline-flex border border-border bg-card/80">
            <Link to={`/receipt-scan?mode=group&groupId=${groupId}`}>
              <ScanSearch className="mr-2 h-4 w-4" />
              {t("groupDetailPage.scanReceipt")}
            </Link>
          </Button>
        </div>
        <PageInfoButton pageKey="groupDetail" autoOpen={true} className="hidden lg:inline-flex" />
      </div>
    </motion.div>
  );
}
