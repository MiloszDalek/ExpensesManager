import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "@/api/dashboard";
import type { DashboardSummaryResponse } from "@/types";

export const useDashboardSummary = () =>
  useQuery<DashboardSummaryResponse>({
    queryKey: ["dashboardSummary"],
    queryFn: getDashboard,
  });
