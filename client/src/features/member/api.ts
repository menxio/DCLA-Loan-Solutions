import api from "@utils/api";
import type { MemberFormData } from "./types";

export const MembersAPI = {
    getAll: async () => {
        const res = await api.get("/members");
        return res.data;
    },
    
    create: async (data: MemberFormData) => {
        const response = await api.post("/members/", data);
        return response.data;
    },

    update: async (id: string, data: MemberFormData) => {
        const response = await api.put(`/members/${id}`, data);
        return response.data;
    },
    
    remove: async (id: string) => {
        const response = await api.delete(`/members/${id}`);
        return response.data;
    },
}


