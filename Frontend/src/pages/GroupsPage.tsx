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
import { useAuth } from "@/contexts/AuthContext";

import groupsMock from "@/mocks/groups-mock-data.json";

type CreateGroupInput = {
  name: string;
  description?: string;
  currency?: string;
};

const groupColors = {
  purple: "from-purple-500 to-purple-600",
  blue: "from-blue-500 to-blue-600",
  teal: "from-teal-500 to-teal-600",
  pink: "from-pink-500 to-pink-600",
  orange: "from-orange-500 to-orange-600",
};

type GroupColor = "purple" | "blue" | "teal" | "pink" | "orange";

type Group = {
  id: string;
  name: string;
  color?: GroupColor;
  description?: string;
  currency?: string;
  members: string[];
  created_date: string;
  total_expenses: number;
};



export default function GroupsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const queryClient = useQueryClient();

  const { user, logout } = useAuth();

const [mockGroups, setMockGroups] = useState<Group[]>(groupsMock as Group[]);

const { data: groups = [], isLoading } = useQuery({
  queryKey: ["groups"],
  queryFn: async () => mockGroups
});

const createGroupMutation = useMutation({
  mutationFn: async (groupData: CreateGroupInput) => {
    const newGroup = {
      id: crypto.randomUUID(),
      ...groupData,
      members: [user?.email!],
      created_date: new Date().toISOString(),
      total_expenses: 0
    };

    setMockGroups(prev => [newGroup, ...prev]);
    return newGroup;
  },
  onSuccess: () => {
    setShowCreateDialog(false);
  }
});

const deleteGroupMutation = useMutation({
  mutationFn: async (groupId: String) => {
    setMockGroups(prev =>
      prev.filter(group => group.id !== groupId)
    );
    return groupId;
  }
});


  // const createGroupMutation = useMutation({
  //   mutationFn: (groupData) => base44.entities.Group.create(groupData),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['groups'] });
  //     setShowCreateDialog(false);
  //   },
  // });

  // const deleteGroupMutation = useMutation({
  //   mutationFn: (groupId) => base44.entities.Group.delete(groupId),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['groups'] });
  //   },
  // });

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
        onSubmit={(data: CreateGroupInput) => createGroupMutation.mutate(data)}
        userEmail={user.email}
        isLoading={createGroupMutation.isPending}
      />
    </div>
  );
}