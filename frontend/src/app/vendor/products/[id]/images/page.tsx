// src/app/vendor/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPatch, apiDelete } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type ProductRow = {
  id: number;
  title: string;
  slug: string;
  status: string;
  base_price: string;
  currency_code: string;
  view_count: number;
  published_at: string | null;
  created_at: string;
  category_name: string | null;
  stock: number;
  primary_image: string | null;
};

type Response = { count: number; products: ProductRow[] };

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  active: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-red-100 text-red-700',
};

export default function VendorProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const data = await apiGet<Response>('/vendors/me/products', token);
      setProducts(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(p: ProductRow) {
    const token = getToken();
    if (!token) return;
    setBusyId(p.id);
    setError(null);
    try {
      const newStatus = p.status === 'active' ? 'draft' : 'active';
      await apiPatch(`/products/${p.id}`, { status: newStatus }, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setBusyId(null);
    }
  }

  async function archiveProduct(p: ProductRow) {
    if (!confirm(`Archive "${p.title}"? It will be hidden from buyers.`)) return;
    const token = getToken();
    if (!token) return;
    setBusyId(p.id);
    setError(null);
    try {
      await apiDelete(`/products/${p.id}`, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading products…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <Link href="/vendor" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to dashboard
        </Link>

        <div className="mt-4 flex items-baseline justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-sm text-gray-500 mt-1">
              {products.length} product{products.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/vendor/products/new"
            className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors"
          >
            + Add product
          </Link>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {products.length === 0 ? (
          <div className="mt-8 bg-white rounded-xl shadow-sm p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900">No products yet</h2>
            <p className="mt-2 text-gray-500">
              Add your first product to start selling on LIB_MARKET_GROUND.
            </p>
            <Link
              href="/vendor/products/new"
              className="mt-6 inline-block px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
            >
              Add first product
            </Link>
          </div>
        ) : (
          <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
            {products.map((p, i) => {
              const badge = STATUS_STYLES[p.status] || 'bg-gray-100 text-gray-700';
              const isActive = p.status === 'active';
              const imgSrc = p.primary_image
                ? (p.primary_image.startsWith('http')
                    ? p.primary_image
                    : `http://localhost:3000${p.primary_image}`)
                : null;
              return (
                <div
                  key={p.id}
                  className={`p-4 md:p-6 flex flex-wrap gap-4 items-center ${
                    i > 0 ? 'border-t' : ''
                  }`}
                >
                  <Link href={`/products/${p.slug}`} className="shrink-0">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 overflow-hidden flex items-center justify-center">
                      {imgSrc ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={imgSrc}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-emerald-600/60">
                          {p.title.charAt(0)}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-[200px]">
                    <Link
                      href={`/products/${p.slug}`}
                      className="font-semibold text-gray-900 hover:text-emerald-700"
                    >
                      {p.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.category_name || 'Uncategorized'}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap text-xs">
                      <span className={`px-2 py-0.5 rounded-full uppercase font-medium ${badge}`}>
                        {p.status}
                      </span>
                      <span className="text-gray-500">Stock: {p.stock}</span>
                      <span className="text-gray-500">Views: {p.view_count}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">${p.base_price}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/vendor/images?productId=${p.id}`}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                    >
                      Images
                    </Link>
                    <button
                      onClick={() => toggleStatus(p)}
                      disabled={busyId === p.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      } disabled:opacity-50`}
                    >
                      {isActive ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => archiveProduct(p)}
                      disabled={busyId === p.id || p.status === 'archived'}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Archive
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}