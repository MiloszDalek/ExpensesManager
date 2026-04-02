import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import CreateGroupDialog from "../components/groups/CreateGroupDialog";
import GroupCard from "../components/groups/GroupCard";
import { useAuth } from "@/contexts/AuthContext";
import { groupsApi } from "@/api/groupsApi";
import { queryKeys } from "@/api/queryKeys";
import type { ApiGroupCreate, ApiGroupResponse } from "@/types";

export default function GroupsPage() {
  const { t } = useTranslation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{t("groupsPage.title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("groupsPage.subtitle")} · {t("groupsPage.total")}: <span className="font-semibold text-primary">{groups.length}</span>
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("groupsPage.createGroup")}
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("groupsPage.createFirstGroup")}
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {groups.map((group, index) => (
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