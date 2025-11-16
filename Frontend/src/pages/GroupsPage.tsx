import React, { useState, useEffect } from "react";
// import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
// import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import CreateGroupDialog from "../components/groups/CreateGroupDialog";
import GroupCard from "../components/groups/GroupCard";

export default function GroupsPage() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list('-created_date'),
  });

  const createGroupMutation = useMutation({
    mutationFn: (groupData) => base44.entities.Group.create(groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      setShowCreateDialog(false);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId) => base44.entities.Group.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const myGroups = groups.filter(g => g.members?.includes(user.email));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Your Groups</h1>
            <p className="text-gray-500 mt-2">Manage shared expenses with friends and family</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Group
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-purple-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No groups yet</h2>
            <p className="text-gray-500 mb-6">Create your first group to start splitting expenses</p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {myGroups.map((group, index) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  index={index}
                  onDelete={() => deleteGroupMutation.mutate(group.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <CreateGroupDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createGroupMutation.mutate(data)}
        userEmail={user.email}
        isLoading={createGroupMutation.isPending}
      />
    </div>
  );
}