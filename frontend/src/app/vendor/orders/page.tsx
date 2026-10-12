// src/app/vendor/orders/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type VendorOrder = {
  id: number;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal: string;
  shipping_total: string;
  grand_total: string;
  placed_at: string;
  delivered_at: string | null;
  buyer_name: string;
  buyer_city: string | null;
  buyer_county: string | null;
  buyer_address_line: string | null;
  item_count: number;
  payment_status: string | null;
};

type Response = {
  count: number;
  orders: VendorOrder[];
  vendor_default_shipping: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending_shipping_quote: 'bg-amber-100 text-amber-800',
  pending_payment: 'bg-amber-100 text-amber-800',
  paid: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-200 text-gray-700',
  refunded: 'bg-red-100 text-red-800',
};

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [defaultShipping, setDefaultShipping] = useState<string>('2.00');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Which order is currently showing the fee input
  const [quoteOrderId, setQuoteOrderId] = useState<number | null>(null);
  const [quoteFee, setQuoteFee] = useState<string>('');

  async function load() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    const me = getUser();
    if (!me || (me.role !== 'vendor_owner' && me.role !== 'admin')) {
      router.push('/');
      return;
    }
    try {
      const data = await apiGet<Response>('/orders/vendor/mine', token);
      setOrders(data.orders);
      setDefaultShipping(Number(data.vendor_default_shipping || 0).toFixed(2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openQuote(o: VendorOrder) {
    setQuoteOrderId(o.id);
    setQuoteFee(defaultShipping);
    setError(null);
  }

  function cancelQuote() {
    setQuoteOrderId(null);
    setQuoteFee('');
  }

  async function submitQuote(orderId: number) {
    const n = parseFloat(quoteFee);
    if (isNaN(n) || n < 0) {
      setError('Shipping fee must be a number >= 0');
      return;
    }
    const token = getToken();
    if (!token) return;
    setBusyId(orderId);
    setError(null);
    try {
      await apiPost(
        `/orders/vendor/${orderId}/set-shipping`,
        { shipping_fee: n },
        token
      );
      setQuoteOrderId(null);
      setQuoteFee('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set shipping');
    } finally {
      setBusyId(null);
    }
  }

  async function markShipped(orderId: number) {
    if (!confirm('Mark this order as shipped?')) return;
    const token = getToken();
    if (!token) return;
    setBusyId(orderId);
    setError(null);
    try {
      await apiPost(`/orders/vendor/${orderId}/ship`, {}, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark shipped');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading orders…</p>
        </div>
      </main>
    );
  }

  const needsQuote = orders.filter((o) => o.status === 'pending_shipping_quote').length;
  const awaitingPayment = orders.filter((o) => o.status === 'pending_payment').length;
  const awaitingShipment = orders.filter((o) => o.status === 'paid').length;
  const inTransit = orders.filter((o) => o.status === 'shipped').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/vendor" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to dashboard
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Incoming Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </p>
        </div>

        {orders.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {needsQuote > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <strong>{needsQuote}</strong> need shipping quote
              </span>
            )}
            {awaitingPayment > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <strong>{awaitingPayment}</strong> awaiting payment
              </span>
            )}
            {awaitingShipment > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <strong>{awaitingShipment}</strong> to ship
              </span>
            )}
            {inTransit > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <strong>{inTransit}</strong> in transit
              </span>
            )}
            {deliveredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <strong>{deliveredCount}</strong> delivered
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-8 bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-500">
              No orders yet. When buyers purchase your products, they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((o) => {
              const badge =
                STATUS_STYLES[o.status] || 'bg-gray-100 text-gray-700';
              const canShip = o.status === 'paid';
              const isDelivered = o.status === 'delivered';
              const needsQuoteForThis = o.status === 'pending_shipping_quote';
              const isQuoting = quoteOrderId === o.id;

              return (
                <div
                  key={o.id}
                  className={`bg-white rounded-xl shadow-sm p-5 transition-all ${
                    isDelivered
                      ? 'border-l-4 border-emerald-500 bg-emerald-50/30'
                      : needsQuoteForThis
                      ? 'border-l-4 border-amber-400'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap gap-4 justify-between items-start">
                    <div className="min-w-[200px]">
                      <p className="font-semibold text-gray-900 flex items-center gap-2">
                        {o.order_number}
                        {isDelivered && (
                          <span className="text-emerald-600 text-lg" title="Completed">
                            ✓
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Buyer: <span className="font-medium">{o.buyer_name}</span>
                      </p>
                      {o.buyer_address_line && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 {o.buyer_address_line}
                          {o.buyer_city ? `, ${o.buyer_city}` : ''}
                          {o.buyer_county ? `, ${o.buyer_county}` : ''}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(o.placed_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {o.item_count} item{o.item_count !== 1 ? 's' : ''} ·{' '}
                        {o.payment_status === 'confirmed' ? (
                          <span className="text-emerald-700 font-medium">Paid</span>
                        ) : (
                          <span className="text-amber-600 font-medium">
                            Payment {o.payment_status}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${badge}`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                      <p className="mt-2 font-bold text-gray-900">
                        ${o.grand_total} {o.currency_code}
                      </p>
                      {Number(o.shipping_total) > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          + ${o.shipping_total} shipping (COD)
                        </p>
                      )}
                    </div>
                  </div>

                  {needsQuoteForThis && !isQuoting && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-amber-800 mb-3">
                        <strong>Action needed:</strong> Set the shipping fee for
                        this buyer based on their location.
                      </p>
                      <button
                        onClick={() => openQuote(o)}
                        className="px-5 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors"
                      >
                        Set shipping fee
                      </button>
                    </div>
                  )}

                  {needsQuoteForThis && isQuoting && (
                    <div className="mt-4 pt-4 border-t bg-amber-50 rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping fee to charge {o.buyer_name} (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quoteFee}
                        onChange={(e) => setQuoteFee(e.target.value)}
                        className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Your default is <strong>${defaultShipping}</strong>. Adjust
                        based on the buyer&apos;s distance. The buyer will see this
                        fee before paying. Courier collects it in cash on delivery.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => submitQuote(o.id)}
                          disabled={busyId === o.id}
                          className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400"
                        >
                          {busyId === o.id ? 'Saving…' : 'Confirm fee'}
                        </button>
                        <button
                          onClick={cancelQuote}
                          disabled={busyId === o.id}
                          className="px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {canShip && (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={() => markShipped(o.id)}
                        disabled={busyId === o.id}
                        className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
                      >
                        {busyId === o.id ? 'Marking…' : 'Mark as shipped'}
                      </button>
                    </div>
                  )}

                  {isDelivered && (
                    <div className="mt-4 pt-4 border-t border-emerald-200 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-emerald-800">
                        <span className="text-xl">🎉</span>
                        <div>
                          <p className="text-sm font-semibold">Order complete</p>
                          <p className="text-xs text-emerald-700">
                            {o.delivered_at
                              ? `Delivered ${new Date(o.delivered_at).toLocaleDateString()}`
                              : 'Delivered to buyer'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-700 italic">
                        Thank you for selling with LIB_MARKET_GROUND
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}