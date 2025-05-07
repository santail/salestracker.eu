import React from 'react';

interface PriceRangeFilterProps {
  minPrice: string;
  maxPrice: string;
  onChange: (range: { min: string; max: string }) => void;
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
  onChange,
}: PriceRangeFilterProps) {
  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ min: e.target.value, max: maxPrice });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ min: minPrice, max: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="minPrice" className="block text-sm font-medium text-gray-700">
          Min Price
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            name="minPrice"
            id="minPrice"
            value={minPrice}
            onChange={handleMinPriceChange}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">
          Max Price
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            name="maxPrice"
            id="maxPrice"
            value={maxPrice}
            onChange={handleMaxPriceChange}
            className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
} 