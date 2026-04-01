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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_CURRENCIES } from "@/types/enums";

type CreateGroupFormData = {
  name: string;
  description: string;
  currency: (typeof SUPPORTED_CURRENCIES)[number];
};

type CreateGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateGroupFormData) => void;
  isLoading?: boolean;
};

export default function CreateGroupDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: CreateGroupDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "PLN" as (typeof SUPPORTED_CURRENCIES)[number],
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      currency: "PLN",
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    if (formData.name.trim()) {
      onSubmit(formData);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("createGroupDialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{t("createGroupDialog.name")}</Label>
            <Input
              id="name"
              placeholder={t("createGroupDialog.namePlaceholder")}
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="description">{t("createGroupDialog.description")}</Label>
            <Textarea
              id="description"
              placeholder={t("createGroupDialog.descriptionPlaceholder")}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label>{t("createGroupDialog.currency")}</Label>
            <Select
              value={formData.currency}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  currency: value as (typeof SUPPORTED_CURRENCIES)[number],
                }))
              }
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((currency) => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}