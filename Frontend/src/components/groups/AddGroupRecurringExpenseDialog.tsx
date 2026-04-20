import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
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
import CategoryPicker from "@/components/expenses/CategoryPicker";
import { getDefaultCategoryId } from "@/utils/category";

import type {
  ApiCategoryResponse,
  ApiExpenseShare,
  ApiGroupMemberResponse,
  ApiRecurringGroupExpenseCreate,
} from "@/types";
import type { CategorySection, CurrencyEnum, RecurrenceFrequency, SplitType } from "@/types/enums";

type AddGroupRecurringExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: ApiRecurringGroupExpenseCreate) => void;
  onCreateGroupCategory?: (payload: { name: string; section: CategorySection }) => Promise<ApiCategoryResponse>;
  onDeleteGroupCategory?: (categoryId: number) => Promise<void>;
  isLoading?: boolean;
  categories: ApiCategoryResponse[];
  members: ApiGroupMemberResponse[];
  groupCurrency: CurrencyEnum;
  errorMessage?: string | null;
};

type FormData = {
  title: string;
  amount: string;
  split_type: SplitType;
  category_id: number;
  frequency: RecurrenceFrequency;
  interval_count: string;
  starts_on: string;
  ends_on: string;
  notes: string;
  selectedMemberIds: number[];
};

const parseDecimal = (value: string): number => Number(value.replace(",", "."));
const toAmountString = (value: number) => (Math.round(value * 100) / 100).toFixed(2);
const toCents = (value: number): number => Math.round(value * 100);
const toDateInput = (value: Date) => format(value, "yyyy-MM-dd");

const buildEqualPercentInputs = (participantIds: number[]): Record<number, string> => {
  const inputs: Record<number, string> = {};

  if (participantIds.length === 0) {
    return inputs;
  }

  const totalBasisPoints = 10000;
  const base = Math.floor(totalBasisPoints / participantIds.length);
  const remainder = totalBasisPoints - base * participantIds.length;

  participantIds.forEach((userId, index) => {
    const basisPoints = base + (index < remainder ? 1 : 0);
    inputs[userId] = (basisPoints / 100).toFixed(2);
  });

  return inputs;
};

const buildEqualShares = (totalCents: number, participantIds: number[]): ApiExpenseShare[] => {
  if (participantIds.length === 0) {
    return [];
  }

  const baseShareCents = Math.floor(totalCents / participantIds.length);
  const remainderCents = totalCents - baseShareCents * participantIds.length;

  return participantIds.map((userId, index) => {
    const cents = baseShareCents + (index < remainderCents ? 1 : 0);
    return {
      user_id: userId,
      share_amount: toAmountString(cents / 100),
    };
  });
};

const buildPercentShares = (
  totalCents: number,
  participantIds: number[],
  percentInputs: Record<number, string>
): ApiExpenseShare[] => {
  if (participantIds.length === 0 || totalCents <= 0) {
    return [];
  }

  const rawPercentages = participantIds.map((userId) => {
    const value = parseDecimal(percentInputs[userId] ?? "0");
    return Number.isFinite(value) && value > 0 ? value : 0;
  });

  const totalPercent = rawPercentages.reduce((sum, value) => sum + value, 0);
  if (totalPercent <= 0) {
    return [];
  }

  const normalized = rawPercentages.map((value) => value / totalPercent);
  const rawCents = normalized.map((ratio) => totalCents * ratio);
  const baseCents = rawCents.map((value) => Math.floor(value));
  let remainingCents = totalCents - baseCents.reduce((sum, value) => sum + value, 0);

  const remainders = rawCents
    .map((value, index) => ({
      index,
      remainder: value - baseCents[index],
      userId: participantIds[index],
    }))
    .sort((first, second) => {
      if (second.remainder !== first.remainder) {
        return second.remainder - first.remainder;
      }

      return first.userId - second.userId;
    });

  while (remainingCents > 0) {
    for (const item of remainders) {
      if (remainingCents === 0) {
        break;
      }

      baseCents[item.index] += 1;
      remainingCents -= 1;
    }
  }

  return participantIds.map((userId, index) => ({
    user_id: userId,
    share_amount: toAmountString(baseCents[index] / 100),
  }));
};

const buildExactShares = (
  participantIds: number[],
  exactInputs: Record<number, string>
): ApiExpenseShare[] => {
  return participantIds.map((userId) => {
    const value = parseDecimal(exactInputs[userId] ?? "0");
    const cents = Number.isFinite(value) ? Math.max(0, toCents(value)) : 0;
    return {
      user_id: userId,
      share_amount: toAmountString(cents / 100),
    };
  });
};

export default function AddGroupRecurringExpenseDialog({
  open,
  onOpenChange,
  onSubmit,
  onCreateGroupCategory,
  onDeleteGroupCategory,
  isLoading,
  categories,
  members,
  groupCurrency,
  errorMessage,
}: AddGroupRecurringExpenseDialogProps) {
  const { t } = useTranslation();

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );

  const defaultCategoryId = getDefaultCategoryId(categories);

  const buildInitialState = useCallback((): FormData => ({
    title: "",
    amount: "",
    split_type: "equal",
    category_id: defaultCategoryId,
    frequency: "monthly",
    interval_count: "1",
    starts_on: toDateInput(new Date()),
    ends_on: "",
    notes: "",
    selectedMemberIds: activeMembers.map((member) => member.user_id),
  }), [activeMembers, defaultCategoryId]);

  const [formData, setFormData] = useState<FormData>(buildInitialState);
  const [exactShareInputs, setExactShareInputs] = useState<Record<number, string>>({});
  const [percentShareInputs, setPercentShareInputs] = useState<Record<number, string>>({});
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormData(buildInitialState());
    setExactShareInputs({});
    setPercentShareInputs(buildEqualPercentInputs(activeMembers.map((member) => member.user_id)));
    setLocalError(null);
  }, [open, buildInitialState, activeMembers]);

  useEffect(() => {
    if (!open || categories.length === 0) {
      return;
    }

    setFormData((previous) => {
      const hasCurrentCategory = categories.some((category) => category.id === previous.category_id);

      if (hasCurrentCategory && previous.category_id !== 0) {
        return previous;
      }

      return {
        ...previous,
        category_id: defaultCategoryId,
      };
    });
  }, [open, categories, defaultCategoryId]);

  const selectedMemberIdSet = useMemo(
    () => new Set(formData.selectedMemberIds),
    [formData.selectedMemberIds]
  );

  const selectedParticipantIds = useMemo(
    () =>
      activeMembers
        .filter((member) => selectedMemberIdSet.has(member.user_id))
        .map((member) => member.user_id),
    [activeMembers, selectedMemberIdSet]
  );

  useEffect(() => {
    setExactShareInputs((previous) => {
      const next: Record<number, string> = {};
      selectedParticipantIds.forEach((userId) => {
        next[userId] = previous[userId] ?? "0.00";
      });
      return next;
    });

    setPercentShareInputs((previous) => {
      const next: Record<number, string> = {};
      selectedParticipantIds.forEach((userId) => {
        next[userId] = previous[userId] ?? "0.00";
      });
      return next;
    });
  }, [selectedParticipantIds]);

  const normalizedAmount = Number(formData.amount);
  const totalCents = Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? toCents(normalizedAmount) : 0;

  const equalShares = useMemo(
    () => buildEqualShares(totalCents, selectedParticipantIds),
    [totalCents, selectedParticipantIds]
  );

  const exactShares = useMemo(
    () => buildExactShares(selectedParticipantIds, exactShareInputs),
    [selectedParticipantIds, exactShareInputs]
  );

  const percentShares = useMemo(
    () => buildPercentShares(totalCents, selectedParticipantIds, percentShareInputs),
    [totalCents, selectedParticipantIds, percentShareInputs]
  );

  const computedShares =
    formData.split_type === "equal" ? equalShares : formData.split_type === "exact" ? exactShares : percentShares;

  const computedShareByUserId = useMemo(() => {
    return computedShares.reduce<Record<number, string>>((accumulator, share) => {
      accumulator[share.user_id] = toAmountString(Number(share.share_amount));
      return accumulator;
    }, {});
  }, [computedShares]);

  const memberNameById = useMemo(() => {
    return activeMembers.reduce<Record<number, string>>((accumulator, member) => {
      accumulator[member.user_id] = member.username;
      return accumulator;
    }, {});
  }, [activeMembers]);

  const sharedAmountLabel = useMemo(() => {
    if (equalShares.length === 0 || selectedParticipantIds.length === 0) {
      return null;
    }

    const firstShareAmount = Number(equalShares[0]?.share_amount ?? 0).toFixed(2);
    return t("addGroupExpenseDialog.equalSplitPreview", {
      amount: firstShareAmount,
      currency: groupCurrency,
    });
  }, [equalShares, groupCurrency, selectedParticipantIds.length, t]);

  const exactAssignedCents = useMemo(
    () =>
      selectedParticipantIds.reduce((sum, userId) => {
        const value = parseDecimal(exactShareInputs[userId] ?? "0");
        return sum + (Number.isFinite(value) ? Math.max(0, toCents(value)) : 0);
      }, 0),
    [selectedParticipantIds, exactShareInputs]
  );

  const percentAssigned = useMemo(() => {
    return selectedParticipantIds.reduce((sum, userId) => {
      const value = parseDecimal(percentShareInputs[userId] ?? "0");
      return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
    }, 0);
  }, [selectedParticipantIds, percentShareInputs]);

  const handleParticipantToggle = (userId: number, checked: boolean) => {
    setLocalError(null);
    setFormData((previous) => {
      const nextIds = checked
        ? [...previous.selectedMemberIds, userId]
        : previous.selectedMemberIds.filter((id) => id !== userId);

      return {
        ...previous,
        selectedMemberIds: nextIds,
      };
    });
  };

  const handleSplitTypeChange = (splitType: SplitType) => {
    setLocalError(null);

    if (splitType === formData.split_type) {
      return;
    }

    if (splitType === "exact" && totalCents > 0) {
      const defaults = buildEqualShares(totalCents, selectedParticipantIds).reduce<Record<number, string>>(
        (accumulator, share) => {
          accumulator[share.user_id] = toAmountString(Number(share.share_amount));
          return accumulator;
        },
        {}
      );
      setExactShareInputs(defaults);
    }

    if (splitType === "percent") {
      setPercentShareInputs(buildEqualPercentInputs(selectedParticipantIds));
    }

    setFormData((previous) => ({
      ...previous,
      split_type: splitType,
    }));
  };

  const handleSubmit = () => {
    const title = formData.title.trim();
    const parsedInterval = Number.parseInt(formData.interval_count || "1", 10);
    const normalizedInterval = Number.isFinite(parsedInterval) && parsedInterval > 0 ? parsedInterval : 1;

    if (!title) {
      setLocalError(t("addGroupExpenseDialog.errors.titleRequired"));
      return;
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0 || totalCents <= 0) {
      setLocalError(t("addGroupExpenseDialog.errors.invalidAmount"));
      return;
    }

    if (!formData.category_id) {
      setLocalError(t("addGroupExpenseDialog.errors.categoryRequired"));
      return;
    }

    if (!formData.starts_on) {
      setLocalError(t("addGroupRecurringExpenseDialog.errors.startDateRequired", { defaultValue: "Start date is required." }));
      return;
    }

    if (selectedParticipantIds.length === 0) {
      setLocalError(t("addGroupExpenseDialog.errors.participantsRequired"));
      return;
    }

    if (new Set(selectedParticipantIds).size !== selectedParticipantIds.length) {
      setLocalError(t("addGroupExpenseDialog.errors.duplicateParticipants"));
      return;
    }

    if (formData.split_type === "exact") {
      for (const userId of selectedParticipantIds) {
        const value = parseDecimal(exactShareInputs[userId] ?? "");
        if (!Number.isFinite(value) || value <= 0) {
          setLocalError(t("addGroupExpenseDialog.errors.exactShareRequired"));
          return;
        }
      }

      if (exactAssignedCents !== totalCents) {
        setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
        return;
      }
    }

    if (formData.split_type === "percent") {
      for (const userId of selectedParticipantIds) {
        const value = parseDecimal(percentShareInputs[userId] ?? "");
        if (!Number.isFinite(value) || value <= 0) {
          setLocalError(t("addGroupExpenseDialog.errors.invalidPercent"));
          return;
        }
      }

      if (Math.abs(percentAssigned - 100) > 0.01) {
        setLocalError(t("addGroupExpenseDialog.errors.percentTotalMustBe100"));
        return;
      }
    }

    if (computedShares.length !== selectedParticipantIds.length) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
      return;
    }

    const hasNonPositiveShare = computedShares.some((share) => Number(share.share_amount) <= 0);
    if (hasNonPositiveShare) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesPositive"));
      return;
    }

    const assignedTotalCents = computedShares.reduce((sum, share) => {
      return sum + toCents(Number(share.share_amount));
    }, 0);

    if (assignedTotalCents !== totalCents) {
      setLocalError(t("addGroupExpenseDialog.errors.sharesSumMismatch"));
      return;
    }

    setLocalError(null);

    onSubmit({
      title,
      amount: toAmountString(totalCents / 100),
      currency: groupCurrency,
      category_id: formData.category_id,
      split_type: formData.split_type,
      participants: computedShares.map((share) => ({
        user_id: share.user_id,
        share_amount: share.share_amount,
      })),
      frequency: formData.frequency,
      interval_count: normalizedInterval,
      starts_on: formData.starts_on,
      ends_on: formData.ends_on || null,
      notes: formData.notes.trim() ? formData.notes.trim() : null,
    });
  };

  const displayedError = localError ?? errorMessage ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg **:data-radix-dialog-close:cursor-pointer">
        <DialogHeader>
          <DialogTitle>
            {t("addGroupRecurringExpenseDialog.title", { defaultValue: "Add recurring group expense" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="group-recurring-title">{t("addGroupExpenseDialog.titleLabel")}</Label>
            <Input
              id="group-recurring-title"
              placeholder={t("addGroupExpenseDialog.titlePlaceholder")}
              value={formData.title}
              onChange={(event) => {
                setLocalError(null);
                setFormData((previous) => ({ ...previous, title: event.target.value }));
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="group-recurring-amount">{t("addGroupExpenseDialog.amount")}</Label>
              <Input
                id="group-recurring-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("addGroupExpenseDialog.amountPlaceholder")}
                value={formData.amount}
                onChange={(event) => {
                  setLocalError(null);
                  setFormData((previous) => ({ ...previous, amount: event.target.value }));
                }}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-recurring-currency">{t("addGroupExpenseDialog.currency")}</Label>
              <Input id="group-recurring-currency" value={groupCurrency} disabled readOnly />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-recurring-split-type">{t("addGroupExpenseDialog.splitType")}</Label>
            <Select value={formData.split_type} onValueChange={(value) => handleSplitTypeChange(value as SplitType)}>
              <SelectTrigger id="group-recurring-split-type" className="w-full">
                <SelectValue placeholder={t("addGroupExpenseDialog.splitTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">{t("addGroupExpenseDialog.splitTypeEqual")}</SelectItem>
                <SelectItem value="exact">{t("addGroupExpenseDialog.splitTypeExact")}</SelectItem>
                <SelectItem value="percent">{t("addGroupExpenseDialog.splitTypePercent")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-recurring-category">{t("addGroupExpenseDialog.category")}</Label>
            <CategoryPicker
              value={String(formData.category_id)}
              onValueChange={(value) => {
                setLocalError(null);
                setFormData((previous) => ({
                  ...previous,
                  category_id: Number(value),
                }));
              }}
              categories={categories}
              onCreateCustomCategory={onCreateGroupCategory}
              onDeleteCustomCategory={onDeleteGroupCategory}
              trigger="button"
              showLabel={false}
              mobileInset={false}
              showSelectedGroupPrefix
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="group-recurring-frequency">
                {t("addExpenseDialog.recurringFrequency", { defaultValue: "Frequency" })}
              </Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    frequency: value as RecurrenceFrequency,
                  }))
                }
              >
                <SelectTrigger id="group-recurring-frequency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("addExpenseDialog.recurringDaily", { defaultValue: "Daily" })}</SelectItem>
                  <SelectItem value="weekly">{t("addExpenseDialog.recurringWeekly", { defaultValue: "Weekly" })}</SelectItem>
                  <SelectItem value="monthly">{t("addExpenseDialog.recurringMonthly", { defaultValue: "Monthly" })}</SelectItem>
                  <SelectItem value="quarterly">{t("addExpenseDialog.recurringQuarterly", { defaultValue: "Quarterly" })}</SelectItem>
                  <SelectItem value="yearly">{t("addExpenseDialog.recurringYearly", { defaultValue: "Yearly" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-recurring-interval">
                {t("addExpenseDialog.recurringInterval", { defaultValue: "Every N periods" })}
              </Label>
              <Input
                id="group-recurring-interval"
                type="number"
                min="1"
                step="1"
                value={formData.interval_count}
                onChange={(event) =>
                  setFormData((previous) => ({
                    ...previous,
                    interval_count: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="group-recurring-starts-on">{t("recurringExpenses.startsOn", { defaultValue: "Starts on" })}</Label>
              <DatePicker
                id="group-recurring-starts-on"
                value={formData.starts_on}
                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    starts_on: value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="group-recurring-ends-on">{t("addExpenseDialog.recurringEndsOn", { defaultValue: "End date (optional)" })}</Label>
              <DatePicker
                id="group-recurring-ends-on"
                value={formData.ends_on}
                onChange={(value) =>
                  setFormData((previous) => ({
                    ...previous,
                    ends_on: value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="group-recurring-notes">{t("addGroupExpenseDialog.notes")}</Label>
            <Textarea
              id="group-recurring-notes"
              placeholder={t("addGroupExpenseDialog.notesPlaceholder")}
              value={formData.notes}
              onChange={(event) => {
                setLocalError(null);
                setFormData((previous) => ({ ...previous, notes: event.target.value }));
              }}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("addGroupExpenseDialog.participants")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("addGroupExpenseDialog.selectedParticipants", {
                  count: selectedParticipantIds.length,
                })}
              </p>
            </div>

            <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border border-border p-2">
              {activeMembers.map((member) => {
                const checked = selectedMemberIdSet.has(member.user_id);

                return (
                  <label
                    key={member.id}
                    htmlFor={`recurring-participant-${member.user_id}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60"
                  >
                    <span className="text-sm text-foreground">{member.username}</span>
                    <input
                      id={`recurring-participant-${member.user_id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => handleParticipantToggle(member.user_id, event.target.checked)}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>

            {sharedAmountLabel ? (
              <p className="text-xs text-muted-foreground">{sharedAmountLabel}</p>
            ) : null}

            {formData.split_type === "exact" ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                {selectedParticipantIds.map((userId) => (
                  <div key={`recurring-exact-share-${userId}`} className="grid grid-cols-[1fr_140px] items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {memberNameById[userId] ?? `${t("groupExpensesList.userPrefix")}#${userId}`}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={exactShareInputs[userId] ?? ""}
                      onChange={(event) => {
                        setLocalError(null);
                        setExactShareInputs((previous) => ({
                          ...previous,
                          [userId]: event.target.value,
                        }));
                      }}
                    />
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {t("addGroupExpenseDialog.exactSplitSummary", {
                    assigned: toAmountString(exactAssignedCents / 100),
                    total: toAmountString(totalCents / 100),
                    currency: groupCurrency,
                  })}
                </p>
              </div>
            ) : null}

            {formData.split_type === "percent" ? (
              <div className="space-y-2 rounded-md border border-border p-3">
                {selectedParticipantIds.map((userId) => (
                  <div key={`recurring-percent-share-${userId}`} className="grid grid-cols-[1fr_90px_120px] items-center gap-2">
                    <span className="truncate text-sm text-foreground">
                      {memberNameById[userId] ?? `${t("groupExpensesList.userPrefix")}#${userId}`}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={percentShareInputs[userId] ?? ""}
                      onChange={(event) => {
                        setLocalError(null);
                        setPercentShareInputs((previous) => ({
                          ...previous,
                          [userId]: event.target.value,
                        }));
                      }}
                    />
                    <span className="text-right text-xs text-muted-foreground">
                      {computedShareByUserId[userId] ?? "0.00"} {groupCurrency}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  {t("addGroupExpenseDialog.percentSplitSummary", {
                    assigned: (Math.round(percentAssigned * 100) / 100).toFixed(2),
                  })}
                </p>
              </div>
            ) : null}
          </div>

          {displayedError ? <p className="text-sm text-destructive">{displayedError}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addGroupExpenseDialog.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? t("addGroupRecurringExpenseDialog.submitting", { defaultValue: "Adding..." })
              : t("addGroupRecurringExpenseDialog.submit", { defaultValue: "Add recurring" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
