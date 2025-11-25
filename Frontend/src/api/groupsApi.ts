import client from "./client";

export const groupsApi = {
  list: async () => {
    const res = await client.get("/groups");
    return res.data;
  },

  get: async (id: number) => {
    const res = await client.get(`/groups/${id}`);
    return res.data;
  },
};
