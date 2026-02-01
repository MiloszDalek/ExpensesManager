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
import QuickStats from "../components/dashboard/QuickStats";
import GroupBalances from "../components/dashboard/GroupBalances";
import RecentActivity from "../components/dashboard/RecentActivity";
import SpendingChart from "../components/dashboard/SpendingChart";

import { useAuth } from "@/contexts/AuthContext";
import { useDashboardSummary } from "@/hooks/useDashboard";

import MockData from "@/mocks/dashboard-mock-data.json";

export default function DashboardPage() {
  
  const { user, logout } = useAuth();

  const { data, isLoading } = useDashboardSummary();


  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
 
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
            title="Personal Spending"
            value={`${MockData.statistics.personal_spending.toFixed(2)}`}
            icon={Wallet}
            gradient="from-blue-500 to-cyan-500"
            trend="This month"
          />
          <QuickStats
            title="You Owe"
            value={`${(MockData.statistics.total_owed ?? 0).toFixed(2)}`}
            icon={ArrowUpRight}
            gradient="from-red-500 to-orange-500"
            trend={(MockData.statistics.total_owed ?? 0) > 0 ? "Settle up soon" : "All clear!"}
          />
          <QuickStats
            title="Owed to You"
            value={`${(MockData.statistics.total_receivable ?? 0).toFixed(2)}`}
            icon={DollarSign}
            gradient="from-green-500 to-emerald-500"
            trend={(MockData.statistics.total_receivable ?? 0) > 0 ? "Pending" : "All settled"}
          />
          <QuickStats
            title="Active Groups"
            value={`${MockData.statistics.active_groups}`}
            icon={Users}
            gradient="from-purple-500 to-pink-500"
            trend={`${MockData.statistics.active_groups} groups`}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* <SpendingChart expenses={data?.recent_expenses ?? []} user={user} />
            <RecentActivity expenses={data?.recent_expenses ?? []} user={user} /> */}
            <SpendingChart expenses={MockData.expenses} user={user} />
            <RecentActivity expenses={MockData.expenses} user={user} />
          </div>  
          
          <div className="space-y-6">
            {/* <GroupBalances 
              groups={data?.group_list ?? []}
              balances={data?.group_balances ?? []}
              userEmail={user.email}
            /> */}
            <GroupBalances
              groups={[
                { id: 1, name: "Roommates", description:"des", color: "purple", members: ["alice@example.com", "milosz@example.com"] },
                { id: 2, name: "Project Team", description:"des", color: "blue", members: ["bob@example.com", "milosz@example.com"] },
                { id: 3, name: "Trip", description:"des", color: "pink", members: ["milosz@example.com", "admin@example.com"] }
              ]}
              balances = {{
                1: {
                  "milosz@gmail.com_alice@gmail.com": 22
                },
                2: {
                  "bob@gmail.com_milosz@gmail.com": 31
                },
                3: {
                  "admin@gmail.com_milosz@gmail.com": 14
                }
              }}
              userEmail="milosz@gmail.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}