import { useQuery } from "@tanstack/react-query";
import type { ApiNotificationResponse } from "@/types";

export const useDashboardSummary = () =>
  useQuery<ApiNotificationResponse[]>({
    queryKey: ["dashboardSummary", "placeholder"],
    queryFn: async () => [],
    enabled: false,
  });
