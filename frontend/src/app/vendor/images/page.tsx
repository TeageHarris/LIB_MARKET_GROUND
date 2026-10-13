// src/app/vendor/images/page.tsx
'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiGet, apiDelete, API_BASE } from '@/lib/api';
import { getToken, getUser } from '@/lib/auth';

type ProductImage = {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
};

type Product = {
  id: number;
  title: string;
  slug: string;
  status: string;
  images: ProductImage[];
};

const MAX_IMAGES = 10;

function ImagesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId') || '';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
    if (!productId) {
      setError('No product selected. Go back to My Products and click "Images".');
      setLoading(false);
      return;
    }
    try {
      const detail = await apiGet<{ product: Product }>(
        `/vendors/me/products/${productId}`,
        token
      );
      setProduct(detail.product);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [productId]);

  const uploadSingle = useCallback(
    async (file: File, currentProductId: number): Promise<void> => {
      if (!file.type.startsWith('image/')) {
        throw new Error(`${file.name} is not an image`);
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(`${file.name} is over 10 MB`);
      }

      const token = getToken();
      if (!token) throw new Error('Not logged in');

      const formData = new FormData();
      formData.append('image', file);
      formData.append('alt_text', file.name);

      const res = await fetch(`${API_BASE}/products/${currentProductId}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Upload failed (${res.status})`);
      }
    },
    []
  );

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const fileList = input.files;
    if (!fileList || fileList.length === 0) return;

    const files: File[] = Array.from(fileList);
    input.value = '';

    if (!product) return;

    const remaining = MAX_IMAGES - product.images.length;
    if (files.length > remaining) {
      setError(`Only ${remaining} more image${remaining !== 1 ? 's' : ''} allowed (max ${MAX_IMAGES}).`);
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    let ok = 0;
    let failed = 0;

    for (let i = 0; i < files.length; i++) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      try {
        await uploadSingle(files[i], product.id);
        ok++;
      } catch (err) {
        failed++;
        console.error(`File ${i + 1} (${files[i].name}) failed:`, err);
      }
    }

    setProgress(null);
    setUploading(false);
    await load();

    if (ok > 0 && failed === 0) {
      setSuccessMsg(`${ok} image${ok !== 1 ? 's' : ''} added ✓`);
    } else if (ok > 0 && failed > 0) {
      setSuccessMsg(`${ok} added, ${failed} failed`);
    } else {
      setError(`All ${failed} upload${failed !== 1 ? 's' : ''} failed. Check console for details.`);
    }

    setTimeout(() => setSuccessMsg(null), 3000);
  }

  async function deleteImage(imageId: number) {
    if (!confirm('Remove this image?')) return;
    const token = getToken();
    if (!token || !product) return;
    setError(null);
    try {
      await apiDelete(`/products/${product.id}/images/${imageId}`, token);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove image');
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-gray-500">Loading…</p>
        </div>
      </main>
    );
  }

  if (error && !product) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900">{error}</h1>
          <Link href="/vendor/products" className="mt-6 inline-block text-emerald-700 font-medium hover:underline">
            ← Back to my products
          </Link>
        </div>
      </main>
    );
  }

  if (!product) return null;

  const imageCount = product.images.length;
  const canUploadMore = imageCount < MAX_IMAGES;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href="/vendor/products" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to my products
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold text-gray-900">Manage Images</h1>
          <p className="text-sm text-gray-500 mt-1">
            For product: <span className="font-medium text-gray-900">{product.title}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">{imageCount} / {MAX_IMAGES} images</p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>
        )}
        {successMsg && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm">{successMsg}</div>
        )}
        {progress && (
          <div className="mt-6 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-sm">
            {progress}
          </div>
        )}

        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Add images</h2>

          {canUploadMore ? (
            <label
              className={`inline-block px-6 py-3 rounded-lg font-semibold transition-colors ${
                uploading
                  ? 'bg-gray-400 cursor-wait text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              }`}
            >
              {uploading ? 'Uploading…' : '+ Upload images'}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInput}
                disabled={uploading}
                className="hidden"
              />
            </label>
          ) : (
            <p className="text-sm text-gray-500">Maximum {MAX_IMAGES} images reached.</p>
          )}

          <p className="mt-3 text-xs text-gray-500">
            JPG, PNG, WEBP, or GIF. Max 10 MB each. Up to {MAX_IMAGES - imageCount} more.
          </p>
        </div>

        {product.images.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Current images</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {product.images.map((img) => (
                <div key={img.id} className="relative">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`}
                      alt={img.alt_text || product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {img.is_primary ? (
                    <span className="absolute top-2 left-2 bg-emerald-700 text-white text-xs px-2 py-0.5 rounded-full font-medium">Primary</span>
                  ) : null}
                  <div className="mt-2 flex justify-end text-xs">
                    <button onClick={() => deleteImage(img.id)} className="text-red-600 hover:underline font-medium">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Loading…</p></main>}>
      <ImagesPageInner />
    </Suspense>
  );
}