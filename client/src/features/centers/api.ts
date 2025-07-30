import api from "@utils/api";

export const CentersAPI = {
  getAll: async () => {
    const res = await api.get("/centers");
    return res.data;
  },
  create: async (data: {
    name: string;
    collectionDay: string;
    address?: string;
  }) => {
    const res = await api.post("/centers", data);
    return res.data;
  },
  update: async (
    id: string,
    data: { name?: string; collectionDay?: string; address?: string }
  ) => {
    const res = await api.patch(`/centers/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/centers/${id}`);
    return res.data;
  },
};
