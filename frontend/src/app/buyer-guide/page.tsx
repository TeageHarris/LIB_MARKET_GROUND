// src/app/buyer-guide/page.tsx
import Link from 'next/link';

export const metadata = {
  title: 'Buyer Guide — LIB_MARKET_GROUND',
  description:
    'How to shop, pay, and track your orders on LIB_MARKET_GROUND',
};

const SUPPORT_EMAIL = 'libmarketgroundsupport@gmail.com';
const SUPPORT_PHONE = '+231 88 067 6703';
const ORANGE_NUMBER = '+231 776315270';
const MOMO_NUMBER = '+231 88 699 3491';


export default function BuyerGuidePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Back to home
        </Link>

        <header className="mt-6">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
            For Buyers
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">Buyer Guide</h1>
          <p className="mt-3 text-gray-600 leading-relaxed">
            Everything you need to know about shopping on LIB_MARKET_GROUND —
            how to place an order, how to pay, how delivery works, and what to
            do if something goes wrong.
          </p>
        </header>

        {/* 1. Browsing */}
        <Section number="1" title="Finding Products">
          <p>
            Start on the{' '}
            <Link href="/" className="text-emerald-700 underline">
              home page
            </Link>
            . Every active product from every approved vendor is listed there.
          </p>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              <strong>Search or browse</strong> — use the category filter on
              each product card to narrow down
            </li>
            <li>
              <strong>Tap a product</strong> to see full details — photos,
              description, price, vendor name, and stock
            </li>
            <li>
              Every product shows the <strong>vendor&apos;s business name</strong>{' '}
              and location, so you know who you&apos;re buying from
            </li>
          </ul>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Look for these signals
            </p>
            <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-5">
              <li>
                <strong>Approved vendor</strong> — the seller has been reviewed
                and verified by LIB_MARKET_GROUND
              </li>
              <li>
                <strong>Stock in green</strong> — the item is available right
                now
              </li>
              <li>
                <strong>Handmade / origin country badges</strong> — where the
                product comes from
              </li>
            </ul>
          </div>
        </Section>

        {/* 2. Cart and checkout */}
        <Section number="2" title="Adding to Cart & Checking Out">
          <ol className="space-y-3 list-decimal pl-5">
            <li>
              On any product page, tap <strong>Add to Cart</strong>.
            </li>
            <li>
              Go to your{' '}
              <Link href="/cart" className="text-emerald-700 underline">
                Cart
              </Link>{' '}
              when you&apos;re ready.
            </li>
            <li>
              Tap <strong>Proceed to checkout</strong>. You&apos;ll confirm your
              delivery address and can add a note for the vendor.
            </li>
            <li>
              Tap <strong>Place order</strong>.
            </li>
          </ol>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">
              One vendor per order
            </p>
            <p className="text-sm text-amber-800">
              Each order is from a single vendor. If you want products from
              different sellers, place separate orders — that way each vendor
              ships directly to you and the tracking is clean.
            </p>
          </div>
        </Section>

        {/* 3. How you pay */}
        <Section number="3" title="How You Pay">
          <p>
            After you place the order, you&apos;ll see the{' '}
            <strong>payment instructions</strong> on your order page.
          </p>
          <ol className="mt-3 space-y-3 list-decimal pl-5">
            <li>
              Open <strong>Orange Money</strong> or <strong>Lonestar MoMo</strong>{' '}
              on your phone.
            </li>
            <li>
              Send the <strong>product amount</strong> to the LIB_MARKET_GROUND
              account shown on your order page.
            </li>
            <li>
              Use your <strong>order number</strong> (e.g.{' '}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                LMG-261011-0005
              </code>
              ) as the reference.
            </li>
            <li>
              Our team verifies the payment — usually within a few hours — then
              your order is marked <Badge>paid</Badge>.
            </li>
          </ol>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-1">
              You pay the product price to us — not to the vendor
            </p>
            <p className="text-sm text-emerald-700">
              We hold the money until you confirm delivery. That protects you
              if the product never arrives or isn&apos;t what you ordered.
            </p>
          </div>
        </Section>

        {/* 4. Shipping is COD */}
        <Section number="4" title="Shipping — Cash on Delivery">
          <p>
            <strong>
              The shipping fee is not part of what you pay us online.
            </strong>{' '}
            You pay it in cash to the courier when your package arrives.
          </p>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li>
              Each vendor sets their own shipping fee, based on your location
              and the size/weight of the item
            </li>
            <li>
              You&apos;ll see the shipping fee on your order page{' '}
              <strong>before you pay</strong> — no surprises
            </li>
            <li>
              Have the exact cash ready when the courier arrives
            </li>
            <li>
              The shipping fee goes 100% to the vendor and courier — LIB_MARKET_GROUND
              takes no cut of it
            </li>
          </ul>
        </Section>

        {/* 5. Order lifecycle */}
        <Section number="5" title="What Your Order Status Means">
          <ul className="space-y-4">
            <LifecycleStep
              step="1"
              status="pending_shipping_quote"
              label="Awaiting shipping quote"
              desc="You've placed the order. The vendor is looking at your address and calculating the delivery fee."
            />
            <LifecycleStep
              step="2"
              status="pending_payment"
              label="Awaiting payment"
              desc="The vendor has set the shipping fee. You can now pay the product amount to us."
            />
            <LifecycleStep
              step="3"
              status="paid"
              label="Payment confirmed"
              desc="We've verified your payment. The vendor is preparing to ship your order."
            />
            <LifecycleStep
              step="4"
              status="shipped"
              label="On the way"
              desc="Your order has been handed to the courier. Have your shipping cash ready."
            />
            <LifecycleStep
              step="5"
              status="delivered"
              label="Delivered"
              desc="You've received your order. The order is complete."
            />
          </ul>
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-900 mb-1">
              Always confirm delivery
            </p>
            <p className="text-sm text-amber-800">
              Once the courier drops off your package, open the order page and
              tap <strong>Confirm delivery received</strong>. This closes the
              order and releases the vendor&apos;s payout.
            </p>
          </div>
        </Section>

        {/* 6. Cancel and refunds */}
        <Section number="6" title="Cancelling or Getting a Refund">
          <p className="font-medium text-gray-900">Cancelling an unpaid order</p>
          <p className="mt-2">
            If you haven&apos;t paid yet, you can cancel your order. Open the
            order page and tap <strong>Cancel order</strong>. Stock is released
            immediately and no payment is due.
          </p>
          <p className="mt-4 font-medium text-gray-900">
            Requesting a refund (after paying)
          </p>
          <p className="mt-2">
            Contact support with your order number and reason. Refunds are
            reviewed by our team and processed within a few business days.
          </p>
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-medium text-emerald-800 mb-2">
              Your protection
            </p>
            <ul className="text-sm text-emerald-700 space-y-1 list-disc pl-5">
              <li>
                If you never receive the product, you get a full refund of the
                product price
              </li>
              <li>
                If you refuse a delivery, the product returns to the vendor and
                you&apos;re refunded the product price minus a small $2
                failed-delivery fee
              </li>
              <li>
                Shipping fees are paid directly to the courier and are not
                refundable once a delivery has been attempted
              </li>
            </ul>
          </div>
        </Section>

        {/* 7. Getting help */}
        <Section number="7" title="Getting Help">
          <p>
            If anything goes wrong — the wrong item arrived, you have a question
            about your order, or a payment didn&apos;t go through — reach out:
          </p>
          <ul className="mt-3 space-y-2">
            <li>
              📧{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-emerald-700 underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
            <li>📱 {SUPPORT_PHONE}</li>
          </ul>
          <p className="mt-4 text-sm text-gray-500">
            Always include your <strong>order number</strong> — it helps us find
            your order instantly.
          </p>
        </Section>

        {/* 8. Payment info reminder */}
        <Section number="8" title="Where to Send Payment">
          <p>Pay the product amount to one of the accounts below:</p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase text-gray-500 tracking-wide">
                Orange Money
              </p>
              <p className="mt-1 font-mono font-semibold text-gray-900">
                {ORANGE_NUMBER}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-medium uppercase text-gray-500 tracking-wide">
                Lonestar MoMo
              </p>
              <p className="mt-1 font-mono font-semibold text-gray-900">
                {MOMO_NUMBER}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Always use your <strong>order number as the reference</strong> —{' '}
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
              LMG-YYMMDD-NNNN
            </code>
            . Without the reference, we can&apos;t match your payment to your
            order.
          </p>
        </Section>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 text-center px-6 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Start shopping
          </Link>
          <Link
            href="/orders"
            className="flex-1 text-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-white"
          >
            My orders
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------- Sub-components ----------

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-emerald-700 text-white text-sm font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>
      <div className="mt-4 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
      {children}
    </span>
  );
}

function LifecycleStep({
  step,
  status,
  label,
  desc,
}: {
  step: string;
  status: string;
  label: string;
  desc: string;
}) {
  return (
    <li className="flex gap-3 items-start">
      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
        {step}
      </span>
      <div>
        <p className="font-medium text-gray-900 text-sm">
          {label}{' '}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600">
            {status}
          </code>
        </p>
        <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
      </div>
    </li>
  );
}