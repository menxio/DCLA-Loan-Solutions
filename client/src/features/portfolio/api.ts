import axios from 'axios';
import type { PortfolioSummary, ProjectedIncomeSummary } from './types';

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
};

export default portfolioService;
