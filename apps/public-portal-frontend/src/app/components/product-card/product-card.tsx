import React from 'react';
import { CurrencyDollarIcon, ExternalLinkIcon } from '@heroicons/react/outline';

interface Product {
  id: number;
  name: string;
  currentPrice: number;
  url: string;
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2 line-clamp-2">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-green-600">
            <CurrencyDollarIcon className="h-5 w-5 mr-1" />
            <span className="font-semibold">{product.currentPrice.toFixed(2)}</span>
          </div>
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 hover:text-blue-600"
          >
            <ExternalLinkIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
} 