import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import DialogInfoButton from "@/components/help/DialogInfoButton";
import type { ApiContactResponse, ApiGroupMemberResponse } from "@/types";

type AddGroupMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ApiContactResponse[];
  members: ApiGroupMemberResponse[];
  pendingInvitationUserIds: number[];
  isSubmitting: boolean;
  errorMessage?: string | null;
  onInviteByContact: (userId: number) => Promise<void>;
  onInviteByEmail: (email: string) => Promise<void>;
};

export default function AddGroupMemberDialog({
  open,
  onOpenChange,
  contacts,
  members,
  pendingInvitationUserIds,
  isSubmitting,
  errorMessage,
  onInviteByContact,
  onInviteByEmail,
}: AddGroupMemberDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("contacts");
  const [search, setSearch] = useState("");
  const [email, setEmail] = useState("");

  const memberIds = useMemo(() => new Set(members.map((member) => member.user_id)), [members]);
  const pendingInvitationIds = useMemo(
    () => new Set(pendingInvitationUserIds),
    [pendingInvitationUserIds]
  );

  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (memberIds.has(contact.contact_id) || pendingInvitationIds.has(contact.contact_id)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        contact.username.toLowerCase().includes(normalizedSearch) ||
        contact.email.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [contacts, memberIds, pendingInvitationIds, search]);

  const handleInviteByEmail = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    try {
      await onInviteByEmail(normalizedEmail);
      setEmail("");
      onOpenChange(false);
    } catch {
      // Error is rendered by parent component.
    }
  };

  const handleInviteByContact = async (userId: number) => {
    try {
      await onInviteByContact(userId);
      onOpenChange(false);
    } catch {
      // Error is rendered by parent component.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{t("addGroupMemberDialog.title")}</DialogTitle>
            <DialogInfoButton dialogKey="addGroupMember" autoOpen={true} />
          </div>
          <DialogDescription>{t("addGroupMemberDialog.description")}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">{t("addGroupMemberDialog.tabContacts")}</TabsTrigger>
            <TabsTrigger value="email">{t("addGroupMemberDialog.tabEmail")}</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-4 space-y-3">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("addGroupMemberDialog.searchContacts")}
            />

            <div className="max-h-72 space-y-2 overflow-auto">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{contact.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
                  </div>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleInviteByContact(contact.contact_id)}
                  >
                    {t("addGroupMemberDialog.invite")}
                  </Button>
                </div>
              ))}

              {filteredContacts.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  {t("addGroupMemberDialog.noContacts")}
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="email" className="mt-4 space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("addGroupMemberDialog.emailPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("addGroupMemberDialog.emailHint")}</p>
          </TabsContent>
        </Tabs>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("addGroupMemberDialog.cancel")}
          </Button>

          {activeTab === "email" && (
            <Button onClick={handleInviteByEmail} disabled={isSubmitting || !email.trim()}>
              {isSubmitting ? t("addGroupMemberDialog.sending") : t("addGroupMemberDialog.sendInvite")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
