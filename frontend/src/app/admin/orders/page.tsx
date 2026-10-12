// src/app/admin/orders/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Order = {
  id: number;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal: string;
  grand_total: string;
  grand_total_usd: string;
  placed_at: string;
  delivered_at: string | null;
  buyer_name: string;
  buyer_email: string;
  vendor_name: string;
  vendor_slug: string;
  item_count: number;
  payment_status: string | null;
  payment_provider: string | null;
};

type Stats = {
  total: number;
  pending_payment: number;
  paid: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  refunded: number;
  gross_usd: string;
};

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'pending_payment', label: 'Pending payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

function statusColor(status: string): string {
  switch (status) {
    case 'paid':            return 'bg-emerald-50 text-emerald-700';
    case 'shipped':         return 'bg-blue-50 text-blue-700';
    case 'delivered':       return 'bg-emerald-100 text-emerald-800';
    case 'pending_payment': return 'bg-amber-50 text-amber-700';
    case 'cancelled':       return 'bg-gray-100 text-gray-700';
    case 'refunded':        return 'bg-red-50 text-red-700';
    default:                return 'bg-gray-100 text-gray-700';
  }
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sweeping, setSweeping] = useState(false);

  async function loadOrders() {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }
    if (me.role !== 'admin') { router.push('/'); return; }

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set('status', status);
      if (search) qs.set('search', search);
      const data = await apiGet<{ count: number; stats: Stats; orders: Order[] }>(
        `/admin/orders${qs.toString() ? '?' + qs.toString() : ''}`,
        token
      );
      setOrders(data.orders);
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadOrders();
  }

  async function handleSweep() {
    const ok = window.confirm(
      'Sweep stale orders?\n\n' +
      'This will auto-cancel any order stuck in "pending shipping quote" or ' +
      '"pending payment" for more than 48 hours. Reserved stock will be released. ' +
      'This cannot be undone.'
    );
    if (!ok) return;

    const token = getToken();
    if (!token) return;

    setSweeping(true);
    setError(null);
    try {
      const data = await apiPost<{ message: string; expired: number; order_ids: number[] }>(
        '/admin/orders/expire-stale',
        { hours: 48 },
        token
      );
      if (data.expired === 0) {
        alert('✓ Nothing to sweep — no stale orders found.');
      } else {
        alert(
          `✓ Swept ${data.expired} order(s):\n\n` +
          data.order_ids.map((id) => `#${id}`).join(', ')
        );
      }
      await loadOrders();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sweep failed';
      setError(msg);
      alert('Sweep failed: ' + msg);
    } finally {
      setSweeping(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/admin" className="text-sm text-emerald-700 hover:underline">
          ← Back to admin panel
        </Link>

        <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Orders</h1>
            <p className="mt-1 text-gray-600">
              Every order across all vendors on LIB_MARKET_GROUND
            </p>
          </div>
          <button
            onClick={handleSweep}
            disabled={sweeping}
            title="Auto-cancel orders stuck in pending_shipping_quote / pending_payment for more than 48h"
            className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sweeping ? 'Sweeping…' : '🧹 Sweep stale orders'}
          </button>
        </div>

        {stats && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Pending Payment</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pending_payment}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Paid & Beyond</p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.paid}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Gross Revenue (USD)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${Number(stats.gross_usd).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex flex-col sm:flex-row gap-3"
        >
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or buyer email…"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <p className="text-gray-500">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-gray-500">No orders match your filters.</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Order #</th>
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => router.push(`/admin/orders/${o.id}`)}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-900">
                        {o.order_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{o.buyer_name}</div>
                        <div className="text-xs text-gray-500">{o.buyer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{o.vendor_name}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        ${Number(o.grand_total).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {o.payment_provider ? (
                          <div>
                            <div className="text-xs uppercase text-gray-500">
                              {o.payment_provider.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-700">
                              {o.payment_status}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor(o.status)}`}>
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(o.placed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}