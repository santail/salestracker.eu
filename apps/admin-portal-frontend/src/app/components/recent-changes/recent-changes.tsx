import React from 'react';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

interface PriceChange {
  id: number;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changeDate: string;
}

interface RecentChangesProps {
  changes: PriceChange[];
  isLoading: boolean;
}

export function RecentChanges({ changes, isLoading }: RecentChangesProps) {
  if (isLoading) {
    return (
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Price Changes</h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Price Changes</h3>
        <p className="text-gray-500 text-center py-4">No recent price changes</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Price Changes</h3>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Old Price</th>
              <th>New Price</th>
              <th>Change</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {changes.map((change) => {
              const priceDiff = change.newPrice - change.oldPrice;
              const priceChange = ((priceDiff / change.oldPrice) * 100).toFixed(1);
              const isPriceIncrease = priceDiff > 0;

              return (
                <tr key={change.id}>
                  <td>{change.productName}</td>
                  <td>${change.oldPrice.toFixed(2)}</td>
                  <td>${change.newPrice.toFixed(2)}</td>
                  <td>
                    <span
                      className={`font-medium ${
                        isPriceIncrease ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {isPriceIncrease ? '+' : ''}
                      {priceChange}%
                    </span>
                  </td>
                  <td>{new Date(change.changeDate).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 