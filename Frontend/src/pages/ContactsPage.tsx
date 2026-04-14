import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, HandCoins, Search, UsersRound } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi } from "@/api/contactsApi";
import { balancesApi } from "@/api/balancesApi";
import { groupsApi } from "@/api/groupsApi";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";

import type {
  ApiContactBalanceByGroup,
  ApiContactResponse,
  ApiGroupResponse,
} from "@/types";

const CONTACTS_LIMIT = 100;

type ContactBalanceRow = {
  contact: ApiContactResponse;
  currencyTotals: Record<string, number>;
  absoluteTotal: number;
};

type GroupSettlementTarget = {
  contactUserId: number;
  contactUsername: string;
  groupId: number;
  groupName: string;
  amount: number;
  currency: string;
};

type TotalSettlementTarget = {
  contactUserId: number;
  contactUsername: string;
};

type TotalSettlementOptionsTarget = {
  contactUserId: number;
  contactUsername: string;
  currency: string;
};

export default function ContactsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedContactUserId, setExpandedContactUserId] = useState<number | null>(null);
  const [settlementFeedback, setSettlementFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [totalSettlementOptionsTarget, setTotalSettlementOptionsTarget] = useState<TotalSettlementOptionsTarget | null>(null);
  const [groupSettlementOptionsTarget, setGroupSettlementOptionsTarget] = useState<GroupSettlementTarget | null>(null);
  const [groupSettlementTarget, setGroupSettlementTarget] = useState<GroupSettlementTarget | null>(null);
  const [totalSettlementTarget, setTotalSettlementTarget] = useState<TotalSettlementTarget | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedSummaryCurrency, setSelectedSummaryCurrency] = useState<string>("");
  const isPayPalSdkEnabled = Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID);

  const mapTotalSettlementError = (message: string | undefined) => {
    return message === "Cannot settle with yourself"
      ? t("contactsBalancesPage.settlementErrors.cannotSettleWithYourself")
      : message === "No debts to settle"
        ? t("contactsBalancesPage.settlementErrors.noDebtsToSettle")
        : message === "Not authorized"
          ? t("contactsBalancesPage.settlementErrors.notAuthorized")
          : message === "Group not found"
            ? t("contactsBalancesPage.settlementErrors.groupNotFound")
            : message || t("contactsBalancesPage.settlementErrors.settleFailed");
  };

  const mapGroupSettlementError = (message: string | undefined) => {
    return message === "Cannot settle with yourself"
      ? t("contactsBalancesPage.settlementErrors.cannotSettleWithYourself")
      : message === "Group id is required"
        ? t("contactsBalancesPage.settlementErrors.groupIdRequired")
        : message === "Member not found"
          ? t("contactsBalancesPage.settlementErrors.memberNotFound")
          : message === "No balance with this user"
            ? t("contactsBalancesPage.settlementErrors.noBalanceWithUser")
            : message === "No debt between users"
              ? t("contactsBalancesPage.settlementErrors.noDebtBetweenUsers")
              : message === "This user owes you money"
                ? t("contactsBalancesPage.settlementErrors.otherUserOwesYou")
                : message === "Group not found"
                  ? t("contactsBalancesPage.settlementErrors.groupNotFound")
                  : message === "Not authorized"
                    ? t("contactsBalancesPage.settlementErrors.notAuthorized")
                    : message || t("contactsBalancesPage.settlementErrors.settleGroupFailed");
  };

  const mapPayPalSettlementError = (message: string | undefined) => {
    return message === "PayPal integration not configured"
      ? t("contactsBalancesPage.settlementErrors.paypalNotConfigured")
      : message === "Could not create PayPal order"
        ? t("contactsBalancesPage.settlementErrors.paypalCreateOrderFailed")
        : message === "PayPal request failed"
          ? t("contactsBalancesPage.settlementErrors.paypalCreateOrderFailed")
          : message === "PayPal capture was not completed"
            ? t("contactsBalancesPage.settlementErrors.paypalCaptureFailed")
          : message === "Total PayPal settlement supports one currency at a time"
            ? t("contactsBalancesPage.settlementErrors.paypalMultiCurrencyNotSupported")
            : message === "No payable amount for PayPal settlement"
              ? t("contactsBalancesPage.settlementErrors.paypalNoPayableAmount")
              : message || t("contactsBalancesPage.settlementErrors.paypalInitFailed");
  };

  const createTotalPayPalOrder = async (toUserId: number): Promise<string> => {
    setSettlementFeedback(null);
    const response = await settlementsApi.initiateTotalPayPal({ to_user_id: toUserId });
    return response.order_id;
  };

  const finalizeTotalPayPalOrder = async (orderId: string, toUserId: number) => {
    await settlementsApi.finalizePayPal({ order_id: orderId });
    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

    setSettlementFeedback({
      tone: "success",
      message: t("contactsBalancesPage.settlementSuccess"),
    });
    setTotalSettlementOptionsTarget(null);
    setTotalSettlementTarget(null);
  };

  const createGroupPayPalOrder = async (toUserId: number, groupId: number): Promise<string> => {
    setSettlementFeedback(null);
    const response = await settlementsApi.initiateGroupPayPal({
      to_user_id: toUserId,
      group_id: groupId,
    });
    return response.order_id;
  };

  const finalizeGroupPayPalOrder = async (orderId: string, toUserId: number, groupId: number) => {
    await settlementsApi.finalizePayPal({ order_id: orderId });
    await queryClient.invalidateQueries({ queryKey: ["balances"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(groupId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

    const groupName = groupById[groupId]
      ? formatGroupName(groupById[groupId].name)
      : t("contactsBalancesPage.unknownGroup", { groupId });

    setSettlementFeedback({
      tone: "success",
      message: t("contactsBalancesPage.settlementGroupSuccess", { groupName }),
    });
    setGroupSettlementOptionsTarget(null);
    setGroupSettlementTarget(null);
  };

  const settleTotalCashMutation = useMutation({
    mutationFn: (toUserId: number) =>
      settlementsApi.createTotalCash({
        to_user_id: toUserId,
      }),
    onMutate: () => {
      setSettlementFeedback(null);
    },
    onSuccess: async (_data, toUserId) => {
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

      setSettlementFeedback({
        tone: "success",
        message: t("contactsBalancesPage.settlementSuccess"),
      });
      setTotalSettlementOptionsTarget(null);
      setTotalSettlementTarget(null);
    },
    onError: (mutationError: Error) => {
      setSettlementFeedback({
        tone: "error",
        message: mapTotalSettlementError(mutationError.message),
      });
    },
  });

  const settleGroupCashMutation = useMutation({
    mutationFn: (payload: { toUserId: number; groupId: number }) =>
      settlementsApi.createGroupCash({
        to_user_id: payload.toUserId,
        group_id: payload.groupId,
      }),
    onMutate: () => {
      setSettlementFeedback(null);
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["balances"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.group(variables.groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.balances.contactByGroups(variables.toUserId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.group(variables.groupId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.settlements.user() });

      const groupName = groupById[variables.groupId]
        ? formatGroupName(groupById[variables.groupId].name)
        : t("contactsBalancesPage.unknownGroup", { groupId: variables.groupId });

      setSettlementFeedback({
        tone: "success",
        message: t("contactsBalancesPage.settlementGroupSuccess", {
          groupName,
        }),
      });
      setGroupSettlementOptionsTarget(null);
      setGroupSettlementTarget(null);
    },
    onError: (mutationError: Error) => {
      setSettlementFeedback({
        tone: "error",
        message: mapGroupSettlementError(mutationError.message),
      });
    },
  });

  const {
    data: contacts = [],
    isLoading: contactsLoading,
    error: contactsError,
  } = useQuery<ApiContactResponse[]>({
    queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    queryFn: () => contactsApi.list({ limit: CONTACTS_LIMIT, offset: 0 }),
    enabled: !!user,
  });

  const {
    data: groups = [],
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery<ApiGroupResponse[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.listAll(),
    enabled: !!user,
  });

  const contactBreakdownQueries = useQueries({
    queries: contacts.map((contact) => ({
      queryKey: queryKeys.balances.contactByGroups(contact.contact_id),
      queryFn: () => balancesApi.getContactByGroups(contact.contact_id),
      enabled: !!user,
    })),
  });

  const groupById = useMemo(() => {
    return groups.reduce<Record<number, ApiGroupResponse>>((accumulator, group) => {
      accumulator[group.id] = group;
      return accumulator;
    }, {});
  }, [groups]);

  const breakdownByContactId = useMemo(() => {
    return contacts.reduce<Record<number, ApiContactBalanceByGroup[]>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = contactBreakdownQueries[index]?.data ?? [];
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const breakdownLoadingByContactId = useMemo(() => {
    return contacts.reduce<Record<number, boolean>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = contactBreakdownQueries[index]?.isLoading ?? false;
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const breakdownErrorByContactId = useMemo(() => {
    return contacts.reduce<Record<number, boolean>>((accumulator, contact, index) => {
      accumulator[contact.contact_id] = Boolean(contactBreakdownQueries[index]?.error);
      return accumulator;
    }, {});
  }, [contacts, contactBreakdownQueries]);

  const contactRows = useMemo(() => {
    return contacts
      .map<ContactBalanceRow>((contact) => {
        const breakdown = breakdownByContactId[contact.contact_id] ?? [];

        const currencyTotals = breakdown.reduce<Record<string, number>>((accumulator, item) => {
          const groupCurrency = groupById[item.group_id]?.currency ?? t("contactsBalancesPage.unknownCurrency");
          accumulator[groupCurrency] = (accumulator[groupCurrency] ?? 0) + Number(item.balance);
          return accumulator;
        }, {});

        const absoluteTotal = Object.values(currencyTotals).reduce((accumulator, amount) => {
          return accumulator + Math.abs(amount);
        }, 0);

        return {
          contact,
          currencyTotals,
          absoluteTotal,
        };
      })
      .sort((left, right) => right.absoluteTotal - left.absoluteTotal);
  }, [contacts, breakdownByContactId, groupById, t]);

  const summary = useMemo(() => {
    return contactRows.reduce(
      (accumulator, row) => {
        Object.entries(row.currencyTotals).forEach(([currency, amount]) => {
          if (amount > 0) {
            accumulator.othersOweMe[currency] = (accumulator.othersOweMe[currency] ?? 0) + amount;
          } else if (amount < 0) {
            accumulator.iOweOthers[currency] = (accumulator.iOweOthers[currency] ?? 0) + Math.abs(amount);
          }
        });
        return accumulator;
      },
      { othersOweMe: {} as Record<string, number>, iOweOthers: {} as Record<string, number> }
    );
  }, [contactRows]);

  const summaryCurrencies = useMemo(() => {
    const currencySet = new Set<string>();

    contactRows.forEach((row) => {
      Object.entries(row.currencyTotals).forEach(([currency, amount]) => {
        if (amount !== 0) {
          currencySet.add(currency);
        }
      });
    });

    return Array.from(currencySet).sort((left, right) => left.localeCompare(right));
  }, [contactRows]);

  useEffect(() => {
    if (summaryCurrencies.length === 0) {
      setSelectedSummaryCurrency("");
      return;
    }

    if (!summaryCurrencies.includes(selectedSummaryCurrency)) {
      setSelectedSummaryCurrency(summaryCurrencies[0]);
    }
  }, [summaryCurrencies, selectedSummaryCurrency]);

  const summaryOthersOweAmount = selectedSummaryCurrency
    ? summary.othersOweMe[selectedSummaryCurrency] ?? 0
    : 0;

  const summaryYouOweAmount = selectedSummaryCurrency
    ? summary.iOweOthers[selectedSummaryCurrency] ?? 0
    : 0;

  const filteredContactRows = useMemo(() => {
    const normalizedSearch = contactSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return contactRows;
    }

    return contactRows.filter((row) => {
      const username = row.contact.username.toLowerCase();
      const email = row.contact.email.toLowerCase();
      return username.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [contactRows, contactSearch]);

  const formatSignedCurrencyTotals = (currencyTotals: Record<string, number>) => {
    const entries = Object.entries(currencyTotals)
      .filter(([, amount]) => amount !== 0)
      .sort((left, right) => Math.abs(right[1]) - Math.abs(left[1]));

    if (entries.length === 0) {
      return t("contactsBalancesPage.settled");
    }

    return entries
      .map(([currency, amount]) => `${amount > 0 ? "+" : "-"}${Math.abs(amount).toFixed(2)} ${currency}`)
      .join(" · ");
  };

  const expandedContactBreakdown = useMemo(() => {
    if (expandedContactUserId === null) {
      return [];
    }

    return breakdownByContactId[expandedContactUserId] ?? [];
  }, [expandedContactUserId, breakdownByContactId]);

  const expandedBreakdownLoading = expandedContactUserId !== null
    ? (breakdownLoadingByContactId[expandedContactUserId] ?? false)
    : false;

  const expandedBreakdownError = expandedContactUserId !== null
    ? (breakdownErrorByContactId[expandedContactUserId] ?? false)
    : false;

  const expandedGroupRows = useMemo(() => {
    return expandedContactBreakdown
      .map((row) => {
        const amount = Number(row.balance);
        const group = groupById[row.group_id];
        return {
          groupId: row.group_id,
          amount,
          absoluteAmount: Math.abs(amount),
          groupName: group ? formatGroupName(group.name) : t("contactsBalancesPage.unknownGroup", { groupId: row.group_id }),
          groupCurrency: group?.currency ?? "",
        };
      })
      .filter((row) => row.amount !== 0)
      .sort((left, right) => right.absoluteAmount - left.absoluteAmount);
  }, [expandedContactBreakdown, groupById, t]);

  if (!user || contactsLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (contactsError || groupsError) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {contactsError?.message || groupsError?.message || t("common.somethingWentWrong")}
          </p>
          <Link to={createPageUrl("Dashboard")} className="mt-4 inline-block">
            <Button variant="outline">{t("contactsBalancesPage.backToDashboard")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link to={createPageUrl("Dashboard")}> 
            <Button variant="ghost" className="mb-3 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("contactsBalancesPage.backToDashboard")}
            </Button>
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("contactsBalancesPage.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("contactsBalancesPage.subtitle")}</p>
        </div>

        <div className="mb-6 mx-auto flex w-full max-w-md items-stretch gap-3">
          <Card className="min-w-0 flex-1 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="flex aspect-square flex-col justify-between p-4">
              <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.contactsCount")}</p>
              <div className="self-center text-center">
                <p className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
                  <UsersRound className="h-5 w-5 text-primary" />
                  {contactRows.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 flex-1 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="flex aspect-square flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground sm:text-sm">{t("contactsBalancesPage.othersOweYou")}</p>
                {summaryCurrencies.length > 0 ? (
                  <Select value={selectedSummaryCurrency} onValueChange={setSelectedSummaryCurrency}>
                    <SelectTrigger className="h-8 w-[74px] text-xs sm:w-[92px] sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {summaryCurrencies.map((currency) => (
                        <SelectItem key={`summary-others-${currency}`} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>

              <p className="text-center text-lg font-bold text-emerald-700 sm:text-2xl">
                {summaryCurrencies.length > 0
                  ? `${summaryOthersOweAmount.toFixed(2)} ${selectedSummaryCurrency}`
                  : t("contactsBalancesPage.settled")}
              </p>
            </CardContent>
          </Card>

          <Card className="min-w-0 flex-1 border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="flex aspect-square flex-col justify-between p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground sm:text-sm">{t("contactsBalancesPage.youOweOthers")}</p>
                {summaryCurrencies.length > 0 ? (
                  <Select value={selectedSummaryCurrency} onValueChange={setSelectedSummaryCurrency}>
                    <SelectTrigger className="h-8 w-[74px] text-xs sm:w-[92px] sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {summaryCurrencies.map((currency) => (
                        <SelectItem key={`summary-owe-${currency}`} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>

              <p className="text-center text-lg font-bold text-rose-700 sm:text-2xl">
                {summaryCurrencies.length > 0
                  ? `${summaryYouOweAmount.toFixed(2)} ${selectedSummaryCurrency}`
                  : t("contactsBalancesPage.settled")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t("contactsBalancesPage.listTitle")}</h2>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={contactSearch}
              onChange={(event) => setContactSearch(event.target.value)}
              placeholder={t("contactsBalancesPage.searchPlaceholder", { defaultValue: "Search contacts" })}
              className="pl-9"
            />
          </div>
        </div>

        {settlementFeedback ? (
          <p
            className={`mb-3 text-sm ${
              settlementFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"
            }`}
          >
            {settlementFeedback.message}
          </p>
        ) : null}

        {filteredContactRows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            {contactRows.length === 0
              ? t("contactsBalancesPage.empty")
              : t("contactsBalancesPage.searchNoResults", { defaultValue: "No contacts match your search." })}
          </p>
        ) : (
          <div className="mx-auto max-w-3xl space-y-2">
            {filteredContactRows.map((row) => {
                  const rowBreakdown = breakdownByContactId[row.contact.contact_id] ?? [];
                  const payableGroupCount = rowBreakdown.filter((item) => Number(item.balance) < 0).length;
                  const payableCurrency =
                    Object.keys(row.currencyTotals).find((currency) => (row.currencyTotals[currency] ?? 0) < 0) ?? "PLN";
                  const isExpanded = expandedContactUserId === row.contact.contact_id;
                  const balanceLabel = formatSignedCurrencyTotals(row.currencyTotals);
                  const hasPositive = Object.values(row.currencyTotals).some((amount) => amount > 0);
                  const hasNegative = Object.values(row.currencyTotals).some((amount) => amount < 0);
                  const canSettleTotal = hasNegative && payableGroupCount > 1;

                  return (
                    <div key={row.contact.id} className="rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted/40"
                        onClick={() =>
                          setExpandedContactUserId((previous) =>
                            previous === row.contact.contact_id ? null : row.contact.contact_id
                          )
                        }
                        aria-expanded={isExpanded}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{row.contact.username}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.contact.email}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${hasPositive && !hasNegative ? "text-emerald-700" : hasNegative && !hasPositive ? "text-rose-700" : "text-foreground"}`}>
                              {balanceLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {hasPositive && hasNegative
                                ? t("contactsBalancesPage.mixedDirections")
                                : hasPositive
                                  ? t("contactsBalancesPage.contactOwesYou")
                                  : hasNegative
                                    ? t("contactsBalancesPage.youOweContact")
                                    : t("contactsBalancesPage.settled")}
                            </p>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border px-3 py-3">
                          {canSettleTotal ? (
                            <div className="mb-3 flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setTotalSettlementOptionsTarget({
                                    contactUserId: row.contact.contact_id,
                                    contactUsername: row.contact.username,
                                    currency: payableCurrency,
                                  });
                                }}
                              >
                                {t("contactsBalancesPage.settle", { defaultValue: "Settle" })}
                              </Button>
                            </div>
                          ) : null}

                          {expandedBreakdownLoading ? (
                            <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.loadingBreakdown")}</p>
                          ) : expandedBreakdownError ? (
                            <p className="text-sm text-destructive">{t("contactsBalancesPage.errorBreakdown")}</p>
                          ) : expandedGroupRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.noGroupRows")}</p>
                          ) : (
                            <div className="space-y-2">
                              {expandedGroupRows.map((groupRow) => (
                                <div key={groupRow.groupId} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">{groupRow.groupName}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {groupRow.amount > 0
                                        ? t("contactsBalancesPage.contactOwesYou")
                                        : t("contactsBalancesPage.youOweContact")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className={`whitespace-nowrap text-sm font-semibold ${groupRow.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                      {groupRow.absoluteAmount.toFixed(2)} {groupRow.groupCurrency}
                                    </p>
                                    {groupRow.amount < 0 ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setGroupSettlementOptionsTarget({
                                              contactUserId: row.contact.contact_id,
                                              contactUsername: row.contact.username,
                                              groupId: groupRow.groupId,
                                              groupName: groupRow.groupName,
                                              amount: groupRow.absoluteAmount,
                                              currency: groupRow.groupCurrency,
                                            });
                                          }}
                                        >
                                          {t("contactsBalancesPage.settle", { defaultValue: "Settle" })}
                                        </Button>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
          </div>
        )}
      </div>

      <Dialog
        open={totalSettlementOptionsTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTotalSettlementOptionsTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contactsBalancesPage.settle", { defaultValue: "Settle" })}</DialogTitle>
            <DialogDescription>
              {totalSettlementOptionsTarget
                ? t("contactsBalancesPage.totalSettleDialogDescription", {
                    defaultValue: "Choose how to settle with {{contact}}.",
                    contact: totalSettlementOptionsTarget.contactUsername,
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                !totalSettlementOptionsTarget ||
                (settleTotalCashMutation.isPending &&
                  settleTotalCashMutation.variables === totalSettlementOptionsTarget.contactUserId)
              }
              onClick={() => {
                if (!totalSettlementOptionsTarget) {
                  return;
                }

                setTotalSettlementTarget({
                  contactUserId: totalSettlementOptionsTarget.contactUserId,
                  contactUsername: totalSettlementOptionsTarget.contactUsername,
                });
                setTotalSettlementOptionsTarget(null);
              }}
            >
              {settleTotalCashMutation.isPending
                ? t("contactsBalancesPage.settlingTotalCash")
                : t("contactsBalancesPage.settleOutsideGroup", { defaultValue: "Outside group" })}
            </Button>

            {isPayPalSdkEnabled ? (
              <div className="w-[180px]">
                <PayPalCurrencyButtons
                  currency={totalSettlementOptionsTarget?.currency ?? "PLN"}
                  fundingSource="paypal"
                  style={{ layout: "horizontal", tagline: false, height: 34 }}
                  forceReRender={[
                    totalSettlementOptionsTarget?.contactUserId ?? 0,
                    totalSettlementOptionsTarget?.currency ?? "PLN",
                  ]}
                  createOrder={async () => {
                    if (!totalSettlementOptionsTarget) {
                      throw new Error("Missing total settlement target");
                    }

                    try {
                      return await createTotalPayPalOrder(totalSettlementOptionsTarget.contactUserId);
                    } catch (error) {
                      const message = error instanceof Error ? error.message : undefined;
                      setSettlementFeedback({
                        tone: "error",
                        message: mapPayPalSettlementError(message),
                      });
                      throw error;
                    }
                  }}
                  onApprove={async (data) => {
                    if (!data.orderID || !totalSettlementOptionsTarget) {
                      setSettlementFeedback({
                        tone: "error",
                        message: t("contactsBalancesPage.settlementErrors.paypalInitFailed"),
                      });
                      return;
                    }

                    try {
                      await finalizeTotalPayPalOrder(data.orderID, totalSettlementOptionsTarget.contactUserId);
                    } catch (error) {
                      const message = error instanceof Error ? error.message : undefined;
                      setSettlementFeedback({
                        tone: "error",
                        message: mapPayPalSettlementError(message),
                      });
                    }
                  }}
                  onCancel={() => {
                    setSettlementFeedback({
                      tone: "error",
                      message: t("contactsBalancesPage.settlementErrors.paypalCancelled"),
                    });
                  }}
                  onError={(error) => {
                    const message = error instanceof Error ? error.message : undefined;
                    setSettlementFeedback({
                      tone: "error",
                      message: mapPayPalSettlementError(message),
                    });
                  }}
                />
              </div>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                {t("contactsBalancesPage.settlementErrors.paypalSdkNotConfigured")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={groupSettlementOptionsTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGroupSettlementOptionsTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("contactsBalancesPage.settle", { defaultValue: "Settle" })}</DialogTitle>
            <DialogDescription>
              {groupSettlementOptionsTarget
                ? t("contactsBalancesPage.groupSettleDialogDescription", {
                    defaultValue: "Choose how to settle in group {{group}}.",
                    group: groupSettlementOptionsTarget.groupName,
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button
              size="sm"
              variant="outline"
              disabled={
                !groupSettlementOptionsTarget ||
                (settleGroupCashMutation.isPending &&
                  settleGroupCashMutation.variables?.groupId === groupSettlementOptionsTarget.groupId &&
                  settleGroupCashMutation.variables?.toUserId === groupSettlementOptionsTarget.contactUserId)
              }
              onClick={() => {
                if (!groupSettlementOptionsTarget) {
                  return;
                }

                setGroupSettlementTarget(groupSettlementOptionsTarget);
                setGroupSettlementOptionsTarget(null);
              }}
            >
              {settleGroupCashMutation.isPending
                ? t("contactsBalancesPage.settlingGroupCash")
                : t("contactsBalancesPage.settleOutsideGroup", { defaultValue: "Outside group" })}
            </Button>

            {isPayPalSdkEnabled ? (
              <div className="w-[170px]">
                <PayPalCurrencyButtons
                  currency={groupSettlementOptionsTarget?.currency ?? "PLN"}
                  fundingSource="paypal"
                  style={{ layout: "horizontal", tagline: false, height: 34 }}
                  forceReRender={[
                    groupSettlementOptionsTarget?.contactUserId ?? 0,
                    groupSettlementOptionsTarget?.groupId ?? 0,
                  ]}
                  createOrder={async () => {
                    if (!groupSettlementOptionsTarget) {
                      throw new Error("Missing group settlement target");
                    }

                    try {
                      return await createGroupPayPalOrder(
                        groupSettlementOptionsTarget.contactUserId,
                        groupSettlementOptionsTarget.groupId
                      );
                    } catch (error) {
                      const message = error instanceof Error ? error.message : undefined;
                      setSettlementFeedback({
                        tone: "error",
                        message: mapPayPalSettlementError(message),
                      });
                      throw error;
                    }
                  }}
                  onApprove={async (data) => {
                    if (!data.orderID || !groupSettlementOptionsTarget) {
                      setSettlementFeedback({
                        tone: "error",
                        message: t("contactsBalancesPage.settlementErrors.paypalInitFailed"),
                      });
                      return;
                    }

                    try {
                      await finalizeGroupPayPalOrder(
                        data.orderID,
                        groupSettlementOptionsTarget.contactUserId,
                        groupSettlementOptionsTarget.groupId
                      );
                    } catch (error) {
                      const message = error instanceof Error ? error.message : undefined;
                      setSettlementFeedback({
                        tone: "error",
                        message: mapPayPalSettlementError(message),
                      });
                    }
                  }}
                  onCancel={() => {
                    setSettlementFeedback({
                      tone: "error",
                      message: t("contactsBalancesPage.settlementErrors.paypalCancelled"),
                    });
                  }}
                  onError={(error) => {
                    const message = error instanceof Error ? error.message : undefined;
                    setSettlementFeedback({
                      tone: "error",
                      message: mapPayPalSettlementError(message),
                    });
                  }}
                />
              </div>
            ) : (
              <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
                {t("contactsBalancesPage.settlementErrors.paypalSdkNotConfigured")}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={groupSettlementTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setGroupSettlementTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contactsBalancesPage.groupSettleConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {groupSettlementTarget
                ? t("contactsBalancesPage.groupSettleConfirmDescription", {
                    contact: groupSettlementTarget.contactUsername,
                    group: groupSettlementTarget.groupName,
                    amount: groupSettlementTarget.amount.toFixed(2),
                    currency: groupSettlementTarget.currency,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settleGroupCashMutation.isPending}>
              {t("contactsBalancesPage.groupSettleCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!groupSettlementTarget || settleGroupCashMutation.isPending}
              onClick={() => {
                if (!groupSettlementTarget) {
                  return;
                }

                settleGroupCashMutation.mutate({
                  toUserId: groupSettlementTarget.contactUserId,
                  groupId: groupSettlementTarget.groupId,
                });
              }}
            >
              {settleGroupCashMutation.isPending
                ? t("contactsBalancesPage.groupSettleConfirming")
                : t("contactsBalancesPage.groupSettleConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={totalSettlementTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTotalSettlementTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("contactsBalancesPage.totalSettleConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {totalSettlementTarget
                ? t("contactsBalancesPage.totalSettleConfirmDescription", {
                    contact: totalSettlementTarget.contactUsername,
                  })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settleTotalCashMutation.isPending}>
              {t("contactsBalancesPage.totalSettleCancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!totalSettlementTarget || settleTotalCashMutation.isPending}
              onClick={() => {
                if (!totalSettlementTarget) {
                  return;
                }

                settleTotalCashMutation.mutate(totalSettlementTarget.contactUserId);
              }}
            >
              {settleTotalCashMutation.isPending
                ? t("contactsBalancesPage.totalSettleConfirming")
                : t("contactsBalancesPage.totalSettleConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}