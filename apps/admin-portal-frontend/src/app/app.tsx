import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from './pages/login/login';
import { ProtectedRoute } from './components/protected-route/protected-route';
import { authService } from './services/auth.service';
import {
  ChartBarIcon,
  CogIcon,
  HomeIcon,
  ShoppingBagIcon,
  UserGroupIcon,
  ArrowDownLeftIcon
} from '@heroicons/react/20/solid';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Products', href: '/products', icon: ShoppingBagIcon },
  { name: 'Scraping Rules', href: '/scraping-rules', icon: CogIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Users', href: '/users', icon: UserGroupIcon },
];

function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-primary-500"
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-3 text-gray-600 hover:bg-gray-50 hover:text-red-500"
            >
              <ArrowDownLeftIcon className="h-5 w-5 mr-3" />
              Logout
            </button>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          <header className="bg-white shadow">
            <div className="px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900">Total Products</h3>
        <p className="mt-2 text-3xl font-bold text-primary-500">1,234</p>
      </div>
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900">Active Trackers</h3>
        <p className="mt-2 text-3xl font-bold text-primary-500">567</p>
      </div>
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900">Price Alerts</h3>
        <p className="mt-2 text-3xl font-bold text-primary-500">89</p>
      </div>
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Add more protected routes here */}
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
