import { memo } from "react";
import { useTranslation } from "react-i18next";

interface MobileSummarySwitcherProps {
  view: "charts" | "transactions";
  onViewChange: (view: "charts" | "transactions") => void;
}

const MobileSummarySwitcher = memo(function MobileSummarySwitcher({ view, onViewChange }: MobileSummarySwitcherProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 flex gap-1 rounded-lg border bg-muted p-1 lg:hidden">
      <button
        type="button"
        onClick={() => onViewChange("charts")}
        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "charts"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("summaryPage.mobile.charts", { defaultValue: "Charts" })}
      </button>
      <button
        type="button"
        onClick={() => onViewChange("transactions")}
        className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          view === "transactions"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {t("summaryPage.mobile.transactions", { defaultValue: "Transactions" })}
      </button>
    </div>
  );
});

export default MobileSummarySwitcher;
