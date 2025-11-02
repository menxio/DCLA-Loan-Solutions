import api from "@utils/api";
import type {
  ActivityLogResponse,
  ActivityLogQuery,
} from "./types";

export const activityService = {
  async list(params: ActivityLogQuery = {}): Promise<ActivityLogResponse> {
    const response = await api.get<ActivityLogResponse>("/activity", {
      params,
    });
    return response.data;
  },
};

export default activityService;
