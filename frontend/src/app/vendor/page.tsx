// src/app/vendor/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Vendor = {
  id: number;
  business_name: string;
  slug: string;
  verification_status: string;
  commission_rate: string;
  rating_avg: string;
  total_orders: number;
  total_sales_usd: string;
  county: string | null;
  city: string | null;
};

type ProductListResponse = {
  count: number;
  products: Array<{ id: number; status: string; base_price: string; stock: number }>;
};

type OrderListResponse = {
  count: number;
  orders: Array<{ id: number; status: string; subtotal: string; grand_total: string }>;
};

export default function VendorDashboard() {
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    grossSales: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token || !me) {
      router.push('/login');
      return;
    }
    if (me.role !== 'vendor_owner' && me.role !== 'admin') {
      router.push('/');
      return;
    }

    (async () => {
      try {
        const [vendorData, productsData, ordersData] = await Promise.all([
          apiGet<{ vendor: Vendor }>('/vendors/me', token),
          apiGet<ProductListResponse>('/vendors/me/products', token),
          apiGet<OrderListResponse>('/orders/vendor/mine', token),
        ]);

        setVendor(vendorData.vendor);

        const activeCount = productsData.products.filter((p) => p.status === 'active').length;
        const pendingCount = ordersData.orders.filter((o) => o.status === 'paid').length;

        // Gross sales = product subtotal only (shipping is retained by the vendor, not the platform)
        const sales = ordersData.orders
          .filter((o) => ['paid', 'shipped', 'delivered'].includes(o.status))
          .reduce((sum, o) => sum + parseFloat(o.subtotal || '0'), 0);

        setStats({
          totalProducts: productsData.count,
          activeProducts: activeCount,
          totalOrders: ordersData.count,
          pendingOrders: pendingCount,
          grossSales: sales,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading dashboard…</p>
        </div>
      </main>
    );
  }

  if (error || !vendor) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Vendor not found</h1>
          <p className="mt-3 text-gray-600">{error || 'Apply to become a vendor first.'}</p>
          <Link href="/" className="mt-6 inline-block px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">
              Vendor Dashboard
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-900">{vendor.business_name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {vendor.city || vendor.county || 'Liberia'} · Status:{' '}
              <span className="font-medium uppercase text-emerald-700">
                {vendor.verification_status}
              </span>
            </p>
          </div>
          <Link
            href="/vendor/products/new"
            className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
          >
            + Add product
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Products</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalProducts}</p>
            <p className="text-xs text-gray-400 mt-1">{stats.activeProducts} active</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Orders</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.pendingOrders > 0 ? (
                <span className="text-amber-600 font-medium">{stats.pendingOrders} to ship</span>
              ) : (
                'All caught up'
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Gross sales</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${stats.grossSales.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">USD · product sales</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Commission</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {Math.round(parseFloat(vendor.commission_rate) * 100)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">platform fee</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/vendor/products" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              My Products →
            </h2>
            <p className="mt-1 text-sm text-gray-500">Manage listings, prices, and stock</p>
          </Link>
          <Link href="/vendor/orders" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Incoming Orders →
            </h2>
            <p className="mt-1 text-sm text-gray-500">View orders and mark them shipped</p>
          </Link>
          <Link href="/vendor/payouts" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Payouts →
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              See what you&apos;ve earned and what we owe you
            </p>
          </Link>
          <Link href="/vendor/settings" className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group">
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Settings →
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Shipping fee default and account options
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}