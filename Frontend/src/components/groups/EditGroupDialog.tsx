import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DialogInfoButton from "@/components/help/DialogInfoButton";
import { type CurrencyEnum } from "@/types/enums";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import type { ApiGroupResponse, ApiGroupUpdate } from "@/types";

const GROUP_NAME_MAX_LENGTH = 120;
const GROUP_DESCRIPTION_MAX_LENGTH = 500;

type EditGroupDialogProps = {
  open: boolean;
  group: ApiGroupResponse | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApiGroupUpdate) => void;
  onArchive: () => void;
  isLoading?: boolean;
  isArchiving?: boolean;
  errorMessage?: string | null;
};

type FormData = {
  name: string;
  description: string;
  currency: CurrencyEnum;
};

export default function EditGroupDialog({
  open,
  group,
  onOpenChange,
  onSubmit,
  onArchive,
  isLoading,
  isArchiving,
  errorMessage,
}: EditGroupDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    currency: "PLN",
  });

  useEffect(() => {
    if (!open || !group) {
      return;
    }

    setFormData({
      name: group.name ?? "",
      description: group.description ?? "",
      currency: group.currency ?? "PLN",
    });
  }, [open, group]);

  const hasExpenses = (group?.expenses_count ?? 0) > 0;
  const isArchived = group?.status === "archived";

  const resetForm = () => {
    if (!group) {
      setFormData({
        name: "",
        description: "",
        currency: "PLN",
      });
      return;
    }

    setFormData({
      name: group.name ?? "",
      description: group.description ?? "",
      currency: group.currency ?? "PLN",
    });
  };

  const handleCurrencyChange = (value: CurrencyEnum) => {
    setFormData((previous) => ({
      ...previous,
      currency: value,
    }));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    const nextName = formData.name.trim();
    const nextDescription = formData.description.trim();

    if (!nextName) {
      return;
    }

    onSubmit({
      name: nextName,
      description: nextDescription.length > 0 ? nextDescription : null,
      currency: formData.currency,
    });
  };

  const handleArchive = () => {
    onArchive();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full min-w-0 max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-lg [&_[data-radix-dialog-close]]:cursor-pointer">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("groupEditDialog.title")}</DialogTitle>
            <DialogInfoButton dialogKey="editGroup" autoOpen={true} />
          </div>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {errorMessage && (
            <p className="max-w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive [overflow-wrap:anywhere]">
              {errorMessage}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="group-name">{t("groupEditDialog.name")}</Label>
            <Input
              id="group-name"
              placeholder={t("createGroupDialog.namePlaceholder")}
              value={formData.name}
              className="w-full min-w-0 max-w-full"
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  name: event.target.value.slice(0, GROUP_NAME_MAX_LENGTH),
                }))
              }
            />
            <p className="text-right text-xs text-muted-foreground">
              {formData.name.length}/{GROUP_NAME_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-description">{t("groupEditDialog.description")}</Label>
            <Textarea
              id="group-description"
              placeholder={t("createGroupDialog.descriptionPlaceholder")}
              value={formData.description}
              className="w-full min-w-0 max-w-full overflow-x-hidden whitespace-pre-wrap [field-sizing:fixed] [overflow-wrap:anywhere]"
              maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  description: event.target.value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH),
                }))
              }
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {formData.description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          <div className="space-y-1">
            <Label>{t("groupEditDialog.currency")}</Label>
            <CurrencyPicker
              selectedCurrency={formData.currency}
              onCurrencyChange={handleCurrencyChange}
              disabled={hasExpenses}
              className="mt-2 w-full"
            />
          </div>
          {hasExpenses && (
            <p className="text-xs text-muted-foreground">
              {t("groupEditDialog.currencyLockedNotice")}
            </p>
          )}
        </div>

        <DialogFooter className="min-w-0 flex-wrap">
          {!isArchived && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isArchiving || isLoading}>
                  {t("groupEditDialog.archive")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("groupEditDialog.archiveWarningTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("groupEditDialog.archiveWarningDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("groupEditDialog.archiveCancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleArchive}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isArchiving ? t("groupEditDialog.archiving") : t("groupEditDialog.archiveConfirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("createGroupDialog.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name.trim() || isLoading || isArchiving}>
            {isLoading ? t("createGroupDialog.creating") : t("groupEditDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
