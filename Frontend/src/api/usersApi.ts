import client from "./client";
import type {
	ApiMessageResponse,
	ApiSystemUserActivityResponse,
	ApiSystemUserActivityStatsResponse,
	ApiUserUpdate,
	User,
} from "@/types";
import type { SystemUserRole } from "@/types/enums";

export type AdminUsersActivityFilters = {
	search?: string;
	role?: SystemUserRole | "all";
	is_active?: "all" | "active" | "inactive";
};

export const usersApi = {
	listAll: async (): Promise<User[]> => {
		const { data } = await client.get<User[]>("/users/all");
		return data;
	},

	listActivity: async (
		filters?: AdminUsersActivityFilters
	): Promise<ApiSystemUserActivityResponse[]> => {
		const params: Record<string, string | boolean> = {};

		if (filters?.search?.trim()) {
			params.search = filters.search.trim();
		}

		if (filters?.role && filters.role !== "all") {
			params.role = filters.role;
		}

		if (filters?.is_active === "active") {
			params.is_active = true;
		} else if (filters?.is_active === "inactive") {
			params.is_active = false;
		}

		const { data } = await client.get<ApiSystemUserActivityResponse[]>("/users/activity", {
			params,
		});

		return data;
	},

	getActivityStats: async (
		filters?: AdminUsersActivityFilters
	): Promise<ApiSystemUserActivityStatsResponse> => {
		const params: Record<string, string | boolean> = {};

		if (filters?.search?.trim()) {
			params.search = filters.search.trim();
		}

		if (filters?.role && filters.role !== "all") {
			params.role = filters.role;
		}

		if (filters?.is_active === "active") {
			params.is_active = true;
		} else if (filters?.is_active === "inactive") {
			params.is_active = false;
		}

		const { data } = await client.get<ApiSystemUserActivityStatsResponse>("/users/activity/stats", {
			params,
		});

		return data;
	},

	getById: async (userId: number): Promise<User> => {
		const { data } = await client.get<User>(`/users/${userId}`);
		return data;
	},

	update: async (userId: number, payload: ApiUserUpdate): Promise<User> => {
		const { data } = await client.put<User>(`/users/${userId}`, payload);
		return data;
	},

	updateMe: async (username: string): Promise<User> => {
		const { data } = await client.patch<User>("/users/me", { username });
		return data;
	},

	changeMyPassword: async (
		currentPassword: string,
		newPassword: string
	): Promise<ApiMessageResponse> => {
		const payload = {
			current_password: currentPassword,
			new_password: newPassword,
		};
		const { data } = await client.patch<ApiMessageResponse>("/users/me/password", payload);
		return data;
	},
};
