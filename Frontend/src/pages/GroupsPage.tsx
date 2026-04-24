import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PageInfoButton from "@/components/help/PageInfoButton";

import CreateGroupDialog from "../components/groups/CreateGroupDialog";
import GroupCard from "../components/groups/GroupCard";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import type { ApiGroupCreate, ApiGroupResponse } from "@/types";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { user } = useAuth();

  const { data: groups = [], isLoading, error } = useQuery<ApiGroupResponse[]>({
    queryKey: queryKeys.groups.all,
    queryFn: () => groupsApi.listAll(),
    enabled: !!user,
  });

  const createGroupMutation = useMutation<ApiGroupResponse, Error, ApiGroupCreate>({
    mutationFn: (groupData) => groupsApi.create(groupData),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.groups.all });
      setCreateGroupError(null);
      setShowCreateDialog(false);
    },
    onError: (mutationError) => {
      const translated =
        mutationError.message === "You already have an active group with this name"
          ? t("createGroupDialog.errors.activeGroupNameTaken")
          : mutationError.message === "Group name cannot be empty"
            ? t("createGroupDialog.errors.emptyName")
            : mutationError.message === "Group name is too long"
              ? t("createGroupDialog.errors.nameTooLong")
              : mutationError.message === "Group description is too long"
                ? t("createGroupDialog.errors.descriptionTooLong")
            : mutationError.message || t("createGroupDialog.errors.createFailed");

      setCreateGroupError(translated);
    },
  });

  const handleCreateDialogOpenChange = (nextOpen: boolean) => {
    setShowCreateDialog(nextOpen);
    if (!nextOpen) {
      setCreateGroupError(null);
    }
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!normalizedSearch) {
      return groups;
    }

    return groups.filter((group) => {
      const name = group.name.toLowerCase();
      const description = group.description?.toLowerCase() ?? "";
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [groups, normalizedSearch]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-destructive text-center">
          <h2 className="text-2xl font-bold mb-2">{t("common.errorLoadingData")}</h2>
          <p className="text-muted-foreground">
            {error.message || t("common.somethingWentWrong")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8 md:pb-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center justify-between gap-4 text-center md:flex-row md:items-center md:text-left"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">{t("groupsPage.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("groupsPage.subtitle")} · {t("groupsPage.total")}: <span className="font-semibold text-primary">{groups.length}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PageInfoButton pageKey="groups" variant="icon" className="md:hidden" />
            <PageInfoButton pageKey="groups" className="hidden md:inline-flex" />
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="hidden shadow-lg md:inline-flex"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("groupsPage.createGroup")}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <div className="mx-auto w-full max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("groupsPage.searchPlaceholder")}
                aria-label={t("groupsPage.searchAriaLabel")}
                className="h-10 pl-9"
              />
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 justify-center justify-items-center gap-4 sm:grid-cols-[repeat(auto-fit,minmax(360px,440px))]">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{t("groupsPage.emptyTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("groupsPage.emptyDescription")}</p>
            <Button
              className="hidden md:inline-flex"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("groupsPage.createFirstGroup")}
            </Button>
          </motion.div>
        ) : filteredGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-9 h-9 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("groupsPage.noSearchResultsTitle")}</h2>
            <p className="text-muted-foreground">{t("groupsPage.noSearchResultsDescription")}</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 justify-center justify-items-center gap-4 sm:grid-cols-[repeat(auto-fit,minmax(360px,440px))]">
            <AnimatePresence>
              {filteredGroups.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Button
        onClick={() => setShowCreateDialog(true)}
        size="icon"
        aria-label={t("groupsPage.createGroup")}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-xl md:hidden"
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
      </Button>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={handleCreateDialogOpenChange}
        onSubmit={(data: ApiGroupCreate) => createGroupMutation.mutate(data)}
        isLoading={createGroupMutation.isPending}
        errorMessage={createGroupError}
      />
    </div>
  );
}