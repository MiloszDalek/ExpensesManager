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

type DialogInfoButtonProps = {
  dialogKey: string;
  className?: string;
  autoOpen?: boolean;
};

export default function DialogInfoButton({ dialogKey, className, autoOpen = false }: DialogInfoButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (autoOpen) {
      // Double-check localStorage to prevent double-opening in React Strict Mode
      const storageKey = `dialog_visited_${dialogKey}`;
      const hasVisited = localStorage.getItem(storageKey);
      if (!hasVisited) {
        setOpen(true);
        localStorage.setItem(storageKey, "true");
      }
    }
  }, [autoOpen, dialogKey]);

  const title = t(`help.dialogInfo.dialogs.${dialogKey}.title`);
  const purpose = t(`help.dialogInfo.dialogs.${dialogKey}.purpose`);

  const actions = useMemo(() => {
    const value = t(`help.dialogInfo.dialogs.${dialogKey}.actions`, { returnObjects: true }) as unknown;
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  }, [dialogKey, t]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={className}
        onClick={() => setOpen(true)}
        aria-label={t("help.dialogInfo.buttonLabel")}
      >
        <Info className="h-4 w-4" />
      </Button>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{t("help.dialogInfo.dialogTitle")}</DialogDescription>
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
