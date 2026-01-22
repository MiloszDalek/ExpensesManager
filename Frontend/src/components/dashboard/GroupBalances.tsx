import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

import type { Group } from "@/types";
import { groupColors } from "@/types";

interface GroupBalancesProps {
  groups: Group[];
  balances: Record<number, Record<string, number>>
  userEmail: string;
}

export default function GroupBalances({ groups, balances, userEmail }: GroupBalancesProps) {
const getGroupBalance = (groupId: number) => {
  let owed = 0;
  let owedToMe = 0;

  const groupBalances = balances[groupId];
  if (!groupBalances) return { owed, owedToMe };

  Object.entries(groupBalances).forEach(([key, amount]) => {
    if (key.startsWith(userEmail)) {
      owed += amount;
    } else if (key.endsWith(userEmail)) {
      owedToMe += amount;
    }
  });

  return { owed, owedToMe };
};

  return (
    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Your Groups
          </CardTitle>
          <Link to={createPageUrl("Groups")}>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No groups yet</p>
            <Link to={createPageUrl("Groups")}>
              <Button size="sm" className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
                Create Your First Group
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.slice(0, 5).map((group, index) => {
              const balance = getGroupBalance(group.id);
              const netBalance = balance.owedToMe - balance.owed;
              
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={createPageUrl("GroupDetail", { id: group.id})}>
                    <div className="p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200 cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${groupColors[group.color ?? "purple"] || groupColors.purple} flex items-center justify-center shadow-md`}>
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{group.name}</h4>
                            <p className="text-xs text-gray-500">{group.members?.length || 0} members</p>
                          </div>
                        </div>
                      </div>
                      {netBalance !== 0 && (
                        <div className={`text-sm font-medium ${netBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {netBalance > 0 ? `You're owed ${Math.abs(netBalance).toFixed(2)} PLN` : `You owe ${Math.abs(netBalance).toFixed(2)} PLN`}
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}