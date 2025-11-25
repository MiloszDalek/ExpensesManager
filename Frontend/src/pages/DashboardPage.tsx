import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Wallet, 
  ArrowUpRight, 
  Plus,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import QuickStats from "../components/dashboard/QuickStats";
import GroupBalances from "../components/dashboard/GroupBalances";
import RecentActivity from "../components/dashboard/RecentActivity";
import SpendingChart from "../components/dashboard/SpendingChart";

import { groupsApi } from "@/api/groupsApi";
import { expensesApi } from "@/api/expensesApi";
import {
  useTotalOwed,
  useTotalReceivable,
  usePersonalSpending,
  useGroupBalances
} from "@/api/dashboard";

import { useAuth } from "@/contexts/AuthContext";


export default function DashboardPage() {
  
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const { data: totalOwed = 0 } = useTotalOwed();
  const { data: totalOwedToMe = 0 } = useTotalReceivable();
  const { data: totalPersonalSpending = 0 } = usePersonalSpending();
  const { data: groupBalances = {} } = useGroupBalances();
  

  const { data: myGroups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
  });


  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              Welcome back, {user.username?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-500 mt-2">Here's your financial overview</p>
          </div>
          <div className="flex gap-3">
            <Link to={createPageUrl("Groups")}>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={logout}
              className="border-red-500 text-red-600 hover:bg-red-50"
            >
              Logout
            </Button>
          </div>
        </motion.div>

        {/* Quick Stats Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickStats
            title="You Owe"
            value={`$${totalOwed.toFixed(2)}`}
            icon={ArrowUpRight}
            gradient="from-red-500 to-orange-500"
            trend={totalOwed > 0 ? "Settle up soon" : "All clear!"}
          />
          <QuickStats
            title="Owed to You"
            value={`$${totalOwedToMe.toFixed(2)}`}
            icon={DollarSign}
            gradient="from-green-500 to-emerald-500"
            trend={totalOwedToMe > 0 ? "Pending" : "All settled"}
          />
          <QuickStats
            title="Active Groups"
            value={myGroups.length}
            icon={Users}
            gradient="from-purple-500 to-pink-500"
            trend={`${myGroups.length} groups`}
          />
          <QuickStats
            title="Personal Spending"
            value={`$${totalPersonalSpending.toFixed(2)}`}
            icon={Wallet}
            gradient="from-blue-500 to-cyan-500"
            trend="This month"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SpendingChart expenses={expenses} user={user} />
            <RecentActivity expenses={expenses} user={user} />
          </div>
          
          <div className="space-y-6">
            <GroupBalances 
              groups={myGroups} 
              balances={balances} 
              userEmail={user.email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}