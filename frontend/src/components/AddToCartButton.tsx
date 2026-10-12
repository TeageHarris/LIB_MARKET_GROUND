// src/components/AddToCartButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function AddToCartButton({
  productId,
  stock,
}: {
  productId: number;
  stock: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    setMessage(null);
    setError(null);

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/cart/items', { product_id: productId, quantity: 1 }, token);
      setMessage('Added to cart ✓');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setLoading(false);
    }
  }

  if (stock === 0) {
    return (
      <button
        disabled
        className="w-full md:w-auto px-8 py-3 rounded-lg bg-gray-300 text-gray-500 font-semibold cursor-not-allowed"
      >
        Unavailable
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleAdd}
        disabled={loading}
        className="w-full md:w-auto px-8 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
      >
        {loading ? 'Adding...' : 'Add to Cart'}
      </button>

      {message && (
        <p className="mt-3 text-sm text-emerald-700 font-medium">{message}</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}