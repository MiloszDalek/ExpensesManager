import client from "./client";
import type { DashboardSummaryResponse } from "@/types";

export const getDashboard = async (): Promise<DashboardSummaryResponse> => {
  const res = await client.get("/dashboard");
  return res.data;
};
