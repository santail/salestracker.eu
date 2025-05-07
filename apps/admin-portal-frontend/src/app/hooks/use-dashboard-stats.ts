import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

interface DashboardStats {
  totalProducts: number;
  activeTrackers: number;
  priceAlerts: number;
  recentPriceChanges: Array<{
    id: number;
    productName: string;
    oldPrice: number;
    newPrice: number;
    changeDate: string;
  }>;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dashboard/stats');
      return data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
