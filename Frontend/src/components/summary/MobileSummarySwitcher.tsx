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
          className="h-8 px-1 text-[11px]"
          onClick={() => onViewChange("charts")}
        >
          {t("summaryPage.mobile.charts", { defaultValue: "Charts" })}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "transactions" ? "default" : "outline"}
          className="h-8 px-1 text-[11px]"
          onClick={() => onViewChange("transactions")}
        >
          {t("summaryPage.mobile.transactions", { defaultValue: "Transactions" })}
        </Button>
      </div>
    </div>
  );
});

export default MobileSummarySwitcher;
