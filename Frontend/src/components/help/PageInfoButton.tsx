import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePageVisitTracker } from "@/hooks/usePageVisitTracker";

type PageInfoButtonProps = {
  pageKey:
    | "dashboard"
    | "groups"
    | "groupDetail"
    | "personal"
    | "budgets"
    | "contacts"
    | "summaries"
    | "receiptScan";
  variant?: "full" | "icon";
  className?: string;
  autoOpen?: boolean;
};

export default function PageInfoButton({ pageKey, variant = "full", className, autoOpen = false }: PageInfoButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shouldShowDialog, isInitialized, markAsVisited } = usePageVisitTracker(pageKey);

  useEffect(() => {
    if (autoOpen && isInitialized && shouldShowDialog) {
      // Double-check localStorage to prevent double-opening in React Strict Mode
      const storageKey = `page_visited_${pageKey}`;
      const hasVisited = localStorage.getItem(storageKey);
      if (!hasVisited) {
        setOpen(true);
        markAsVisited();
      }
    }
  }, [autoOpen, isInitialized, shouldShowDialog, markAsVisited, pageKey]);

  const title = t(`help.pageInfo.pages.${pageKey}.title`);
  const purpose = t(`help.pageInfo.pages.${pageKey}.purpose`);

  const actions = useMemo(() => {
    const value = t(`help.pageInfo.pages.${pageKey}.actions`, { returnObjects: true }) as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  }, [pageKey, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={className}
          onClick={() => setOpen(true)}
          aria-label={t("help.pageInfo.buttonLabel")}
        >
          <Info className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          onClick={() => setOpen(true)}
          aria-label={t("help.pageInfo.buttonLabel")}
        >
          <Info className="h-4 w-4" />
          {/* <span className="ml-2">{t("help.pageInfo.buttonLabel")}</span> */}
        </Button>
      )}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("help.pageInfo.dialogTitle")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{purpose}</p>

          {actions.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

