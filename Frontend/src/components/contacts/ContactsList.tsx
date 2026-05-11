import { HandCoins, Search, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import ContactBalanceCard from "./ContactBalanceCard";
import type { ContactBalanceRow, GroupSettlementTarget } from "@/types";

interface ContactsListProps {
  filteredContactRows: ContactBalanceRow[];
  contactSearch: string;
  onContactSearchChange: (value: string) => void;
  expandedContactUserId: number | null;
  onToggleContact: (contactUserId: number) => void;
  expandedBreakdownLoading: boolean;
  expandedBreakdownError: boolean;
  expandedGroupRows: {
    groupId: number;
    amount: number;
    absoluteAmount: number;
    groupName: string;
    groupCurrency: string;
  }[];
  settlementFeedback: { tone: "success" | "error"; message: string } | null;
  onSettleTotal: (target: { contactUserId: number; contactUsername: string; currency: string }) => void;
  onSettleGroup: (target: GroupSettlementTarget) => void;
}

export default function ContactsList({
  filteredContactRows,
  contactSearch,
  onContactSearchChange,
  expandedContactUserId,
  onToggleContact,
  expandedBreakdownLoading,
  expandedBreakdownError,
  expandedGroupRows,
  settlementFeedback,
  onSettleTotal,
  onSettleGroup,
}: ContactsListProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t("contactsBalancesPage.listTitle")}</h2>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UsersRound className="h-4 w-4 text-primary" />
          <span>{filteredContactRows.length}</span>
        </div>
      </div>

      {settlementFeedback ? (
        <p
          className={`text-sm ${
            settlementFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"
          }`}
        >
          {settlementFeedback.message}
        </p>
      ) : null}

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={contactSearch}
          onChange={(event) => onContactSearchChange(event.target.value)}
          placeholder={t("contactsBalancesPage.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {filteredContactRows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          {contactSearch.trim().length === 0
            ? t("contactsBalancesPage.empty")
            : t("contactsBalancesPage.searchNoResults")}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredContactRows.map((row) => {
            const isExpanded = expandedContactUserId === row.contact.contact_id;
            return (
              <ContactBalanceCard
                key={row.contact.id}
                row={row}
                isExpanded={isExpanded}
                onToggle={() => onToggleContact(row.contact.contact_id)}
                onSettleTotal={onSettleTotal}
                onSettleGroup={onSettleGroup}
                expandedBreakdownLoading={isExpanded ? expandedBreakdownLoading : false}
                expandedBreakdownError={isExpanded ? expandedBreakdownError : false}
                expandedGroupRows={isExpanded ? expandedGroupRows : []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
