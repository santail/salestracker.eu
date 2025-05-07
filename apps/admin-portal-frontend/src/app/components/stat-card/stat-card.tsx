import React from 'react';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

interface StatCardProps {
  title: string;
  value: number | string;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function StatCard({ title, value, isLoading, icon }: StatCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          <p className="text-3xl font-bold text-primary-500">{value}</p>
        )}
      </div>
    </div>
  );
} 