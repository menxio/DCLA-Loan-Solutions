import { useState, useEffect, useCallback } from "react";
import type { PortfolioSummary } from "../types";
import { portfolioService } from "../api";
import { getApiErrorMessage } from "@utils/apiError";

export function usePortfolio() {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const portfolioData = await portfolioService.getPortfolioData();
      setData(portfolioData);
    } catch (err) {
      console.error("Failed to fetch portfolio data:", err);
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    data,
    loading,
    error,
    refetch: fetchPortfolioData,
  };
}
