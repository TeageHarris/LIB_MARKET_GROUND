// src/app/page.tsx
import Link from 'next/link';
import { apiGet, API_BASE } from '@/lib/api';

type Product = {
  id: number;
  title: string;
  slug: string;
  description: string;
  base_price: string;
  currency_code: string;
  vendor_name: string;
  category_name: string;
  stock: number;
  primary_image: string | null;
  is_handmade: number;
  origin_country: string;
};

type ProductsResponse = {
  count: number;
  products: Product[];
};

function imageUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path}`;
}

export default async function Home() {
  let products: Product[] = [];
  let error: string | null = null;

  try {
    const data = await apiGet<ProductsResponse>('/products');
    products = data.products;
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load products';
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Products</h2>
          <span className="text-sm text-gray-500">
            {products.length} available
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            <strong>Could not load products.</strong> {error}
          </div>
        )}

        {!error && products.length === 0 && (
          <p className="text-gray-500">No products yet.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((p) => {
            const img = imageUrl(p.primary_image);
            return (
              <Link
                key={p.id}
                href={`/products/${p.slug}`}
                className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center overflow-hidden">
                  {img ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={img}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-5xl font-bold text-emerald-600/60">
                      {p.title.charAt(0)}
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs text-emerald-700 font-medium uppercase tracking-wide">
                    {p.vendor_name}
                  </p>
                  <h3 className="mt-1 font-semibold text-gray-900 truncate">
                    {p.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {p.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      ${p.base_price}
                    </span>
                    <span className="text-xs text-gray-400">
                      {p.category_name}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="text-center text-sm text-gray-400 py-10">
        © 2026 LIB_MARKET_GROUND
      </footer>
    </main>
  );
}