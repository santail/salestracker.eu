import React from 'react';
import {
  ShoppingBagIcon,
  BellIcon,
  ChartBarIcon,
} from '@heroicons/react/outline';
import { StatCard } from '../../components/stat-card/stat-card';
import { RecentChanges } from '../../components/recent-changes/recent-changes';
import { useDashboardStats } from '../../hooks/use-dashboard-stats';

export function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();

  if (error) {
    return (
      <div className="card">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-600">Error loading dashboard data</h3>
          <p className="mt-2 text-gray-500">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Products"
          value={stats?.totalProducts.toLocaleString() ?? 0}
          isLoading={isLoading}
          icon={<ShoppingBagIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Active Trackers"
          value={stats?.activeTrackers.toLocaleString() ?? 0}
          isLoading={isLoading}
          icon={<ChartBarIcon className="h-6 w-6" />}
        />
        <StatCard
          title="Price Alerts"
          value={stats?.priceAlerts.toLocaleString() ?? 0}
          isLoading={isLoading}
          icon={<BellIcon className="h-6 w-6" />}
        />
      </div>

      <RecentChanges
        changes={stats?.recentPriceChanges ?? []}
        isLoading={isLoading}
      />
    </div>
  );
} 