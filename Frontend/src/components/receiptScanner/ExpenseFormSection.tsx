import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/ui/date-picker";
import CategoryPicker from "@/components/expenses/CategoryPicker";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CurrencyEnum } from "@/types/enums";
import type {
  ApiCategoryResponse,
  ApiGroupMemberResponse,
  ApiGroupResponse,
  ExpenseScope,
} from "@/types/receiptScanner";

interface ExpenseFormSectionProps {
  expenseScope: ExpenseScope;
  selectedGroupId: number;
  selectedMemberIds: number[];
  currency: CurrencyEnum;
  categoryId: number;
  expenseDate: string;
  titleDraft: string;
  parsedTotal: string;
  localError: string | null;
  localSuccess: string | null;
  activeGroups: ApiGroupResponse[];
  activeGroupMembers: ApiGroupMemberResponse[];
  selectedParticipants: ApiGroupMemberResponse[];
  selectedGroup: ApiGroupResponse | null;
  categories: ApiCategoryResponse[];
  selectedTotal: number;
  createExpenseMutationPending: boolean;
  createGroupExpenseMutationPending: boolean;
  onExpenseScopeChange: (scope: ExpenseScope) => void;
  onSelectedGroupIdChange: (groupId: number) => void;
  onSelectedMemberIdsChange: (memberIds: number[]) => void;
  onCurrencyChange: (currency: CurrencyEnum) => void;
  onCategoryIdChange: (categoryId: number) => void;
  onExpenseDateChange: (date: string) => void;
  onTitleDraftChange: (title: string) => void;
  onParsedTotalChange: (total: string) => void;
  onCreateFromParsedTotal: () => void;
  onCreateFromSelected: () => void;
  scopeLabel: string;
  scopePersonal: string;
  scopeGroup: string;
  groupLabel: string;
  groupPlaceholder: string;
  titleFieldLabel: string;
  titlePlaceholder: string;
  parsedTotalLabel: string;
  currencyLabel: string;
  expenseDateLabel: string;
  categoryLabel: string;
  participantsLabel: string;
  selectedParticipantsLabel: (params: { count: number }) => string;
  createFromTotal: string;
  createFromSelected: string;
  canCreateFromTotal: boolean;
  canCreateFromSelected: boolean;
  selectedTotalLabel: (params: { amount: string; currency: string }) => string;
  noActiveGroupsError: string;
}

export default function ExpenseFormSection({
  expenseScope,
  selectedGroupId,
  selectedMemberIds,
  currency,
  categoryId,
  expenseDate,
  titleDraft,
  parsedTotal,
  localError,
  localSuccess,
  activeGroups,
  activeGroupMembers,
  selectedParticipants,
  selectedGroup,
  categories,
  selectedTotal,
  createExpenseMutationPending,
  createGroupExpenseMutationPending,
  onExpenseScopeChange,
  onSelectedGroupIdChange,
  onSelectedMemberIdsChange,
  onCurrencyChange,
  onCategoryIdChange,
  onExpenseDateChange,
  onTitleDraftChange,
  onParsedTotalChange,
  onCreateFromParsedTotal,
  onCreateFromSelected,
  scopeLabel,
  scopePersonal,
  scopeGroup,
  groupLabel,
  groupPlaceholder,
  titleFieldLabel,
  titlePlaceholder,
  parsedTotalLabel,
  currencyLabel,
  expenseDateLabel,
  categoryLabel,
  participantsLabel,
  selectedParticipantsLabel,
  createFromTotal,
  createFromSelected,
  canCreateFromTotal,
  canCreateFromSelected,
  selectedTotalLabel,
  noActiveGroupsError,
}: ExpenseFormSectionProps) {
  const isMutationPending = createExpenseMutationPending || createGroupExpenseMutationPending;

  const selectedParticipantsText = useMemo(
    () => selectedParticipantsLabel({ count: selectedParticipants.length }),
    [selectedParticipantsLabel, selectedParticipants.length]
  );

  const selectedTotalText = useMemo(
    () =>
      selectedTotalLabel({
        amount: selectedTotal.toFixed(2),
        currency: expenseScope === "group" ? selectedGroup?.currency ?? currency : currency,
      }),
    [selectedTotalLabel, selectedTotal, expenseScope, selectedGroup, currency]
  );

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="receipt-scan-scope">{scopeLabel}</Label>
          <Select
            value={expenseScope}
            onValueChange={(value) => onExpenseScopeChange(value as ExpenseScope)}
          >
            <SelectTrigger id="receipt-scan-scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="personal">{scopePersonal}</SelectItem>
                <SelectItem value="group">{scopeGroup}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {expenseScope === "group" ? (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="receipt-scan-group">{groupLabel}</Label>
            <Select
              value={selectedGroupId > 0 ? String(selectedGroupId) : ""}
              onValueChange={(value) => onSelectedGroupIdChange(Number(value))}
            >
              <SelectTrigger id="receipt-scan-group">
                <SelectValue placeholder={groupPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {activeGroups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="receipt-scan-title">{titleFieldLabel}</Label>
          <Input
            id="receipt-scan-title"
            value={titleDraft}
            onChange={(event) => onTitleDraftChange(event.target.value)}
            placeholder={titlePlaceholder}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="receipt-scan-total">{parsedTotalLabel}</Label>
          <Input
            id="receipt-scan-total"
            value={parsedTotal}
            onChange={(event) => onParsedTotalChange(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="receipt-scan-currency">{currencyLabel}</Label>
          {expenseScope === "group" ? (
            <Input id="receipt-scan-currency" value={selectedGroup?.currency ?? currency} disabled />
          ) : (
            <CurrencyPicker
              id="receipt-scan-currency"
              selectedCurrency={currency}
              onCurrencyChange={onCurrencyChange}
            />
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="receipt-expense-date">{expenseDateLabel}</Label>
          <DatePicker
            id="receipt-expense-date"
            value={expenseDate}
            onChange={onExpenseDateChange}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="receipt-scan-category">{categoryLabel}</Label>
          <CategoryPicker
            value={categoryId ? String(categoryId) : "all"}
            onValueChange={(value) => {
              if (value === "all") {
                onCategoryIdChange(0);
                return;
              }
              onCategoryIdChange(Number(value));
            }}
            categories={categories}
            trigger="button"
            showLabel={false}
            mobileInset={false}
            showSelectedGroupPrefix
          />
        </div>

        {expenseScope === "group" ? (
          <div className="space-y-2 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{participantsLabel}</Label>
              <p className="text-xs text-muted-foreground">{selectedParticipantsText}</p>
            </div>

            <div className="max-h-36 space-y-2 overflow-y-auto rounded-md border border-border bg-background/40 p-2">
              {activeGroupMembers.map((member) => {
                const checked = selectedMemberIds.includes(member.user_id);
                return (
                  <label
                    key={member.id}
                    htmlFor={`scanner-participant-${member.user_id}`}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/60"
                  >
                    <span className="text-sm text-foreground">{member.username}</span>
                    <input
                      id={`scanner-participant-${member.user_id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextChecked = event.target.checked;
                        onSelectedMemberIdsChange(
                          nextChecked
                            ? [...selectedMemberIds, member.user_id]
                            : selectedMemberIds.filter((id) => id !== member.user_id)
                        );
                      }}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCreateFromParsedTotal}
          disabled={isMutationPending || !canCreateFromTotal}
        >
          {createFromTotal}
        </Button>
        <Button
          type="button"
          onClick={() => void onCreateFromSelected()}
          disabled={isMutationPending || !canCreateFromSelected}
        >
          {createFromSelected}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{selectedTotalText}</p>

      {expenseScope === "group" && activeGroups.length === 0 ? (
        <p className="text-xs text-destructive">{noActiveGroupsError}</p>
      ) : null}

      {localError ? <p className="text-xs text-destructive">{localError}</p> : null}
      {localSuccess ? <p className="text-xs text-emerald-600">{localSuccess}</p> : null}
    </section>
  );
}
