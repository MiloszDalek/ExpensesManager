import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ChevronUp, HandCoins, UsersRound } from "lucide-react";

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
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi } from "@/api/contactsApi";
import { balancesApi } from "@/api/balancesApi";
import { groupsApi } from "@/api/groupsApi";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";

import type { ApiContactBalanceByGroup, ApiContactResponse, ApiGroupResponse } from "@/types";

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

export default function ContactsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expandedContactUserId, setExpandedContactUserId] = useState<number | null>(null);
  const [settlementFeedback, setSettlementFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [groupSettlementTarget, setGroupSettlementTarget] = useState<GroupSettlementTarget | null>(null);
  const [totalSettlementTarget, setTotalSettlementTarget] = useState<TotalSettlementTarget | null>(null);

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

  const formatCurrencyTotals = (currencyTotals: Record<string, number>) => {
    const entries = Object.entries(currencyTotals)
      .filter(([, amount]) => amount !== 0)
      .sort((left, right) => right[1] - left[1]);

    if (entries.length === 0) {
      return t("contactsBalancesPage.settled");
    }

    return entries
      .map(([currency, amount]) => `${Math.abs(amount).toFixed(2)} ${currency}`)
      .join(" · ");
  };

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

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.contactsCount")}</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-foreground">
                <UsersRound className="h-5 w-5 text-primary" />
                {contactRows.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.othersOweYou")}</p>
              <p className="mt-1 text-sm font-bold text-emerald-700">{formatCurrencyTotals(summary.othersOweMe)}</p>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t("contactsBalancesPage.youOweOthers")}</p>
              <p className="mt-1 text-sm font-bold text-rose-700">{formatCurrencyTotals(summary.iOweOthers)}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
          <CardContent className="p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">{t("contactsBalancesPage.listTitle")}</h2>
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

            {contactRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {t("contactsBalancesPage.empty")}
              </p>
            ) : (
              <div className="space-y-2">
                {contactRows.map((row) => {
                  const isExpanded = expandedContactUserId === row.contact.contact_id;
                  const balanceLabel = formatSignedCurrencyTotals(row.currencyTotals);
                  const hasPositive = Object.values(row.currencyTotals).some((amount) => amount > 0);
                  const hasNegative = Object.values(row.currencyTotals).some((amount) => amount < 0);

                  return (
                    <div key={row.contact.id} className="rounded-lg border border-border">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-muted/40"
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
                          {hasNegative ? (
                            <div className="mb-3">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  settleTotalCashMutation.isPending &&
                                  settleTotalCashMutation.variables === row.contact.contact_id
                                }
                                onClick={() => {
                                  setTotalSettlementTarget({
                                    contactUserId: row.contact.contact_id,
                                    contactUsername: row.contact.username,
                                  });
                                }}
                              >
                                {settleTotalCashMutation.isPending &&
                                settleTotalCashMutation.variables === row.contact.contact_id
                                  ? t("contactsBalancesPage.settlingTotalCash")
                                  : t("contactsBalancesPage.settleTotalCash")}
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
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={
                                          settleGroupCashMutation.isPending &&
                                          settleGroupCashMutation.variables?.groupId === groupRow.groupId &&
                                          settleGroupCashMutation.variables?.toUserId === row.contact.contact_id
                                        }
                                        onClick={() => {
                                          setGroupSettlementTarget({
                                            contactUserId: row.contact.contact_id,
                                            contactUsername: row.contact.username,
                                            groupId: groupRow.groupId,
                                            groupName: groupRow.groupName,
                                            amount: groupRow.absoluteAmount,
                                            currency: groupRow.groupCurrency,
                                          });
                                        }}
                                      >
                                        {settleGroupCashMutation.isPending &&
                                        settleGroupCashMutation.variables?.groupId === groupRow.groupId &&
                                        settleGroupCashMutation.variables?.toUserId === row.contact.contact_id
                                          ? t("contactsBalancesPage.settlingGroupCash")
                                          : t("contactsBalancesPage.settleGroupCash")}
                                      </Button>
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
          </CardContent>
        </Card>
      </div>

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