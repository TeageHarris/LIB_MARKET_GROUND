// src/app/vendor/products/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type Category = {
  id: number;
  name: string;
  slug: string;
  product_count: number;
};

type CategoriesResponse = { count: number; categories: Category[] };

type CreateResponse = {
  message: string;
  product: {
    id: number;
    title: string;
    slug: string;
    status: string;
  };
};

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    base_price: '',
    shipping_fee: '',
    category_id: '',
    brand: '',
    condition_type: 'new',
    weight_grams: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    is_handmade: false,
    is_digital: false,
    initial_stock: '1',
    publish_now: false,
  });

  useEffect(() => {
    const token = getToken();
    const me = getUser();
    if (!token) {
      router.push('/login');
      return;
    }
    if (!me || (me.role !== 'vendor_owner' && me.role !== 'admin')) {
      router.push('/');
      return;
    }
    (async () => {
      try {
        const data = await apiGet<CategoriesResponse>('/categories');
        setCategories(data.categories);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function update<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    const price = parseFloat(form.base_price);
    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number');
      return;
    }

    const token = getToken();
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        base_price: price,
        condition_type: form.condition_type,
        is_handmade: form.is_handmade,
        is_digital: form.is_digital,
        initial_stock: parseInt(form.initial_stock, 10) || 0,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.brand.trim()) payload.brand = form.brand.trim();
      if (form.category_id) payload.category_id = Number(form.category_id);
      if (form.weight_grams) payload.weight_grams = Number(form.weight_grams);
      if (form.length_cm) payload.length_cm = Number(form.length_cm);
      if (form.width_cm) payload.width_cm = Number(form.width_cm);
      if (form.height_cm) payload.height_cm = Number(form.height_cm);
      if (form.shipping_fee.trim()) {
        const fee = parseFloat(form.shipping_fee);
        if (!isNaN(fee) && fee >= 0) {
          payload.shipping_fee_usd = fee;
        }
      }

      const res = await apiPost<CreateResponse>('/products', payload, token);

      if (form.publish_now) {
        await apiPost(
          `/products/${res.product.id}`,
          { status: 'active' },
          token
        ).catch(() => {});
      }

      router.push('/vendor/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create product');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/vendor/products" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to my products
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Add a new product</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details. You can save as draft and publish later.
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Section: Basics */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Basics
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  required
                  maxLength={200}
                  placeholder="e.g. Handwoven Country Cloth"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  rows={4}
                  placeholder="Describe your product — materials, origin, what makes it special…"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.base_price}
                    onChange={(e) => update('base_price', e.target.value)}
                    required
                    placeholder="45.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.initial_stock}
                    onChange={(e) => update('initial_stock', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) => update('category_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    <option value="">— Select a category —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={form.condition_type}
                    onChange={(e) => update('condition_type', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand (optional)
                </label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => update('brand', e.target.value)}
                  placeholder="e.g. Kpelle Handmade"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Shipping fee */}
          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Shipping fee
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping fee (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.shipping_fee}
                onChange={(e) => update('shipping_fee', e.target.value)}
                placeholder="Leave blank to use your vendor default"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                This is what the buyer pays the courier on delivery. Leave blank to use
                your default shipping fee. Set a custom value for heavy, bulky, or
                specially-packaged items.
              </p>
            </div>
          </div>

          {/* Section: Shipping details */}
          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Shipping dimensions (optional)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (g)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.weight_grams}
                  onChange={(e) => update('weight_grams', e.target.value)}
                  placeholder="800"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.length_cm}
                  onChange={(e) => update('length_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.width_cm}
                  onChange={(e) => update('width_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.height_cm}
                  onChange={(e) => update('height_cm', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Attributes */}
          <div className="border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Attributes
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_handmade}
                  onChange={(e) => update('is_handmade', e.target.checked)}
                  className="w-4 h-4 accent-emerald-700"
                />
                <span className="text-sm text-gray-700">
                  Handmade in Liberia (badge shown to buyers)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_digital}
                  onChange={(e) => update('is_digital', e.target.checked)}
                  className="w-4 h-4 accent-emerald-700"
                />
                <span className="text-sm text-gray-700">
                  Digital product (no shipping required)
                </span>
              </label>
            </div>
          </div>

          {/* Section: Publish */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.publish_now}
                onChange={(e) => update('publish_now', e.target.checked)}
                className="w-4 h-4 accent-emerald-700"
              />
              <span className="text-sm text-gray-700">
                <strong>Publish immediately</strong> — show on the marketplace right away.
                If unchecked, saved as draft.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="border-t pt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:bg-gray-400 transition-colors"
            >
              {saving
                ? 'Saving…'
                : form.publish_now
                ? 'Save and publish'
                : 'Save as draft'}
            </button>
            <Link
              href="/vendor/products"
              className="px-6 py-3 rounded-lg text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}