import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bell, CheckCircle2, Plus, Users, XCircle } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import { notificationsApi } from "@/api/notificationsApi";
import { contactsApi } from "@/api/contactsApi";
import { invitationsApi } from "@/api/invitationsApi";
import { queryKeys } from "@/api/queryKeys";
import { createPageUrl } from "@/utils/url";
import { format } from "date-fns";

import type {
  ApiContactResponse,
  ApiInvitationResponse,
  ApiNotificationResponse,
} from "@/types";
import type { InvitationStatus } from "@/types/enums";
import type { TFunction } from "i18next";

const NOTIFICATIONS_LIMIT = 30;
const CONTACTS_LIMIT = 100;
const SENT_INVITATIONS_LIMIT = 100;
const RECEIVED_INVITATIONS_LIMIT = 100;

const INVITATION_BADGE_VARIANT: Record<InvitationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  cancelled: "outline",
  archived: "outline",
};

const INVITATION_ERROR_TRANSLATIONS: Record<string, string> = {
  "Cannot invite yourself": "dashboardInbox.errors.cannotInviteYourself",
  "Contact already exist": "dashboardInbox.errors.contactAlreadyExists",
  "Invitation already accepted": "dashboardInbox.errors.invitationAlreadyAccepted",
  "Invitation is already pending. Wait for response or cancel the existing invitation.": "dashboardInbox.errors.invitationAlreadyPending",
  "Group invitation is already pending. Wait for response or cancel the existing invitation.": "dashboardInbox.errors.groupInvitationAlreadyPending",
  "User with this email does not exist": "dashboardInbox.errors.userWithEmailNotFound",
  "Invitation not found": "dashboardInbox.errors.invitationNotFound",
  "Not authorized": "dashboardInbox.errors.notAuthorized",
  "Only pending invitation can be declined": "dashboardInbox.errors.onlyPendingCanBeDeclined",
  "Only pending invitation can be cancelled, and accepted/rejected/cancelled invitations can be archived by sender": "dashboardInbox.errors.onlyPendingCanBeCancelledOrArchived",
};

const localizeInvitationError = (message: string, t: TFunction): string => {
  const key = INVITATION_ERROR_TRANSLATIONS[message];
  if (key) {
    return t(key);
  }

  return message;
};

type SentInvitationAction = {
  invitationId: number;
  status: InvitationStatus;
};

type ContactFeedback = {
  tone: "success" | "error";
  message: string;
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [contactEmail, setContactEmail] = useState("");
  const [contactInviteFeedback, setContactInviteFeedback] = useState<ContactFeedback | null>(null);

  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useQuery<ApiNotificationResponse[]>({
    queryKey: queryKeys.notifications.list({ limit: NOTIFICATIONS_LIMIT, offset: 0 }),
    queryFn: () => notificationsApi.list({ limit: NOTIFICATIONS_LIMIT, offset: 0 }),
    enabled: !!user,
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
    data: sentContactInvitations = [],
    isLoading: sentInvitationsLoading,
    error: sentInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: queryKeys.invitations.sent({
      limit: SENT_INVITATIONS_LIMIT,
      offset: 0,
      type: "contact",
    }),
    queryFn: () =>
      invitationsApi.listSent({
        limit: SENT_INVITATIONS_LIMIT,
        offset: 0,
        type: "contact",
      }),
    enabled: !!user,
  });

  const {
    data: receivedInvitations = [],
    isLoading: receivedInvitationsLoading,
    error: receivedInvitationsError,
  } = useQuery<ApiInvitationResponse[]>({
    queryKey: queryKeys.invitations.pending({
      limit: RECEIVED_INVITATIONS_LIMIT,
      offset: 0,
    }),
    queryFn: () =>
      invitationsApi.listPending({
        limit: RECEIVED_INVITATIONS_LIMIT,
        offset: 0,
      }),
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: number) => notificationsApi.markAsRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });

  const inviteContactMutation = useMutation({
    mutationFn: (email: string) =>
      invitationsApi.sendToContact({
        to_user_email: email,
      }),
    onSuccess: () => {
      setContactInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.contactInviteSent"),
      });
      setContactEmail("");
      void queryClient.invalidateQueries({ queryKey: ["invitations", "sent"] });
    },
    onError: (error: Error) => {
      setContactInviteFeedback({
        tone: "error",
        message: localizeInvitationError(error.message || t("common.somethingWentWrong"), t),
      });
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: ({ invitationId }: SentInvitationAction) => invitationsApi.cancel(invitationId),
    onSuccess: async (_data, variables) => {
      setContactInviteFeedback({
        tone: "success",
        message:
          variables.status === "pending"
            ? t("dashboardInbox.contactInviteCancelled")
            : t("dashboardInbox.invitationArchived"),
      });
      await queryClient.invalidateQueries({ queryKey: ["invitations", "sent"] });
    },
    onError: (error: Error) => {
      setContactInviteFeedback({
        tone: "error",
        message: localizeInvitationError(error.message || t("common.somethingWentWrong"), t),
      });
    },
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: number) => invitationsApi.accept(invitationId),
    onSuccess: async () => {
      setContactInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.invitationAccepted"),
      });
      await queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list({ limit: CONTACTS_LIMIT, offset: 0 }) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
    onError: (error: Error) => {
      setContactInviteFeedback({
        tone: "error",
        message: localizeInvitationError(error.message || t("common.somethingWentWrong"), t),
      });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: (invitationId: number) => invitationsApi.decline(invitationId),
    onSuccess: async () => {
      setContactInviteFeedback({
        tone: "success",
        message: t("dashboardInbox.invitationDeclined"),
      });
      await queryClient.invalidateQueries({ queryKey: ["invitations", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
    onError: (error: Error) => {
      setContactInviteFeedback({
        tone: "error",
        message: localizeInvitationError(error.message || t("common.somethingWentWrong"), t),
      });
    },
  });

  const handleNotificationClick = async (notification: ApiNotificationResponse) => {
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleInviteContact = async () => {
    const normalizedEmail = contactEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    setContactInviteFeedback(null);
    await inviteContactMutation.mutateAsync(normalizedEmail);
  };

  const handleCancelInvitation = async (invitationId: number, status: InvitationStatus) => {
    setContactInviteFeedback(null);
    await cancelInvitationMutation.mutateAsync({ invitationId, status });
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    setContactInviteFeedback(null);
    await acceptInvitationMutation.mutateAsync(invitationId);
  };

  const handleDeclineInvitation = async (invitationId: number) => {
    setContactInviteFeedback(null);
    await declineInvitationMutation.mutateAsync(invitationId);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (notificationsError || contactsError || sentInvitationsError || receivedInvitationsError) {
    return (
      <div className="flex items-center justify-center h-screen px-4">
        <div className="text-center text-destructive">
          <h2 className="mb-2 text-2xl font-bold">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {notificationsError?.message || contactsError?.message || sentInvitationsError?.message || receivedInvitationsError?.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {t("dashboardInbox.title", { username: user.username?.split(" ")[0] || "there" })}
            </h1>
            <p className="text-muted-foreground mt-2">{t("dashboardInbox.subtitle")}</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Groups")}>
              <Button className="shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                {t("dashboardInbox.newGroup")}
              </Button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Bell className="h-5 w-5 text-primary" />
                {t("dashboardInbox.notificationsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {notificationsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  {t("dashboardInbox.notificationsEmpty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={`text-sm ${notification.is_read ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                            {notification.message || t("dashboardInbox.notificationFallback")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                        {!notification.is_read && <span className="mt-1 h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Users className="h-5 w-5 text-primary" />
                {t("dashboardInbox.contactsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder={t("dashboardInbox.contactEmailPlaceholder")}
                />
                <Button
                  onClick={handleInviteContact}
                  disabled={inviteContactMutation.isPending || !contactEmail.trim()}
                >
                  {inviteContactMutation.isPending ? t("dashboardInbox.sendingInvite") : t("dashboardInbox.sendInvite")}
                </Button>
              </div>

              {contactInviteFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-md border p-2 text-sm ${
                    contactInviteFeedback.tone === "error"
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-primary/30 bg-primary/10"
                  }`}
                >
                  {contactInviteFeedback.tone === "error" ? (
                    <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  )}
                  <span className={contactInviteFeedback.tone === "error" ? "text-destructive" : "text-foreground"}>
                    {contactInviteFeedback.message}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{t("dashboardInbox.receivedInvitationsTitle")}</h3>
                {receivedInvitationsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : receivedInvitations.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                    {t("dashboardInbox.receivedInvitationsEmpty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {receivedInvitations.map((invitation) => (
                      <div key={invitation.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {invitation.type === "group"
                                ? t("dashboardInbox.receivedGroupInviteTitle", {
                                    group: invitation.group_name || `#${invitation.group_id}`,
                                  })
                                : t("dashboardInbox.receivedContactInviteTitle")}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {invitation.from_user_username || `${t("dashboardInbox.userFallback")} #${invitation.from_user_id}`}
                              {invitation.from_user_email ? ` (${invitation.from_user_email})` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t("dashboardInbox.sentAt")}: {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptInvitation(invitation.id)}
                              disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                            >
                              {acceptInvitationMutation.isPending && acceptInvitationMutation.variables === invitation.id
                                ? t("dashboardInbox.acceptingInvite")
                                : t("dashboardInbox.acceptInvite")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeclineInvitation(invitation.id)}
                              disabled={acceptInvitationMutation.isPending || declineInvitationMutation.isPending}
                            >
                              {declineInvitationMutation.isPending && declineInvitationMutation.variables === invitation.id
                                ? t("dashboardInbox.decliningInvite")
                                : t("dashboardInbox.declineInvite")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{t("dashboardInbox.sentInvitationsTitle")}</h3>
                {sentInvitationsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : sentContactInvitations.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                    {t("dashboardInbox.sentInvitationsEmpty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sentContactInvitations.map((invitation) => (
                      <div key={invitation.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {invitation.to_user_username || `${t("dashboardInbox.userFallback")} #${invitation.to_user_id}`}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {invitation.to_user_email || t("dashboardInbox.emailUnavailable")}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t("dashboardInbox.sentAt")}: {format(new Date(invitation.created_at), "MMM d, yyyy HH:mm")}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={INVITATION_BADGE_VARIANT[invitation.status]}>
                              {t(`dashboardInbox.invitationStatus.${invitation.status}`)}
                            </Badge>
                            {invitation.status !== "archived" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelInvitation(invitation.id, invitation.status)}
                                disabled={cancelInvitationMutation.isPending}
                              >
                                {cancelInvitationMutation.isPending &&
                                cancelInvitationMutation.variables?.invitationId === invitation.id
                                  ? invitation.status === "pending"
                                    ? t("dashboardInbox.cancellingInvite")
                                    : t("dashboardInbox.archivingInvite")
                                  : invitation.status === "pending"
                                    ? t("dashboardInbox.cancelInvite")
                                    : t("dashboardInbox.archiveInvite")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-foreground">{t("dashboardInbox.contactsListTitle")}</h3>
                {contactsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-12 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    {t("dashboardInbox.contactsEmpty")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium text-foreground">{contact.username}</p>
                        <p className="text-xs text-muted-foreground">{contact.email}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}