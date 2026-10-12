// src/app/checkout/success/page.tsx
'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getToken } from '@/lib/auth';

// 🔧 CHANGE THESE to your real Orange Money / MoMo numbers
const PAYMENT_CONFIG = {
  orangeMoneyNumber: '+231 776315270',
  momoNumber:        '+231 886 993491',
  supportPhone:      '+231 88 067 6703',
  whatsAppNumber:    '+231 88 067 6703',
};

type Order = {
  id: number;
  order_number: string;
  status: string;
  currency_code: string;
  subtotal: string;
  shipping_total: string;
  grand_total: string;
  vendor_name: string;
};

function SuccessContent() {
  const params = useSearchParams();
  const router = useRouter();

  const orderId = params.get('order_id') || '';
  const fallbackNumber = params.get('order_number') || '';
  const fallbackTotal = params.get('total') || '';
  const fallbackCurrency = params.get('currency') || 'USD';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    async function load() {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }
      if (!orderId) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiGet<{ order: Order }>(`/orders/${orderId}`, token);
        setOrder(data.order);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load order');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId, router]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const orderNumber = order?.order_number || fallbackNumber;
  const currency = order?.currency_code || fallbackCurrency;
  const total = order ? order.grand_total : fallbackTotal;
  const status = order?.status || 'pending_payment';
  const shippingTotal = order?.shipping_total ? Number(order.shipping_total) : 0;

  const awaitingQuote = status === 'pending_shipping_quote';
  const isPayable = status === 'pending_payment';
  const isPast = ['paid', 'shipped', 'delivered'].includes(status);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading order…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Top confirmation */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Order placed!</h1>
          <p className="mt-3 text-gray-600">
            Order <span className="font-medium text-gray-900">{orderNumber}</span>{' '}
            {awaitingQuote
              ? 'has been received. The vendor is calculating your shipping fee.'
              : isPayable
              ? 'has been received. Complete payment to have it shipped.'
              : 'has been received.'}
          </p>
        </div>

        {loadError && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {loadError}
          </div>
        )}

        {/* AWAITING SHIPPING QUOTE — no payment instructions yet */}
        {awaitingQuote && (
          <>
            <div className="mt-8 bg-amber-50 border border-amber-300 rounded-xl p-5">
              <p className="font-semibold text-amber-900">
                ⏳ Awaiting shipping fee from vendor
              </p>
              <p className="text-sm text-amber-800 mt-1">
                We&apos;ve sent your delivery address to the vendor so they can
                calculate the shipping cost for your location. You&apos;ll be
                able to pay the moment they confirm the fee — usually within a
                few hours.
              </p>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                Product payment (available once fee is set)
              </p>
              <p className="mt-1 text-4xl font-bold text-emerald-700">
                ${total}{' '}
                <span className="text-lg text-gray-500 font-normal">{currency}</span>
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Shipping will be added separately and paid in cash to the
                courier on delivery. We never add shipping to this online
                amount.
              </p>
            </div>
          </>
        )}

        {/* PAYABLE — the normal payment instructions */}
        {isPayable && (
          <>
            <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">Amount due</p>
              <p className="mt-1 text-4xl font-bold text-emerald-700">
                ${total}{' '}
                <span className="text-lg text-gray-500 font-normal">{currency}</span>
              </p>
              {shippingTotal > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  + ${shippingTotal.toFixed(2)} shipping — paid in cash to the
                  courier on delivery.
                </p>
              )}
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900">How to pay</h2>
              <ol className="mt-4 space-y-4 text-sm text-gray-700">

                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Open your money app</p>
                    <p className="text-gray-500">Orange Money or Lonestar Cell MTN MoMo</p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Send ${total} to:</p>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs text-gray-500">Orange Money</p>
                          <p className="font-mono font-medium text-gray-900">
                            {PAYMENT_CONFIG.orangeMoneyNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(PAYMENT_CONFIG.orangeMoneyNumber, 'om')}
                          className="text-xs px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
                        >
                          {copied === 'om' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <p className="text-xs text-gray-500">Lonestar MoMo</p>
                          <p className="font-mono font-medium text-gray-900">
                            {PAYMENT_CONFIG.momoNumber}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copy(PAYMENT_CONFIG.momoNumber, 'mom')}
                          className="text-xs px-3 py-1 rounded-md bg-emerald-100 text-emerald-800 font-medium hover:bg-emerald-200"
                        >
                          {copied === 'mom' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    3
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Use this reference (important!)</p>
                    <div className="mt-2 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                      <p className="font-mono font-bold text-amber-800">{orderNumber}</p>
                      <button
                        type="button"
                        onClick={() => copy(orderNumber, 'ref')}
                        className="text-xs px-3 py-1 rounded-md bg-amber-200 text-amber-900 font-medium hover:bg-amber-300"
                      >
                        {copied === 'ref' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      This helps us identify your payment quickly.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center">
                    4
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">We verify and ship</p>
                    <p className="text-gray-500">
                      Our team verifies your payment within a few hours and
                      notifies the vendor to ship your order.
                    </p>
                  </div>
                </li>

              </ol>
            </div>

            {!claimed ? (
              <button
                type="button"
                onClick={() => setClaimed(true)}
                className="mt-6 w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
              >
                I&apos;ve made the payment
              </button>
            ) : (
              <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-sm text-center">
                ✓ Thank you! We&apos;ll verify your payment and update your order shortly.
              </div>
            )}
          </>
        )}

        {/* PAID / SHIPPED / DELIVERED */}
        {isPast && (
          <div className="mt-8 bg-emerald-50 border border-emerald-200 text-emerald-800 p-5 rounded-xl">
            <p className="font-semibold">✓ Payment received</p>
            <p className="text-sm mt-1">
              We&apos;ve verified your payment and notified the vendor. Check
              your order page for shipping updates.
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6 text-left">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Order number</span>
            <span className="font-medium">{orderNumber}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Product total</span>
            <span className="font-medium">
              ${total} {currency}
            </span>
          </div>
          {shippingTotal > 0 && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Shipping (COD)</span>
              <span className="font-medium">${shippingTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className="text-amber-600 font-medium">
              {awaitingQuote
                ? 'Awaiting vendor quote'
                : isPayable
                ? 'Awaiting payment'
                : status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/orders/${orderId}`}
            className="px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors text-center"
          >
            View order
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-center"
          >
            Continue shopping
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-500 text-center">
          Questions? Contact us at {PAYMENT_CONFIG.supportPhone}
        </p>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Loading…</p>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}