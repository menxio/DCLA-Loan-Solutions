import axios from 'axios';
import type {
  ActualRevenueSummary,
  ExpectedRevenueSummary,
  PortfolioSummary,
  ProjectedIncomeSummary,
  RevenueDateFilter,
  RevenueGranularity,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const portfolioApi = axios.create({
  baseURL: `${API_BASE_URL}/portfolio`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const portfolioService = {
  // Get portfolio data
  getPortfolioData: async (): Promise<PortfolioSummary> => {
    const response = await portfolioApi.get('/');
    return response.data;
  },

  // Get projected income data
  getProjectedIncomeData: async (): Promise<ProjectedIncomeSummary> => {
    const response = await portfolioApi.get('/projected-income');
    return response.data;
  },

  getExpectedRevenueData: async (
    granularity: RevenueGranularity,
    filter?: RevenueDateFilter,
  ): Promise<ExpectedRevenueSummary> => {
    const response = await portfolioApi.get('/expected-revenue', {
      params: { granularity, ...filter },
    });
    return response.data;
  },

  getActualRevenueData: async (
    granularity: RevenueGranularity,
    filter?: RevenueDateFilter,
  ): Promise<ActualRevenueSummary> => {
    const response = await portfolioApi.get('/actual-revenue', {
      params: { granularity, ...filter },
    });
    return response.data;
  },
};

export default portfolioService;
