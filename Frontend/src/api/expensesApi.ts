import client from "./client";

export const expensesApi = {
  list: async () => {
    const res = await client.get("/expenses");
    return res.data;
  },

  get: async (id: number) => {
    const res = await client.get(`/expenses/${id}`);
    return res.data;
  },
};
