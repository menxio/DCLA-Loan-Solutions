import api from '@utils/api';
import type {
  ActualRevenueSummary,
  ExpectedRevenueSummary,
  PortfolioSummary,
  ProjectedIncomeSummary,
  RevenueDateFilter,
  RevenueGranularity,
} from './types';

export const portfolioService = {
  // Get portfolio data
  getPortfolioData: async (): Promise<PortfolioSummary> => {
    const response = await api.get('/portfolio');
    return response.data;
  },

  // Get projected income data
  getProjectedIncomeData: async (): Promise<ProjectedIncomeSummary> => {
    const response = await api.get('/portfolio/projected-income');
    return response.data;
  },

  getExpectedRevenueData: async (
    granularity: RevenueGranularity,
    filter?: RevenueDateFilter,
  ): Promise<ExpectedRevenueSummary> => {
    const response = await api.get('/portfolio/expected-revenue', {
      params: { granularity, ...filter },
    });
    return response.data;
  },

  getActualRevenueData: async (
    granularity: RevenueGranularity,
    filter?: RevenueDateFilter,
  ): Promise<ActualRevenueSummary> => {
    const response = await api.get('/portfolio/actual-revenue', {
      params: { granularity, ...filter },
    });
    return response.data;
  },
};

export default portfolioService;
