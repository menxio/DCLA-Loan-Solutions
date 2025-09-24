import { useState, useEffect, useCallback } from 'react';
import type { ProjectedIncomeSummary } from '../types';
import { portfolioService } from '../api';

export function useProjectedIncome() {
  const [data, setData] = useState<ProjectedIncomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectedIncomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectedIncomeData = await portfolioService.getProjectedIncomeData();
      setData(projectedIncomeData);
    } catch (err) {
      console.error('Failed to fetch projected income data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch projected income data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjectedIncomeData();
  }, [fetchProjectedIncomeData]);

  return {
    data,
    loading,
    error,
    refetch: fetchProjectedIncomeData,
  };
}
