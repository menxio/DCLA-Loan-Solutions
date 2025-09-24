import { useState, useEffect } from 'react';
import { portfolioService } from '@features/portfolio/api';
import { collectionsService } from '@features/collections/api';
import { CentersAPI } from '@features/centers/api';
import { MembersAPI } from '@features/member/api';

export interface DashboardStats {
  totalCenters: number;
  totalMembers: number;
  totalAmountDisbursed: number;
  totalOutstandingCollection: number;
  totalInterestIncome: number;
  dailyCollections: number;
  collectionRate: number;
  activeLoans: number;
}

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data from multiple services in parallel
      const [
        portfolioData,
        collectionsData,
        centersData,
        membersData,
      ] = await Promise.all([
        portfolioService.getPortfolioData(),
        collectionsService.getTodayCollections(),
        CentersAPI.getAll(),
        MembersAPI.getAll(),
      ]);

      // Calculate dashboard stats
      const dashboardStats: DashboardStats = {
        totalCenters: centersData.items?.length || 0,
        totalMembers: membersData.items?.length || 0,
        totalAmountDisbursed: portfolioData.totalAmountDisbursed,
        totalOutstandingCollection: portfolioData.totalOutstandingCollection,
        totalInterestIncome: portfolioData.totalAmountDisbursed * 0.2, // 20% interest rate
        dailyCollections: collectionsData?.length || 0,
        collectionRate: portfolioData.totalAmountDisbursed > 0 
          ? ((portfolioData.totalAmountDisbursed - portfolioData.totalOutstandingCollection) / portfolioData.totalAmountDisbursed) * 100
          : 0,
        activeLoans: portfolioData.centers.reduce((sum, center) => sum + (center.outstandingCollection > 0 ? 1 : 0), 0),
      };

      setStats(dashboardStats);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
