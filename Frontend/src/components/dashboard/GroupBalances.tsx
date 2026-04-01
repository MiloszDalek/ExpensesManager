import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { Users, ArrowRight } from "lucide-react";

interface GroupBalancesProps {
  groups: Array<{ id: number; name: string }>;
  balances: Record<number, Record<string, number>>;
  userEmail: string;
}

export default function GroupBalances({ groups }: GroupBalancesProps) {
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
            {groups.slice(0, 5).map((group) => (
              <Link key={group.id} to={createPageUrl("GroupDetail", { id: group.id })}>
                <div className="rounded-xl border border-gray-100 p-4 transition-all duration-200 hover:border-purple-200 hover:shadow-md">
                  <h4 className="font-semibold text-gray-900">{group.name}</h4>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}