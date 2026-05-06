import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, HandCoins, Search, UsersRound } from "lucide-react";

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
import { PayPalCurrencyButtons } from "@/components/payments/PayPalCurrencyButtons";
import { useAuth } from "@/contexts/AuthContext";
import { contactsApi } from "@/api/contactsApi";
import { balancesApi } from "@/api/balancesApi";
import { groupsApi } from "@/api/groupsApi";
import { invitationsApi } from "@/api/invitationsApi";
import { settlementsApi } from "@/api/settlementsApi";
import { queryKeys } from "@/api/queryKeys";
import { paypalConfig } from "@/config/paypal";
import { createPageUrl } from "@/utils/url";
import { formatGroupName } from "@/utils/group";
import PageInfoButton from "@/components/help/PageInfoButton";

import type {
  ApiContactInvitationCreate,
  ApiContactBalanceByGroup,
  ApiContactResponse,
  ApiGroupResponse,
  ApiInvitationResponse,
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [mobileSection, setMobileSection] = useState<"contacts" | "invitations">("contacts");
  const isPayPalButtonEnabled = paypalConfig.isPayPalButtonEnabled;

  const getPayPalUnavailableMessage = () => {
    return paypalConfig.isDisabled
      ? t("contactsBalancesPage.settlementErrors.paypalDisabled")
      : t("contactsBalancesPage.settlementErrors.paypalSdkNotConfigured");
  };

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

  const mapContactInvitationError = (message: string | undefined) => {
    return message === "Cannot invite yourself"
      ? t("dashboardInbox.errors.cannotInviteYourself")
      : message === "Contact already exists"
        ? t("dashboardInbox.errors.contactAlreadyExists")
        : message === "Invitation already accepted"
          ? t("dashboardInbox.errors.invitationAlreadyAccepted")
          : message === "Invitation is already pending. Wait for response or cancel the existing invitation."
            ? t("dashboardInbox.errors.invitationAlreadyPending")
            : message === "User with this email does not exist"
              ? t("dashboardInbox.errors.userWithEmailNotFound")
              : message === "Not authorized"
                ? t("dashboardInbox.errors.notAuthorized")
                : message || t("common.somethingWentWrong");
  };

  const mapInvitationActionError = (message: string | undefined) => {
    return message === "Invitation not found"
      ? t("dashboardInbox.errors.invitationNotFound")
      : message === "Only pending invitations can be accepted"
        ? t("dashboardInbox.errors.onlyPendingCanBeAccepted")
        : message === "Only pending invitations can be declined"
          ? t("dashboardInbox.errors.onlyPendingCanBeDeclined")
          : message === "Only pending invitations can be cancelled or archived"
            ? t("dashboardInbox.errors.onlyPendingCanBeCancelledOrArchived")
            : message || t("common.somethingWentWrong");
  };

  const mapPayPalSettlementError = (message: string | undefined) => {
    return message === "PayPal integration disabled"
      ? t("contactsBalancesPage.settlementErrors.paypalDisabled")
      : message === "PayPal integration not configured"
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

  const sendContactInvitationMutation = useMutation<
    ApiInvitationResponse,
    Error,
    ApiContactInvitationCreate
  >({
    mutationFn: (payload) => invitationsApi.sendToContact(payload),
    onMutate: () => {
      setInviteFeedback(null);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sentInvitationsQueryKey });
      setInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.contactInviteSent"),
      });
      setInviteEmail("");
    },
    onError: (mutationError) => {
      setInviteFeedback({
        tone: "error",
        message: mapContactInvitationError(mutationError.message),
      });
    },
  });

  const cancelContactInvitationMutation = useMutation<ApiInvitationResponse, Error, number>({
    mutationFn: (invitationId) => invitationsApi.cancel(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sentInvitationsQueryKey });
      setInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.contactInviteCancelled"),
      });
    },
    onError: (mutationError) => {
      setInviteFeedback({
        tone: "error",
        message: mapInvitationActionError(mutationError.message),
      });
    },
  });

  const acceptInvitationMutation = useMutation<ApiInvitationResponse, Error, number>({
    mutationFn: (invitationId) => invitationsApi.accept(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }),
      });
      setInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.invitationAccepted"),
      });
    },
    onError: (mutationError) => {
      setInviteFeedback({
        tone: "error",
        message: mapInvitationActionError(mutationError.message),
      });
    },
  });

  const declineInvitationMutation = useMutation<ApiInvitationResponse, Error, number>({
    mutationFn: (invitationId) => invitationsApi.decline(invitationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      setInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.invitationDeclined"),
      });
    },
    onError: (mutationError) => {
      setInviteFeedback({
        tone: "error",
        message: mapInvitationActionError(mutationError.message),
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

  const pendingInvitationsQueryKey = queryKeys.invitations.pending({ limit: 100, offset: 0 });
  const sentInvitationsQueryKey = queryKeys.invitations.sent({
    limit: 100,
    offset: 0,
    type: "contact",
    status: "pending",
  });

  const {
    data: pendingInvitations = [],
    isLoading: pendingInvitationsLoading,
    error: pendingInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: pendingInvitationsQueryKey,
    queryFn: () => invitationsApi.listPending({ limit: 100, offset: 0 }),
    enabled: !!user,
  });

  const {
    data: sentInvitations = [],
    isLoading: sentInvitationsLoading,
    error: sentInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: sentInvitationsQueryKey,
    queryFn: () =>
      invitationsApi.listSent({
        limit: 100,
        offset: 0,
        type: "contact",
        status: "pending",
      }),
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

  const sentContactInvitations = useMemo(() => {
    return sentInvitations
      .filter((invitation) => invitation.type === "contact" && invitation.status === "pending")
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }, [sentInvitations]);

  const receivedContactInvitations = useMemo(() => {
    return pendingInvitations
      .filter((invitation) => invitation.type === "contact" && invitation.status === "pending")
      .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
  }, [pendingInvitations]);

  const contactRows = useMemo(() => {
    return contacts
      .map<ContactBalanceRow>((contact) => {
        const breakdown = breakdownByContactId[contact.contact_id] ?? [];

        const currencyTotals = breakdown.reduce<Record<string, number>>((accumulator, item) => {
          const groupCurrency =
            groupById[item.group_id]?.currency ??
            item.group_currency ??
            t("contactsBalancesPage.unknownCurrency");
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

  const handleSendContactInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    try {
      await sendContactInvitationMutation.mutateAsync({ to_user_email: normalizedEmail });
    } catch {
      // Error is displayed via invite feedback state.
    }
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
        const fallbackGroupName = row.group_name ? formatGroupName(row.group_name) : null;
        return {
          groupId: row.group_id,
          amount,
          absoluteAmount: Math.abs(amount),
          groupName: group
            ? formatGroupName(group.name)
            : fallbackGroupName ?? t("contactsBalancesPage.unknownGroup", { groupId: row.group_id }),
          groupCurrency: group?.currency ?? row.group_currency ?? "",
        };
      })
      .filter((row) => row.amount !== 0)
      .sort((left, right) => right.absoluteAmount - left.absoluteAmount);
  }, [expandedContactBreakdown, groupById, t]);

  const invitePanel = (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("contactsBalancesPage.invitationsTitle")}
        </h2>
      </div>

      <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
        <CardContent className="space-y-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t("contactsBalancesPage.inviteByEmailTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("contactsBalancesPage.inviteByEmailDescription")}
            </p>
          </div>

          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => {
              setInviteEmail(event.target.value);
              if (inviteFeedback) {
                setInviteFeedback(null);
              }
            }}
            placeholder={t("dashboardInbox.contactEmailPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("addGroupMemberDialog.emailHint")}</p>

          {inviteFeedback ? (
            <p
              className={`text-sm ${inviteFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"}`}
            >
              {inviteFeedback.message}
            </p>
          ) : null}

          <Button
            onClick={handleSendContactInvite}
            disabled={sendContactInvitationMutation.isPending || !inviteEmail.trim()}
            className="w-full"
          >
            {sendContactInvitationMutation.isPending
              ? t("dashboardInbox.sendingInvite")
              : t("dashboardInbox.sendInvite")}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {t("dashboardInbox.sentInvitationsTitle")}
        </h3>

        {sentInvitationsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : sentInvitationsError ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
            {sentInvitationsError.message || t("common.somethingWentWrong")}
          </p>
        ) : sentContactInvitations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t("dashboardInbox.sentInvitationsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {sentContactInvitations.map((invitation) => {
              const recipientLabel =
                invitation.to_user_username ?? invitation.to_user_email ?? `#${invitation.to_user_id}`;
              const isCancelling =
                cancelContactInvitationMutation.isPending &&
                cancelContactInvitationMutation.variables === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t("contactsBalancesPage.invitationTo", { username: recipientLabel })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={isCancelling}
                    onClick={() => cancelContactInvitationMutation.mutate(invitation.id)}
                  >
                    {isCancelling ? t("dashboardInbox.cancellingInvite") : t("dashboardInbox.cancelInvite")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold text-foreground">
          {t("dashboardInbox.receivedInvitationsTitle")}
        </h3>

        {pendingInvitationsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : pendingInvitationsError ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-destructive">
            {pendingInvitationsError.message || t("common.somethingWentWrong")}
          </p>
        ) : receivedContactInvitations.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            {t("dashboardInbox.receivedInvitationsEmpty")}
          </p>
        ) : (
          <div className="space-y-2">
            {receivedContactInvitations.map((invitation) => {
              const senderLabel =
                invitation.from_user_username ?? invitation.from_user_email ?? t("dashboardInbox.userFallback");
              const isAccepting =
                acceptInvitationMutation.isPending && acceptInvitationMutation.variables === invitation.id;
              const isDeclining =
                declineInvitationMutation.isPending && declineInvitationMutation.variables === invitation.id;

              return (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/80 p-3 shadow-sm backdrop-blur-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t("contactsBalancesPage.invitationFrom", { username: senderLabel })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isAccepting || isDeclining}
                      onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                    >
                      {isAccepting ? t("dashboardInbox.acceptingInvite") : t("dashboardInbox.acceptInvite")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isAccepting || isDeclining}
                      onClick={() => declineInvitationMutation.mutate(invitation.id)}
                    >
                      {isDeclining ? t("dashboardInbox.decliningInvite") : t("dashboardInbox.declineInvite")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

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
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("contactsBalancesPage.title")}</h1>
            <PageInfoButton pageKey="contacts" variant="icon" className="md:hidden" autoOpen={true} />
            <PageInfoButton pageKey="contacts" className="hidden md:inline-flex" autoOpen={true} />
          </div>
          <p className="mt-2 text-muted-foreground">{t("contactsBalancesPage.subtitle")}</p>
        </div>

        <div className="mb-4 lg:hidden">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "contacts" ? "default" : "outline"}
              className="h-8 px-2 text-[11px]"
              onClick={() => setMobileSection("contacts")}
            >
              {t("contactsBalancesPage.mobileTabContacts")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mobileSection === "invitations" ? "default" : "outline"}
              className="h-8 px-2 text-[11px]"
              onClick={() => setMobileSection("invitations")}
            >
              {t("contactsBalancesPage.mobileTabInvitations")}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[55%_45%]">
          <div className={`space-y-3 ${mobileSection !== "contacts" ? "hidden lg:block" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HandCoins className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{t("contactsBalancesPage.listTitle")}</h2>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UsersRound className="h-4 w-4 text-primary" />
                <span>{contactRows.length}</span>
              </div>
            </div>

            {settlementFeedback ? (
              <p
                className={`text-sm ${
                  settlementFeedback.tone === "error" ? "text-destructive" : "text-emerald-700"
                }`}
              >
                {settlementFeedback.message}
              </p>
            ) : null}

            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={contactSearch}
                onChange={(event) => setContactSearch(event.target.value)}
                placeholder={t("contactsBalancesPage.searchPlaceholder", { defaultValue: "Search contacts" })}
                className="pl-9"
              />
            </div>

            {filteredContactRows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                {contactRows.length === 0
                  ? t("contactsBalancesPage.empty")
                  : t("contactsBalancesPage.searchNoResults", { defaultValue: "No contacts match your search." })}
              </p>
            ) : (
              <div className="space-y-2">
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

          <div className={`${mobileSection !== "invitations" ? "hidden lg:block" : ""}`}>
            {invitePanel}
          </div>
        </div>
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

            {isPayPalButtonEnabled ? (
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
                {getPayPalUnavailableMessage()}
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

            {isPayPalButtonEnabled ? (
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
                {getPayPalUnavailableMessage()}
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