import { memo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface MobileSummarySwitcherProps {
  view: "charts" | "transactions";
  onViewChange: (view: "charts" | "transactions") => void;
}

const MobileSummarySwitcher = memo(function MobileSummarySwitcher({ view, onViewChange }: MobileSummarySwitcherProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 lg:hidden">
      <div className="grid grid-cols-2 gap-1">
        <Button
          type="button"
          size="sm"
          variant={view === "charts" ? "default" : "outline"}
          className={`h-8 px-2 text-sm ${view !== "charts" ? "border border-border bg-card/80" : ""}`}
          onClick={() => onViewChange("charts")}
        >
          {t("summaryPage.mobile.charts", { defaultValue: "Charts" })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "transactions" ? "default" : "outline"}
          className={`h-8 px-2 text-sm ${view !== "transactions" ? "border border-border bg-card/80" : ""}`}
          onClick={() => onViewChange("transactions")}
        >
          {t("summaryPage.mobile.transactions", { defaultValue: "Transactions" })}
        </Button>
      </div>
    </div>
  );
});

export default MobileSummarySwitcher;
