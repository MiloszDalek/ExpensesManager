import { useQuery } from "@tanstack/react-query";
import client from "./client";


export function useTotalOwed() {
  return useQuery({
    queryKey: ["dashboard", "total-owed"],
    queryFn: async () => {
      const res = await client.get("/dashboard/total-owed");
      return res.data.total_owed;
    }
  });
}

export function useTotalReceivable() {
  return useQuery({
    queryKey: ["dashboard", "total-receivable"],
    queryFn: async () => {
      const res = await client.get("/dashboard/total-receivable");
      return res.data.total_receivable;
    }
  });
}

export function usePersonalSpending() {
  return useQuery({
    queryKey: ["dashboard", "personal-spending"],
    queryFn: async () => {
      const res = await client.get("/dashboard/personal-spending");
      return res.data.personal_spending;
    }
  });
}

export function useGroupBalances() {
  return useQuery({
    queryKey: ["dashboard", "group-balances"],
    queryFn: async () => {
      const res = await client.get("/dashboard/group-balances");
      return res.data.group_balances;
    }
  });
}
