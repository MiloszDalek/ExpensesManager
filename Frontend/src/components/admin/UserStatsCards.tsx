import type { TFunction } from "i18next";

import {
    Card,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import type { ApiSystemUserActivityStatsResponse } from "@/types";

type UserStatsCardsProps = {
    stats: ApiSystemUserActivityStatsResponse;
    t: TFunction;
};

export default function UserStatsCards({ stats, t }: UserStatsCardsProps) {
    return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            <Card className="border border-border bg-card/80">
                <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wide">
                        {t("adminPage.stats.totalUsers")}
                    </CardDescription>
                    <CardTitle className="text-2xl">{stats.total_users}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="border border-border bg-card/80">
                <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wide">
                        {t("adminPage.stats.activeUsers")}
                    </CardDescription>
                    <CardTitle className="text-2xl">{stats.active_users}</CardTitle>
                </CardHeader>
            </Card>

            <Card className="border border-border bg-card/80">
                <CardHeader className="pb-2">
                    <CardDescription className="text-xs uppercase tracking-wide">
                        {t("adminPage.stats.inactiveUsers")}
                    </CardDescription>
                    <CardTitle className="text-2xl">{stats.inactive_users}</CardTitle>
                </CardHeader>
            </Card>
        </div>
    );
}
