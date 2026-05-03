import { useCallback, useEffect, useState } from "react";
import { portfolioService } from "../api";
import type {
  ActualRevenueSummary,
  RevenueDateFilter,
  RevenueGranularity,
} from "../types";

export function useActualRevenue(
  granularity: RevenueGranularity,
  filter?: RevenueDateFilter,
) {
  const [data, setData] = useState<ActualRevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActualRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const actualRevenueData =
        await portfolioService.getActualRevenueData(granularity, filter);
      setData(actualRevenueData);
    } catch (err) {
      console.error("Failed to fetch actual revenue data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch actual revenue data",
      );
    } finally {
      setLoading(false);
    }
  }, [filter?.month, filter?.year, granularity]);

  useEffect(() => {
    fetchActualRevenueData();
  }, [fetchActualRevenueData]);

  return {
    data,
    loading,
    error,
    refetch: fetchActualRevenueData,
  };
}
