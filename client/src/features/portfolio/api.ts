import api from '@utils/api';
import type { PortfolioSummary, ProjectedIncomeSummary } from './types';

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
};

export default portfolioService;
