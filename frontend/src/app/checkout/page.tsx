// src/app/checkout/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken } from '@/lib/auth';

type CartItem = {
  cart_item_id: number;
  quantity: number;
  unit_price_snapshot: string;
  title: string;
  slug: string;
  vendor_name: string;
};

type CartResponse = {
  cart_id: number;
  currency_code: string;
  item_count: number;
  subtotal: string;
  items: CartItem[];
};

type Address = {
  id: number;
  label: string;
  recipient_name: string;
  phone: string;
  country: string;
  county: string | null;
  city: string;
  line1: string;
  line2: string | null;
  postal_code: string | null;
  is_default: number;
};

type AddressListResponse = { count: number; addresses: Address[] };

type OrderResponse = {
  message: string;
  order_id: number;
  order_number: string;
  grand_total: string;
  currency: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buyerNote, setBuyerNote] = useState('');

  // New-address form state
  const [newAddress, setNewAddress] = useState({
    recipient_name: '',
    phone: '',
    county: '',
    city: '',
    line1: '',
    line2: '',
  });

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const [cartData, addrData] = await Promise.all([
        apiGet<CartResponse>('/cart', token),
        apiGet<AddressListResponse>('/addresses', token),
      ]);

      if (cartData.items.length === 0) {
        router.push('/cart');
        return;
      }

      setCart(cartData);
      setAddresses(addrData.addresses);

      const def = addrData.addresses.find((a) => a.is_default);
      if (def) {
        setSelectedAddressId(def.id);
      } else if (addrData.addresses.length > 0) {
        setSelectedAddressId(addrData.addresses[0].id);
      } else {
        setShowNewAddress(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checkout');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function createAddress(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setError(null);
    try {
      const res = await apiPost<{ message: string; address: Address }>(
        '/addresses',
        {
          ...newAddress,
          label: 'Home',
          is_default: addresses.length === 0,
        },
        token
      );
      setAddresses((prev) => [res.address, ...prev]);
      setSelectedAddressId(res.address.id);
      setShowNewAddress(false);
      setNewAddress({
        recipient_name: '',
        phone: '',
        county: '',
        city: '',
        line1: '',
        line2: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    }
  }

  async function placeOrder() {
    if (!selectedAddressId) {
      setError('Please select a delivery address');
      return;
    }
    const token = getToken();
    if (!token) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await apiPost<OrderResponse>(
        '/orders',
        { shipping_address_id: selectedAddressId, buyer_note: buyerNote || null },
        token
      );
      // Send to success page with order info
      router.push(
        `/checkout/success?order_id=${res.order_id}&order_number=${res.order_number}&total=${res.grand_total}&currency=${res.currency}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading checkout…</p>
        </div>
      </main>
    );
  }

  if (!cart) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        <p className="text-sm text-gray-500 mt-1">
          Order from <span className="text-emerald-700 font-medium">{cart.items[0]?.vendor_name}</span>
        </p>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Address + items */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Delivery Address
              </h2>

              {addresses.length > 0 && (
                <div className="space-y-3">
                  {addresses.map((a) => (
                    <label
                      key={a.id}
                      className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedAddressId === a.id
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === a.id}
                          onChange={() => setSelectedAddressId(a.id)}
                          className="mt-1 accent-emerald-700"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {a.recipient_name} · {a.phone}
                          </p>
                          <p className="text-gray-600 mt-0.5">
                            {a.line1}
                            {a.line2 ? `, ${a.line2}` : ''}
                          </p>
                          <p className="text-gray-600">
                            {a.city}
                            {a.county ? `, ${a.county}` : ''}, {a.country}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!showNewAddress && (
                <button
                  onClick={() => setShowNewAddress(true)}
                  className="mt-4 text-sm text-emerald-700 font-medium hover:underline"
                >
                  + Add a new address
                </button>
              )}

              {showNewAddress && (
                <form onSubmit={createAddress} className="mt-6 border-t pt-6 space-y-4">
                  <h3 className="font-medium text-gray-900">New address</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Recipient full name"
                      required
                      value={newAddress.recipient_name}
                      onChange={(e) => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="County (e.g. Montserrado)"
                      value={newAddress.county}
                      onChange={(e) => setNewAddress({ ...newAddress, county: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="City"
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Address line 1"
                      required
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Address line 2 (optional)"
                      value={newAddress.line2}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                      className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                    >
                      Save address
                    </button>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewAddress(false)}
                        className="px-5 py-2 rounded-lg text-gray-600 hover:text-gray-900"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </section>

            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your items</h2>
              <div className="space-y-3">
                {cart.items.map((it) => (
                  <div key={it.cart_item_id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {it.title} × {it.quantity}
                    </span>
                    <span className="text-gray-900 font-medium">
                      ${(parseFloat(it.unit_price_snapshot) * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order note (optional)
                </label>
                <textarea
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  rows={2}
                  placeholder="Delivery instructions, preferred time, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </section>
          </div>

          {/* RIGHT: Summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order summary</h2>

              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items ({cart.item_count})</span>
                  <span className="text-gray-900">${cart.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-gray-400">Free</span>
                </div>
              </div>

              <div className="border-t mt-4 pt-4 flex justify-between items-baseline">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${cart.subtotal}{' '}
                  <span className="text-sm text-gray-500">{cart.currency_code}</span>
                </span>
              </div>

              <button
                onClick={placeOrder}
                disabled={placing || !selectedAddressId}
                className="mt-6 w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {placing ? 'Placing order…' : 'Place order'}
              </button>

              <p className="mt-3 text-xs text-gray-500 text-center">
                Payment confirmation follows. Real mobile money integration coming soon.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}