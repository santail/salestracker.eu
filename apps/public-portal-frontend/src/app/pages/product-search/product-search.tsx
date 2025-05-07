import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FilterIcon, SearchIcon } from '@heroicons/react/outline';
import { ProductCard } from '../../components/product-card';
import { PriceRangeFilter } from '../../components/price-range-filter';
import { Pagination } from '../../components/pagination';
import { api } from '../../lib/api';

interface Product {
  id: number;
  name: string;
  currentPrice: number;
  url: string;
}

interface SearchResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export function ProductSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<SearchResponse>({
    queryKey: ['products', searchQuery, priceRange, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(searchQuery && { query: searchQuery }),
        ...(priceRange.min && { minPrice: priceRange.min }),
        ...(priceRange.max && { maxPrice: priceRange.max }),
      });

      const response = await api.get(`/products/search?${params}`);
      return response.data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleProductClick = (productId: number) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Search
          </button>
        </form>
      </div>

      <div className="flex gap-8">
        <div className="w-64">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FilterIcon className="h-5 w-5 mr-2" />
              Filters
            </h3>
            <PriceRangeFilter
              minPrice={priceRange.min}
              maxPrice={priceRange.max}
              onChange={setPriceRange}
            />
          </div>
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Error loading products
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleProductClick(product.id)}
                  />
                ))}
              </div>

              {data && (
                <div className="mt-8">
                  <Pagination
                    currentPage={data.page}
                    totalPages={Math.ceil(data.total / data.limit)}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
