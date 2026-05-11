import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { invitationsApi } from "@/api/invitationsApi";
import { queryKeys } from "@/api/queryKeys";
import type { ApiInvitationResponse, ApiContactInvitationCreate } from "@/types";

export function useInvitations() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

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
        queryKey: queryKeys.contacts.list({ limit: 100, offset: 0 }),
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

  return {
    inviteEmail,
    setInviteEmail,
    inviteFeedback,
    setInviteFeedback,
    sendContactInvitationMutation,
    cancelContactInvitationMutation,
    acceptInvitationMutation,
    declineInvitationMutation,
    pendingInvitationsLoading,
    pendingInvitationsError,
    sentInvitationsLoading,
    sentInvitationsError,
    sentContactInvitations,
    receivedContactInvitations,
    handleSendContactInvite,
  };
}
