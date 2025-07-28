import api from "@utils/api";
import type { Member } from "./types";

export const MemberHTTP = {
    createMember: async (data: Member): Promise<Member> => {
        const response = await api.post("/members/", data);
        return response.data;
    },

    updateMember: async (data: Member): Promise<Member> => {
        const response = await api.put(`/members/${data.id}`, data);
        return response.data;
    },
    
    deleteMember: async (id: string): Promise<void> => {
        const response = await api.delete(`/members/${id}`);

        return response.data;
    },

    getAllMembers: async (): Promise<Member[]> => {
        const response = await api.get("/members");
        return response.data;
    }
}


