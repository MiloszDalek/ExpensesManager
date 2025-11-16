import { useEffect } from "react";
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

import type { Expense } from "@/types"

import QuickStats from "../components/dashboard/QuickStats";
import GroupBalances from "../components/dashboard/GroupBalances";
import RecentActivity from "../components/dashboard/RecentActivity";
import SpendingChart from "../components/dashboard/SpendingChart";

import { useAuth } from "@/contexts/AuthContext";


export default function DashboardPage() {
  
  const { user, logout } = useAuth();

  useEffect(()=>{
    console.log(user)
  }, []);
  // const [user, setUser] = useState<User | null>(null);

  // useEffect(() => {
  //   // const loadUser = async () => {
  //   //   const currentUser = await base44.auth.me();
  //   //   setUser(currentUser);
  //   // };
  //   const loadUser = async () => {
  //     const currentUser = {
  //       full_name: "Miłosz Dałek",
  //       email: "milosz@example.com",
  //     };
  //     setUser(currentUser);
  //   }
  //   loadUser();
  // }, []);

  // const { data: groups = [], isLoading: groupsLoading } = useQuery({
  //   queryKey: ['groups'],
  //   queryFn: () => base44.entities.Group.list('-created_date'),
  // });

  // const { data: expenses = [], isLoading: expensesLoading } = useQuery({
  //   queryKey: ['expenses'],
  //   queryFn: () => base44.entities.Expense.list('-date'),
  // });

  // const { data: settlements = [] } = useQuery({
  //   queryKey: ['settlements'],
  //   queryFn: () => base44.entities.Settlement.list('-date'),
  // });

  const { data: groups = [] } = { data: [
    { id: 1, name: "Grupa domowa", members: ["milosz@gmail.com", "ania@example.com"] },
    { id: 2, name: "Wyjazd", members: ["milosz@gmail.com", "piotr@example.com"] },
  ]};

  // const { data: expenses = [] } = { data: [
  //   { id: 1, is_personal: false, paid_by: "milosz@example.com", amount: 120, splits: [{ user_email: "ania@example.com", amount: 60 }] },
  //   { id: 2, is_personal: true, paid_by: "milosz@example.com", amount: 80 },
  // ]};

  const { data: expenses = [] }: { data: Expense[] } = {
  data: [
 {
      id: 1,
      title: "Dinner with friends",
      amount: 120,
      date: "2025-11-09",
      category: "food",
      is_personal: false,
      paid_by: "milosz@gmail.com",
    },
    {
      id: 2,
      title: "Taxi ride",
      amount: 80,
      date: "2025-11-08",
      category: "transport",
      is_personal: true,
      paid_by: "milosz@gmail.com",
    },
  ],
};

  // const { data: settlements = [] } = { data: [] };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const myGroups = groups.filter(g => g.members?.includes(user.email));
  const personalExpenses = expenses.filter(e => e.is_personal && e.paid_by === user.email);
  const groupExpenses = expenses.filter(e => !e.is_personal);

  // Calculate total personal spending
  const totalPersonalSpending = personalExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  interface Settlement {
  from_user: string;
  to_user: string;
  amount: number;
}

const settlements: Settlement[] = [
  { from_user: "A", to_user: "B", amount: 50 },
  { from_user: "C", to_user: "A", amount: 20 },
];

  // Calculate group balances
  const calculateBalances = () => {
    const balances: Record<string, number> = {};
    
    groupExpenses.forEach(expense => {
      if (!expense.splits) return;
      
      expense.splits.forEach(split => {
        if (split.user_email === user.email && expense.paid_by !== user.email) {
          // I owe someone
          const key = `${user.email}-${expense.paid_by}`;
          balances[key] = (balances[key] || 0) + split.amount;
        } else if (expense.paid_by === user.email && split.user_email !== user.email) {
          // Someone owes me
          const key = `${split.user_email}-${user.email}`;
          balances[key] = (balances[key] || 0) + split.amount;
        }
      });
    });

    // Subtract settlements
    settlements.forEach(settlement => {
      const key = `${settlement.from_user}-${settlement.to_user}`;
      if (balances[key]) {
        balances[key] -= settlement.amount;
      }
    });

    return balances;
  };

  const balances = calculateBalances();
  const totalOwed = Object.entries(balances)
    .filter(([key]) => key.startsWith(user.email))
    .reduce((sum, [, amount]) => sum + amount, 0);
  
  const totalOwedToMe = Object.entries(balances)
    .filter(([key]) => key.endsWith(user.email) && !key.startsWith(user.email))
    .reduce((sum, [, amount]) => sum + amount, 0);

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