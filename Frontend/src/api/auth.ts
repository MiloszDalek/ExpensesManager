import client from "./client";
import type { TokenResponse } from "@/types";


export async function login(email: string, password: string): Promise<TokenResponse> {
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);

  const { data } = await client.post("/auth/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  localStorage.setItem("access_token", data.access_token);

  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
}

export async function register(email: string, username: string, password: string) {
  const payload = { email, username, password };
  const { data } = await client.post("/users/", payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await client.get("/users/me");
  return data;
}
