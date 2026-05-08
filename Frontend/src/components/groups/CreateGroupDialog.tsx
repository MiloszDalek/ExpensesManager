import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import { type CurrencyEnum } from "@/types/enums";

type CreateGroupFormData = {
  name: string;
  description: string;
  currency: CurrencyEnum;
};

const GROUP_NAME_MAX_LENGTH = 120;
const GROUP_DESCRIPTION_MAX_LENGTH = 500;

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGroupFormData) => void;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export default function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  errorMessage,
}: CreateGroupDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateGroupFormData>({
    name: "",
    description: "",
    currency: "PLN",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      currency: "PLN",
    });
  };

  const handleCurrencyChange = (value: CurrencyEnum) => {
    setFormData((prev) => ({
      ...prev,
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
    if (
      formData.name.trim() &&
      formData.name.length <= GROUP_NAME_MAX_LENGTH &&
      formData.description.length <= GROUP_DESCRIPTION_MAX_LENGTH
    ) {
      onSubmit(formData);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full min-w-0 max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-md">
        <div className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col gap-4 p-6">
          <DialogHeader>
            <DialogTitle>{t("createGroupDialog.title")}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            {errorMessage && (
              <p className="max-w-full overflow-hidden rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive wrap-anywhere">
                {errorMessage}
              </p>
            )}

            <div className="space-y-1">
              <Label htmlFor="name">{t("createGroupDialog.name")}</Label>
              <Input
                id="name"
                placeholder={t("createGroupDialog.namePlaceholder")}
                value={formData.name}
                className="w-full min-w-0 max-w-full"
                maxLength={GROUP_NAME_MAX_LENGTH}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: e.target.value.slice(0, GROUP_NAME_MAX_LENGTH),
                  }))
                }
              />
              <p className="text-right text-xs text-muted-foreground">
                {formData.name.length}/{GROUP_NAME_MAX_LENGTH}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">{t("createGroupDialog.description")}</Label>
              <Textarea
                id="description"
                placeholder={t("createGroupDialog.descriptionPlaceholder")}
                value={formData.description}
                className="w-full min-w-0 max-w-full overflow-x-hidden whitespace-pre-wrap field-sizing-fixed wrap-anywhere"
                maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH),
                  }))
                }
                rows={2}
              />
              <p className="text-right text-xs text-muted-foreground">
                {formData.description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
              </p>
            </div>

            <div>
              <Label>{t("createGroupDialog.currency")}</Label>
              <CurrencyPicker
                selectedCurrency={formData.currency}
                onCurrencyChange={handleCurrencyChange}
                className="mt-2 w-full"
              />
            </div>
          </div>

          <DialogFooter className="min-w-0 shrink-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t("createGroupDialog.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || isLoading}
            >
              {isLoading ? t("createGroupDialog.creating") : t("createGroupDialog.submit")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}