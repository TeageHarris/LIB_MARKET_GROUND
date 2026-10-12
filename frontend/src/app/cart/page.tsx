// src/app/cart/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { getToken } from '@/lib/auth';

type CartItem = {
  cart_item_id: number;
  quantity: number;
  unit_price_snapshot: string;
  added_at: string;
  product_id: number;
  title: string;
  slug: string;
  base_price: string;
  currency_code: string;
  product_status: string;
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  stock: number;
  primary_image: string | null;
};

type CartResponse = {
  cart_id: number;
  vendor_id: number | null;
  currency_code: string;
  item_count: number;
  subtotal: string;
  items: CartItem[];
};

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);

  async function loadCart() {
    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const data = await apiGet<CartResponse>('/cart', token);
      setCart(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, []);

  async function updateQuantity(itemId: number, newQty: number) {
    const token = getToken();
    if (!token) return;
    setBusyItemId(itemId);
    try {
      await apiPatch(`/cart/items/${itemId}`, { quantity: newQty }, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusyItemId(null);
    }
  }

  async function removeItem(itemId: number) {
    const token = getToken();
    if (!token) return;
    setBusyItemId(itemId);
    try {
      await apiDelete(`/cart/items/${itemId}`, token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove');
    } finally {
      setBusyItemId(null);
    }
  }

  async function clearCart() {
    const token = getToken();
    if (!token) return;
    if (!confirm('Clear your entire cart?')) return;
    setClearing(true);
    try {
      await apiDelete('/cart', token);
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear');
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading cart...</p>
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Your cart is empty</h1>
          <p className="mt-2 text-gray-600">Browse products and add them to your cart.</p>
          <Link href="/" className="mt-6 inline-block px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors">
            Browse products
          </Link>
        </div>
      </main>
    );
  }

  const vendorName = cart.items[0]?.vendor_name;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Cart</h1>
            {vendorName && (
              <p className="text-sm text-gray-500 mt-1">
                All items from <span className="font-medium text-emerald-700">{vendorName}</span>
              </p>
            )}
          </div>
          <button
            onClick={clearCart}
            disabled={clearing}
            className="text-sm text-red-600 hover:text-red-800 font-medium underline disabled:opacity-50"
          >
            {clearing ? 'Clearing...' : 'Clear cart'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {cart.items.map((item, i) => (
            <div key={item.cart_item_id} className={`p-4 md:p-6 flex gap-4 items-start ${i > 0 ? 'border-t' : ''}`}>
              <Link href={`/products/${item.slug}`} className="shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center">
                  <span className="text-3xl font-bold text-emerald-600/60">
                    {item.title.charAt(0)}
                  </span>
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.slug}`} className="font-semibold text-gray-900 hover:text-emerald-700">
                  {item.title}
                </Link>
                <p className="text-sm text-gray-500 mt-1">
                  ${item.unit_price_snapshot} each
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  In stock: {item.stock}
                </p>

                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.cart_item_id, Math.max(1, item.quantity - 1))}
                      disabled={busyItemId === item.cart_item_id || item.quantity <= 1}
                      className="px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <span className="px-3 py-1 text-sm font-medium min-w-[2.5rem] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                      disabled={busyItemId === item.cart_item_id || item.quantity >= item.stock}
                      className="px-3 py-1 text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item.cart_item_id)}
                    disabled={busyItemId === item.cart_item_id}
                    className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900">
                  ${(parseFloat(item.unit_price_snapshot) * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Items ({cart.item_count})</span>
            <span>${cart.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>Shipping</span>
            <span className="text-gray-400">Calculated at checkout</span>
          </div>
          <div className="border-t pt-4 flex justify-between items-baseline">
            <span className="font-semibold text-gray-900">Subtotal</span>
            <span className="text-2xl font-bold text-gray-900">${cart.subtotal} {cart.currency_code}</span>
          </div>

          <button
            onClick={() => router.push('/checkout')}
            className="mt-6 w-full py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
          >
            Proceed to checkout
          </button>

          <Link href="/" className="mt-3 block text-center text-sm text-gray-500 hover:text-gray-900">
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  );
}