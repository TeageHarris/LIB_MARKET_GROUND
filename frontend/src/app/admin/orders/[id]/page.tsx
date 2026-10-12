// src/app/admin/orders/[id]/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

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
  amount_usd: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type Refund = {
  id: number;
  order_id: number;
  vendor_id: number;
  amount: string;
  fee: string;
  currency_code: string;
  reason: string;
  note: string | null;
  created_by: number | null;
  created_by_name: string | null;
  created_at: string;
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
  grand_total_usd: string;
  placed_at: string;
  delivered_at: string | null;
  cancelled_at: string | null;
  buyer_note: string | null;

  buyer_id: number;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;

  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  vendor_email: string;
  vendor_phone: string;

  addr_label: string | null;
  addr_recipient: string | null;
  addr_phone: string | null;
  addr_country: string | null;
  addr_county: string | null;
  addr_city: string | null;
  addr_line1: string | null;
  addr_line2: string | null;
  addr_postal_code: string | null;

  items: OrderItem[];
  payments: Payment[];
  refunds: Refund[];
};

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [refunding, setRefunding] = useState(false);

  async function reload() {
    const token = getToken();
    if (!token || !id) return;
    const data = await apiGet<{ order: Order }>(`/admin/orders/${id}`, token);
    setOrder(data.order);
  }

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token || !me) { router.push('/login'); return; }
    if (me.role !== 'admin') { router.push('/'); return; }
    if (!id) return;

    (async () => {
      try {
        const data = await apiGet<{ order: Order }>(`/admin/orders/${id}`, token);
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function handleMarkPaid() {
    if (!order) return;
    const confirmed = window.confirm(
      `Mark ${order.order_number} as PAID?\n\n` +
      `Only do this after you've verified the buyer's payment in your Orange Money / MoMo account.`
    );
    if (!confirmed) return;

    const reference = window.prompt(
      'Optional: enter the transaction ID / reference from your money app'
    ) || undefined;

    setActing(true);
    try {
      const token = getToken() || undefined;
      await apiPost(`/admin/orders/${order.id}/mark-paid`, { reference }, token);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as paid');
    } finally {
      setActing(false);
    }
  }

  async function handleRefund() {
    if (!order) return;

    const maxAmount = Number(order.grand_total_usd);
    const amountStr = window.prompt(
      `Refund ${order.order_number}\n\n` +
      `Order total: $${maxAmount.toFixed(2)}\n\n` +
      `How much should the buyer be refunded?`,
      maxAmount.toFixed(2)
    );
    if (amountStr === null) return;

    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Invalid refund amount');
      return;
    }
    if (amount > maxAmount) {
      alert(`Refund cannot exceed order total ($${maxAmount.toFixed(2)})`);
      return;
    }

    const isFailedDelivery = window.confirm(
      'Was this a FAILED DELIVERY (buyer refused to accept)?\n\n' +
      'OK = yes, deduct a $2 failed-delivery fee\n' +
      'Cancel = no, standard refund'
    );
    const fee = isFailedDelivery ? 2 : 0;
    const netRefund = Math.max(amount - fee, 0);

    const reason = window.prompt(
      'Reason for refund (required, will be saved on the order):'
    );
    if (!reason) return;

    const note = window.prompt('Optional internal note:') || undefined;

    const confirmed = window.confirm(
      `Confirm refund:\n\n` +
      `  Buyer receives: $${netRefund.toFixed(2)}\n` +
      `  Failed-delivery fee: $${fee.toFixed(2)}\n` +
      `  Total refunded from order: $${amount.toFixed(2)}\n\n` +
      `Order will be marked REFUNDED. This cannot be undone.`
    );
    if (!confirmed) return;

    setRefunding(true);
    try {
      const token = getToken() || undefined;
      await apiPost(
        `/admin/orders/${order.id}/refund`,
        { amount: netRefund, fee, reason, note },
        token
      );
      await reload();
      alert('✓ Refund recorded');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Refund failed');
    } finally {
      setRefunding(false);
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

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error || 'Order not found'}
          </div>
          <Link href="/admin/orders" className="mt-4 inline-block text-emerald-700 hover:underline">
            ← Back to orders
          </Link>
        </div>
      </main>
    );
  }

  const commission = order.items.reduce(
    (sum, it) => sum + Number(it.commission_amount), 0
  );

  const canRefund = ['paid', 'shipped', 'delivered'].includes(order.status);

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/admin/orders" className="text-sm text-emerald-700 hover:underline">
          ← Back to orders
        </Link>

        <div className="mt-4 flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 font-mono">
              {order.order_number}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Placed {new Date(order.placed_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {order.status.replace('_', ' ')}
            </span>
            {order.status === 'pending_payment' && (
              <button
                type="button"
                onClick={handleMarkPaid}
                disabled={acting}
                className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:bg-gray-400"
              >
                {acting ? 'Marking…' : '✓ Mark as Paid'}
              </button>
            )}
            {canRefund && (
              <button
                type="button"
                onClick={handleRefund}
                disabled={refunding}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400"
              >
                {refunding ? 'Refunding…' : '💸 Refund'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Buyer</h2>
            <p className="mt-2 font-medium text-gray-900">{order.buyer_name}</p>
            <p className="text-sm text-gray-600">{order.buyer_email}</p>
            <p className="text-sm text-gray-600">{order.buyer_phone}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Vendor</h2>
            <p className="mt-2 font-medium text-gray-900">{order.vendor_name}</p>
            <p className="text-sm text-gray-600">{order.vendor_email}</p>
            <p className="text-sm text-gray-600">{order.vendor_phone}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 md:col-span-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Shipping address</h2>
            {order.addr_recipient ? (
              <div className="mt-2 text-sm text-gray-700">
                <p className="font-medium">{order.addr_recipient}</p>
                <p>{order.addr_phone}</p>
                <p>{order.addr_line1}{order.addr_line2 ? `, ${order.addr_line2}` : ''}</p>
                <p>
                  {order.addr_city}{order.addr_county ? `, ${order.addr_county}` : ''} — {order.addr_country}
                </p>
                {order.addr_postal_code && <p>{order.addr_postal_code}</p>}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">No address on file</p>
            )}
          </div>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">Items</h2>
          <div className="mt-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Line total</th>
                  <th className="px-4 py-3">Commission</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-900">{it.title_snapshot}</td>
                    <td className="px-4 py-3 text-gray-700">{it.quantity}</td>
                    <td className="px-4 py-3 text-gray-700">${Number(it.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      ${Number(it.line_total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      ${Number(it.commission_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900">Totals</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Subtotal</dt>
              <dd className="text-gray-900">${Number(order.subtotal).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Shipping</dt>
              <dd className="text-gray-900">${Number(order.shipping_total).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Tax</dt>
              <dd className="text-gray-900">${Number(order.tax_total).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <dt className="text-gray-900">Grand total ({order.currency_code})</dt>
              <dd className="text-gray-900">${Number(order.grand_total).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <dt>Equivalent USD</dt>
              <dd>${Number(order.grand_total_usd).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between text-xs text-emerald-700 border-t pt-2 mt-2">
              <dt>Platform commission</dt>
              <dd>${commission.toFixed(2)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Payments</h2>
          {order.payments.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No payment records.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {order.payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900 uppercase text-xs tracking-wide">
                      {p.provider.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {p.provider_reference || '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">${Number(p.amount).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {order.refunds && order.refunds.length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-semibold text-red-700">Refunds</h2>
            <div className="mt-3 space-y-2">
              {order.refunds.map((r) => (
                <div key={r.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <p className="font-semibold text-red-900">
                        Refunded ${Number(r.amount).toFixed(2)} {r.currency_code}
                      </p>
                      <p className="text-xs text-red-700 mt-0.5">
                        {new Date(r.created_at).toLocaleString()}
                        {r.created_by_name ? ` · by ${r.created_by_name}` : ''}
                      </p>
                    </div>
                    {Number(r.fee) > 0 && (
                      <span className="text-xs bg-red-200 text-red-900 font-medium px-2 py-1 rounded">
                        Failed-delivery fee: ${Number(r.fee).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-red-800 mt-2">
                    <strong>Reason:</strong> {r.reason}
                  </p>
                  {r.note && (
                    <p className="text-xs text-red-700 mt-1">
                      <strong>Note:</strong> {r.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {order.buyer_note && (
          <section className="mt-6 bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Buyer note
            </h2>
            <p className="mt-2 text-sm text-gray-700">{order.buyer_note}</p>
          </section>
        )}
      </div>
    </main>
  );
}