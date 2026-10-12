// src/app/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/auth';

type OrderItem = {
  id: number;
  product_id: number | null;
  title_snapshot: string;
  image_snapshot: string | null;
  unit_price: string;
  quantity: number;
  line_total: string;
  commission_amount: string;
};

type Payment = {
  id: number;
  provider: string;
  provider_reference: string | null;
  amount: string;
  currency_code: string;
  status: string;
  paid_at: string | null;
  failure_reason: string | null;
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal: string;
  shipping_total: string;
  tax_total: string;
  discount_total: string;
  grand_total: string;
  placed_at: string;
  delivered_at: string | null;
  buyer_note: string | null;
  vendor_name: string;
  vendor_slug: string;
  recipient_name: string;
  shipping_phone: string;
  country: string;
  county: string | null;
  city: string;
  line1: string;
  line2: string | null;
  items: OrderItem[];
  payments: Payment[];
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

const PAYMENT_INFO = {
  orangeMoney: '+231 776315270',
  momo:        '+231 886 993491',
  whatsApp:    '+231 88 067 6703',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] || 'bg-gray-100 text-gray-800';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const data = await apiGet<{ order: Order }>(`/orders/${orderId}`, token);
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [orderId]);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  async function confirmDelivery() {
    const token = getToken();
    if (!token || !order) return;
    setConfirming(true);
    setError(null);
    try {
      await apiPost(`/orders/${order.id}/confirm-delivery`, {}, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setConfirming(false);
    }
  }

  async function cancelOrder() {
    if (!order) return;
    const ok = window.confirm(
      'Cancel this order? The reserved stock will be released and this cannot be undone.'
    );
    if (!ok) return;

    const token = getToken();
    if (!token) return;
    setCancelling(true);
    setError(null);
    try {
      await apiPost(`/orders/${order.id}/cancel`, {}, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading order…</p>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Order not found</h1>
          <p className="mt-2 text-gray-500">{error}</p>
          <Link href="/orders" className="mt-6 inline-block text-emerald-700 font-medium hover:underline">
            ← Back to my orders
          </Link>
        </div>
      </main>
    );
  }

  if (!order) return null;

  const shippingSet = Number(order.shipping_total) > 0;
  const shippingFee = Number(order.shipping_total).toFixed(2);
  const canCancel = ['pending_shipping_quote', 'pending_payment'].includes(order.status);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to my orders
        </Link>

        <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Order {order.order_number}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed {new Date(order.placed_at).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Cancelled banner */}
        {order.status === 'cancelled' && (
          <section className="mt-6 bg-gray-100 border border-gray-300 rounded-xl p-5">
            <p className="font-semibold text-gray-800">Order cancelled</p>
            <p className="text-sm text-gray-700 mt-1">
              This order was cancelled. The reserved stock has been released.
              No payment is due.
            </p>
          </section>
        )}

        {/* Items */}
        <section className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Items from <span className="text-emerald-700">{order.vendor_name}</span>
          </h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-4 items-start">
                <div className="w-16 h-16 shrink-0 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <span className="text-2xl font-bold text-emerald-600/60">
                    {item.title_snapshot.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.title_snapshot}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    ${item.unit_price} × {item.quantity}
                  </p>
                </div>
                <div className="text-right font-semibold text-gray-900">
                  ${item.line_total}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${order.subtotal}</span>
            </div>
            {shippingSet ? (
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Shipping <span className="text-xs text-gray-400">(pay courier on delivery)</span>
                </span>
                <span>${shippingFee}</span>
              </div>
            ) : (
              <div className="flex justify-between text-amber-700">
                <span>Shipping</span>
                <span className="italic">Awaiting vendor quote</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t font-semibold text-base">
              <span>Total paid online</span>
              <span>${order.grand_total} {order.currency_code}</span>
            </div>
          </div>
        </section>

        {/* Awaiting shipping quote notice */}
        {order.status === 'pending_shipping_quote' && (
          <section className="mt-6 bg-amber-50 border border-amber-300 rounded-xl p-5">
            <p className="font-semibold text-amber-900">
              ⏳ Awaiting shipping fee from vendor
            </p>
            <p className="text-sm text-amber-800 mt-1">
              We&apos;ve sent your address to <strong>{order.vendor_name}</strong> so
              they can calculate the shipping cost based on your location.
              You&apos;ll be able to pay the moment they confirm the fee.
            </p>
          </section>
        )}

        {/* Delivery address */}
        <section className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Delivery address</h2>
          <div className="text-sm text-gray-700 space-y-0.5">
            <p className="font-medium text-gray-900">{order.recipient_name}</p>
            <p>{order.shipping_phone}</p>
            <p>{order.line1}{order.line2 ? `, ${order.line2}` : ''}</p>
            <p>{order.city}{order.county ? `, ${order.county}` : ''}, {order.country}</p>
          </div>
          {order.buyer_note && (
            <div className="mt-4 pt-4 border-t text-sm">
              <p className="font-medium text-gray-900">Order note</p>
              <p className="text-gray-700 mt-1">{order.buyer_note}</p>
            </div>
          )}
        </section>

        {/* Payment */}
        <section className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Payment</h2>

          {order.payments.length > 0 && (
            <div className="space-y-4">
              {order.payments.map((p) => (
                <div key={p.id} className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method</span>
                    <span className="uppercase font-medium">{p.provider}</span>
                  </div>
                  {p.provider_reference && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference</span>
                      <span className="font-mono text-xs">{p.provider_reference}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status</span>
                    <span className="font-medium">{p.status}</span>
                  </div>
                  {p.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid at</span>
                      <span>{new Date(p.paid_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {order.status === 'pending_payment' && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="font-semibold text-amber-900">
                Product payment pending — {order.currency_code} {order.grand_total} due
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Send the amount to one of our accounts below. The shipping fee
                {shippingSet ? ` ($${shippingFee})` : ''} will be paid in cash to
                the courier on delivery.
              </p>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                  <div>
                    <p className="text-xs text-gray-500">Orange Money</p>
                    <p className="font-mono font-medium text-gray-900">
                      {PAYMENT_INFO.orangeMoney}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(PAYMENT_INFO.orangeMoney, 'om')}
                    className="text-xs px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
                  >
                    {copied === 'om' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white rounded px-3 py-2">
                  <div>
                    <p className="text-xs text-gray-500">Lonestar MoMo</p>
                    <p className="font-mono font-medium text-gray-900">
                      {PAYMENT_INFO.momo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(PAYMENT_INFO.momo, 'mom')}
                    className="text-xs px-3 py-1 rounded bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
                  >
                    {copied === 'mom' ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white rounded px-3 py-2 border border-amber-300">
                  <div>
                    <p className="text-xs text-gray-500">Reference (required)</p>
                    <p className="font-mono font-bold text-amber-800">
                      {order.order_number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(order.order_number, 'ref')}
                    className="text-xs px-3 py-1 rounded bg-amber-200 text-amber-900 font-medium hover:bg-amber-300"
                  >
                    {copied === 'ref' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-amber-700 mt-3">
                After sending payment, keep this page as a record. Our team
                verifies payments within a few hours and will mark your order
                as paid.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3 items-center">
            {order.status === 'shipped' && (
              <button
                onClick={confirmDelivery}
                disabled={confirming}
                className="px-6 py-2 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
              >
                {confirming ? 'Confirming…' : 'Confirm delivery received'}
              </button>
            )}

            {order.status === 'paid' && (
              <p className="text-sm text-gray-600">
                ✓ Payment confirmed. Waiting for vendor to ship.
              </p>
            )}

            {order.status === 'delivered' && (
              <p className="text-sm text-emerald-700 font-medium">
                ✓ Delivered{' '}
                {order.delivered_at &&
                  new Date(order.delivered_at).toLocaleDateString()}
              </p>
            )}

            {canCancel && (
              <button
                onClick={cancelOrder}
                disabled={cancelling}
                className="px-6 py-2 rounded-lg border border-red-300 text-red-700 font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {cancelling ? 'Cancelling…' : 'Cancel order'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}