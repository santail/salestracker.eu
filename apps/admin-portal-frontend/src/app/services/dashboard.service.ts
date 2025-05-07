import { api } from './api';

export interface DashboardStats {
  totalProducts: number;
  activeTrackers: number;
  priceAlerts: number;
  recentPriceChanges: {
    id: number;
    productName: string;
    oldPrice: number;
    newPrice: number;
    changeDate: string;
  }[];
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
}; 