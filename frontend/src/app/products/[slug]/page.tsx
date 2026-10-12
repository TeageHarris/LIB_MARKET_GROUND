// src/app/products/[slug]/page.tsx
import Link from 'next/link';
import { apiGet, API_BASE } from '@/lib/api';
import AddToCartButton from '@/components/AddToCartButton';

type ProductImage = {
  id: number;
  url: string;
  alt_text: string | null;
  is_primary: number;
};

type Product = {
  id: number;
  title: string;
  slug: string;
  description: string;
  brand: string | null;
  condition_type: string;
  base_price: string;
  currency_code: string;
  weight_grams: number | null;
  is_handmade: number;
  origin_country: string;
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  vendor_county: string | null;
  category_name: string | null;
  stock: number;
  images: ProductImage[];
  primary_image: string | null;
};

type ProductResponse = { product: Product };

// Build the full URL for an image
function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let product: Product | null = null;
  let error: string | null = null;

  try {
    const data = await apiGet<ProductResponse>(`/products/${slug}`);
    product = data.product;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load product';
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Product not available</h1>
          <p className="mt-2 text-gray-500">{error || 'This product may have been removed'}</p>
          <Link href="/" className="mt-6 inline-block text-emerald-700 font-medium hover:underline">
            ← Back to products
          </Link>
        </div>
      </main>
    );
  }

  // Pick the primary image — try primary_image field first, then fall back to the images array
  const mainImageUrl =
    imageUrl(product.primary_image) ||
    imageUrl(
      product.images.find((img) => img.is_primary === 1)?.url ||
        product.images[0]?.url ||
        null
    );

  // For the thumbnail strip (all images except the main one)
  const thumbnails = product.images.filter(
    (img) => imageUrl(img.url) !== mainImageUrl
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to products
        </Link>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: image + thumbnails */}
          <div>
            <div className="aspect-square bg-linear-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center overflow-hidden">
              {mainImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={mainImageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[180px] font-bold text-emerald-600/40">
                  {product.title.charAt(0)}
                </span>
              )}
            </div>

            {/* Thumbnail strip — only show if there's more than one image */}
            {thumbnails.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {thumbnails.map((img) => {
                  const url = imageUrl(img.url);
                  if (!url) return null;
                  return (
                    <div
                      key={img.id}
                      className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={img.alt_text || product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: details */}
          <div>
            <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">
              {product.vendor_name}
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold text-gray-900">
              {product.title}
            </h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">
                ${product.base_price}
              </span>
              <span className="text-sm text-gray-500">{product.currency_code}</span>
            </div>

            <div className="mt-6 space-y-2 text-sm text-gray-600">
              {product.category_name && (
                <p>
                  <span className="font-medium text-gray-900">Category:</span>{' '}
                  {product.category_name}
                </p>
              )}
              {product.vendor_county && (
                <p>
                  <span className="font-medium text-gray-900">Ships from:</span>{' '}
                  {product.vendor_county}, Liberia
                </p>
              )}
              {product.weight_grams && (
                <p>
                  <span className="font-medium text-gray-900">Weight:</span>{' '}
                  {product.weight_grams} g
                </p>
              )}
              {product.is_handmade ? (
                <p className="text-emerald-700 font-medium">✦ Handmade in Liberia</p>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            <div className="mt-8 border-t pt-6">
              <div className="flex items-center gap-3">
                {product.stock > 0 ? (
                  <span className="text-sm text-emerald-700 font-medium">
                    ✓ In stock ({product.stock} available)
                  </span>
                ) : (
                  <span className="text-sm text-red-600 font-medium">Out of stock</span>
                )}
              </div>

              <div className="mt-4">
                <AddToCartButton productId={product.id} stock={product.stock} />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Login required to place an order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}