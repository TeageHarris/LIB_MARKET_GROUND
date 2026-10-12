// src/app/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/auth';

type OrderRow = {
  id: number;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal: string;
  grand_total: string;
  placed_at: string;
  delivered_at: string | null;
  vendor_name: string;
  item_count: number;
  first_item_title: string;
  payment_status: string | null;
};

type OrdersResponse = { count: number; orders: OrderRow[] };

const STATUS_STYLES: Record<string, string> = {
  pending_payment: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-200 text-gray-700',
  refunded: 'bg-red-100 text-red-800',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    (async () => {
      try {
        const data = await apiGet<OrdersResponse>('/orders', token);
        setOrders(data.orders);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading orders…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-gray-900">No orders yet</h1>
          <p className="mt-2 text-gray-600">
            When you place your first order, it will show up here.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block px-8 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
          >
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>

        <div className="mt-6 space-y-4">
          {orders.map((o) => {
            const badge = STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-800';
            return (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{o.order_number}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {o.vendor_name} · {o.item_count} item{o.item_count !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(o.placed_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${badge}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                    <p className="mt-2 font-bold text-gray-900">
                      ${o.grand_total} {o.currency_code}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}