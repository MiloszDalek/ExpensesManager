import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export type BudgetTab = "periods" | "income" | "pools" | "goals";

interface BudgetTabsProps {
  mobileSection: BudgetTab;
  setMobileSection: (section: BudgetTab) => void;
}

export default function BudgetTabs({ mobileSection, setMobileSection }: BudgetTabsProps) {
  const { t } = useTranslation();

  const tabs: { key: BudgetTab; label: string }[] = [
    { key: "periods", label: t("budgets.tabs.periods") },
    { key: "income", label: t("budgets.tabs.income") },
    { key: "pools", label: t("budgets.tabs.pools") },
    { key: "goals", label: t("budgets.tabs.goals") },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-4 gap-1 md:gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            type="button"
            size="sm"
            variant={mobileSection === tab.key ? "default" : "outline"}
            className={`h-8 px-1 text-[12px] md:h-10 md:px-3 md:text-sm ${mobileSection !== tab.key ? "border border-border bg-card/80" : ""}`}
            onClick={() => setMobileSection(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
