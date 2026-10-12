// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type VendorLite = {
  id: number;
  verification_status: string;
};

type OrderStats = {
  total: number;
  pending_payment: number;
  paid: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  gross_usd: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalVendors: 0,
    pendingVendors: 0,
    approvedVendors: 0,
  });
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }
    if (me.role !== 'admin') { router.push('/'); return; }

    (async () => {
      try {
        const [vendorData, orderData] = await Promise.all([
          apiGet<{ count: number; vendors: VendorLite[] }>('/admin/vendors', token),
          apiGet<{ count: number; stats: OrderStats; orders: unknown[] }>('/admin/orders', token),
        ]);

        const total = vendorData.count;
        const pending = vendorData.vendors.filter((v) => v.verification_status === 'pending').length;
        const approved = vendorData.vendors.filter((v) => v.verification_status === 'approved').length;
        setStats({ totalVendors: total, pendingVendors: pending, approvedVendors: approved });
        setOrderStats(orderData.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading admin dashboard…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div>
          <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">
            Admin Panel
          </p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Platform Overview</h1>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Total Vendors</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalVendors}</p>
            <p className="text-xs text-gray-400 mt-1">across the marketplace</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Pending Approval</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.pendingVendors}</p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.pendingVendors > 0 ? 'Need your attention' : 'All caught up'}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.approvedVendors}</p>
            <p className="text-xs text-gray-400 mt-1">active sellers</p>
          </div>
        </div>

        {orderStats && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{orderStats.total}</p>
              <p className="text-xs text-gray-400 mt-1">all-time</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Awaiting Payment</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{orderStats.pending_payment}</p>
              <p className="text-xs text-gray-400 mt-1">
                {orderStats.pending_payment > 0 ? 'Follow up' : 'None pending'}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <p className="text-sm text-gray-500">Gross Revenue (USD)</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                ${Number(orderStats.gross_usd).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">before commissions</p>
            </div>
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/vendors"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Vendor Applications →
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Review new vendor applications and approve, reject, or suspend
            </p>
            {stats.pendingVendors > 0 && (
              <span className="mt-3 inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                {stats.pendingVendors} pending
              </span>
            )}
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Platform Orders →
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              View every order across all vendors on the marketplace
            </p>
            {orderStats && orderStats.pending_payment > 0 && (
              <span className="mt-3 inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                {orderStats.pending_payment} awaiting payment
              </span>
            )}
          </Link>

          <Link
            href="/admin/payouts"
            className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <h2 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">
              Vendor Payouts →
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Track what you owe vendors and record payouts
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}