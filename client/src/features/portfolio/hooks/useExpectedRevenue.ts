import { useCallback, useEffect, useState } from "react";
import { portfolioService } from "../api";
import type {
  ExpectedRevenueSummary,
  RevenueDateFilter,
  RevenueGranularity,
} from "../types";
import { getApiErrorMessage } from "@utils/apiError";

export function useExpectedRevenue(
  granularity: RevenueGranularity,
  filter?: RevenueDateFilter,
) {
  const [data, setData] = useState<ExpectedRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpectedRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const expectedRevenueData = await portfolioService.getExpectedRevenueData(
        granularity,
        filter,
      );
      setData(expectedRevenueData);
    } catch (err) {
      console.error("Failed to fetch expected revenue data:", err);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter?.month, filter?.year, granularity]);

  useEffect(() => {
    fetchExpectedRevenueData();
  }, [fetchExpectedRevenueData]);

  return {
    data,
    loading,
    error,
    refetch: fetchExpectedRevenueData,
  };
}
