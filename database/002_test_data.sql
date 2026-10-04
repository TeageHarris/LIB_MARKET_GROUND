-- =====================================================================
-- LIB_MARKET_GROUND — Test Data (v1.0)
-- Run AFTER 001_schema.sql
-- Safe to re-run: clears test rows first (does NOT touch categories)
-- =====================================================================

USE lib_market_ground;

SET FOREIGN_KEY_CHECKS = 0;

-- Clean out any previous test data (order matters: children first)
TRUNCATE TABLE payments;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE cart_items;
TRUNCATE TABLE carts;
TRUNCATE TABLE inventory;
TRUNCATE TABLE product_images;
TRUNCATE TABLE products;
TRUNCATE TABLE vendor_documents;
TRUNCATE TABLE vendors;
TRUNCATE TABLE addresses;
TRUNCATE TABLE users;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. USERS
-- =====================================================================

-- Admin (password below is all hashed with bcrypt cost 10 for the string "password123")
INSERT INTO users (email, phone, password_hash, full_name, role, email_verified, phone_verified) VALUES
('admin@libmarketground.lr',      '+231770000001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Platform Admin',        'admin',        1, 1),
('buyer@example.com',             '+231770000002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Massa Johnson',         'buyer',        1, 1),
('diaspora@example.com',          '+12025550143',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Emmanuel Doe (USA)',    'buyer',        1, 0),
('vendor@monroviacrafts.lr',      '+231770000003', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Martha Kollie',         'vendor_owner', 1, 1),
('vendor@liberianfoods.lr',       '+231770000004', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Joseph Weah',           'vendor_owner', 1, 1);

-- =====================================================================
-- 2. ADDRESSES
-- =====================================================================

-- Massa Johnson (buyer in Monrovia)
INSERT INTO addresses (user_id, label, recipient_name, phone, county, city, line1, is_default)
SELECT id, 'Home', 'Massa Johnson', '+231770000002', 'Montserrado', 'Monrovia', 'Corner of Broad & Randall Streets', 1
FROM users WHERE email = 'buyer@example.com';

-- Emmanuel Doe (diaspora buyer in USA)
INSERT INTO addresses (user_id, label, recipient_name, phone, country, city, line1, postal_code, is_default)
SELECT id, 'Home', 'Emmanuel Doe', '+12025550143', 'US', 'Washington DC', '1234 K Street NW, Apt 5B', '20005', 1
FROM users WHERE email = 'diaspora@example.com';

-- =====================================================================
-- 3. VENDORS
-- =====================================================================

INSERT INTO vendors (
    owner_user_id, business_name, slug, description,
    phone, email, county, city,
    verification_status, commission_rate, accepts_momo, ships_international, approved_at
)
SELECT id, 'Monrovia Crafts', 'monrovia-crafts',
       'Handmade Liberian crafts — country cloth, wood carvings, and traditional artwork.',
       '+231770000003', 'vendor@monroviacrafts.lr', 'Montserrado', 'Monrovia',
       'approved', 0.1000, 1, 1, NOW()
FROM users WHERE email = 'vendor@monroviacrafts.lr';

INSERT INTO vendors (
    owner_user_id, business_name, slug, description,
    phone, email, county, city,
    verification_status, commission_rate, accepts_momo, ships_international, approved_at
)
SELECT id, 'Liberian Foods Co.', 'liberian-foods',
       'Authentic Liberian food products — palm butter, cassava, pepper soup, and more.',
       '+231770000004', 'vendor@liberianfoods.lr', 'Montserrado', 'Monrovia',
       'approved', 0.1000, 1, 1, NOW()
FROM users WHERE email = 'vendor@liberianfoods.lr';

-- =====================================================================
-- 4. VENDOR DOCUMENTS (all approved for test vendors)
-- =====================================================================

INSERT INTO vendor_documents (vendor_id, doc_type, file_url, status, reviewed_at)
SELECT id, 'business_registration', 'https://files.example.com/docs/monrovia-crafts-bizreg.pdf', 'approved', NOW()
FROM vendors WHERE slug = 'monrovia-crafts';

INSERT INTO vendor_documents (vendor_id, doc_type, file_url, status, reviewed_at)
SELECT id, 'national_id', 'https://files.example.com/docs/martha-kollie-id.pdf', 'approved', NOW()
FROM vendors WHERE slug = 'monrovia-crafts';

INSERT INTO vendor_documents (vendor_id, doc_type, file_url, status, reviewed_at)
SELECT id, 'business_registration', 'https://files.example.com/docs/liberian-foods-bizreg.pdf', 'approved', NOW()
FROM vendors WHERE slug = 'liberian-foods';

-- =====================================================================
-- 5. PRODUCTS
-- =====================================================================

-- Monrovia Crafts products
INSERT INTO products (
    vendor_id, category_id, title, slug, description, brand,
    status, base_price, currency_code, weight_grams,
    is_handmade, origin_country, published_at
)
SELECT v.id, c.id,
       'Handwoven Country Cloth',
       'handwoven-country-cloth',
       'Traditional Liberian country cloth, handwoven in Lofa County. 100% cotton, natural dyes.',
       'Monrovia Crafts',
       'active', 45.00, 'USD', 800,
       1, 'LR', NOW()
FROM vendors v, categories c
WHERE v.slug = 'monrovia-crafts' AND c.slug = 'arts-crafts';

INSERT INTO products (
    vendor_id, category_id, title, slug, description, brand,
    status, base_price, currency_code, weight_grams,
    is_handmade, origin_country, published_at
)
SELECT v.id, c.id,
       'Carved Wooden Mask',
       'carved-wooden-mask',
       'Hand-carved Dan tribe ceremonial mask from Nimba County. Signed by the artisan.',
       'Monrovia Crafts',
       'active', 78.50, 'USD', 1200,
       1, 'LR', NOW()
FROM vendors v, categories c
WHERE v.slug = 'monrovia-crafts' AND c.slug = 'arts-crafts';

-- Liberian Foods products
INSERT INTO products (
    vendor_id, category_id, title, slug, description, brand,
    status, base_price, currency_code, weight_grams,
    is_handmade, origin_country, published_at
)
SELECT v.id, c.id,
       'Palm Butter (32oz Jar)',
       'palm-butter-32oz',
       'Authentic Liberian palm butter, slow-cooked and jarred. Ready to eat with rice.',
       'Liberian Foods Co.',
       'active', 12.99, 'USD', 950,
       1, 'LR', NOW()
FROM vendors v, categories c
WHERE v.slug = 'liberian-foods' AND c.slug = 'food-agriculture';

INSERT INTO products (
    vendor_id, category_id, title, slug, description, brand,
    status, base_price, currency_code, weight_grams,
    is_handmade, origin_country, published_at
)
SELECT v.id, c.id,
       'Cassava Flour (5 lb bag)',
       'cassava-flour-5lb',
       'Premium dried cassava flour, stone-ground in Bong County. Gluten-free.',
       'Liberian Foods Co.',
       'active', 8.50, 'USD', 2300,
       1, 'LR', NOW()
FROM vendors v, categories c
WHERE v.slug = 'liberian-foods' AND c.slug = 'food-agriculture';

-- =====================================================================
-- 6. PRODUCT IMAGES (placeholder URLs)
-- =====================================================================

INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
SELECT id, 'https://files.example.com/products/country-cloth-1.jpg', 'Handwoven Country Cloth', 0, 1
FROM products WHERE slug = 'handwoven-country-cloth';

INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
SELECT id, 'https://files.example.com/products/wooden-mask-1.jpg', 'Carved Wooden Mask', 0, 1
FROM products WHERE slug = 'carved-wooden-mask';

INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
SELECT id, 'https://files.example.com/products/palm-butter-1.jpg', 'Palm Butter Jar', 0, 1
FROM products WHERE slug = 'palm-butter-32oz';

INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
SELECT id, 'https://files.example.com/products/cassava-flour-1.jpg', 'Cassava Flour Bag', 0, 1
FROM products WHERE slug = 'cassava-flour-5lb';

-- =====================================================================
-- 7. INVENTORY
-- =====================================================================

INSERT INTO inventory (product_id, quantity_available, low_stock_threshold)
SELECT id, 20, 5 FROM products WHERE slug = 'handwoven-country-cloth';

INSERT INTO inventory (product_id, quantity_available, low_stock_threshold)
SELECT id, 8, 3 FROM products WHERE slug = 'carved-wooden-mask';

INSERT INTO inventory (product_id, quantity_available, low_stock_threshold)
SELECT id, 50, 10 FROM products WHERE slug = 'palm-butter-32oz';

INSERT INTO inventory (product_id, quantity_available, low_stock_threshold)
SELECT id, 35, 10 FROM products WHERE slug = 'cassava-flour-5lb';

-- =====================================================================
-- 8. SAMPLE ORDER #1 — Massa (Monrovia) buys Country Cloth from Monrovia Crafts
-- =====================================================================

INSERT INTO orders (
    order_number, buyer_user_id, vendor_id, status,
    currency_code, subtotal, shipping_total, grand_total, grand_total_usd,
    shipping_address_id, placed_at
)
SELECT
    'LMG-251004-0001',
    b.id,
    v.id,
    'paid',
    'USD', 45.00, 2.00, 47.00, 47.00,
    a.id,
    NOW()
FROM users b, vendors v, addresses a
WHERE b.email = 'buyer@example.com'
  AND v.slug  = 'monrovia-crafts'
  AND a.user_id = b.id;

INSERT INTO order_items (
    order_id, product_id, vendor_id, title_snapshot,
    unit_price, quantity, line_total, commission_amount
)
SELECT o.id, p.id, v.id, 'Handwoven Country Cloth',
       45.00, 1, 45.00, 4.50
FROM orders o, products p, vendors v
WHERE o.order_number = 'LMG-251004-0001'
  AND p.slug = 'handwoven-country-cloth'
  AND v.slug = 'monrovia-crafts';

INSERT INTO payments (
    order_id, provider, provider_reference, amount, currency_code, amount_usd,
    status, paid_at
)
SELECT id, 'mtn_momo', 'MOMO-TEST-00001', 47.00, 'USD', 47.00, 'confirmed', NOW()
FROM orders WHERE order_number = 'LMG-251004-0001';

-- =====================================================================
-- 9. SAMPLE ORDER #2 — Emmanuel (USA) buys Wooden Mask from Monrovia Crafts
-- =====================================================================

INSERT INTO orders (
    order_number, buyer_user_id, vendor_id, status,
    currency_code, subtotal, shipping_total, grand_total, grand_total_usd,
    shipping_address_id, placed_at
)
SELECT
    'LMG-251004-0002',
    b.id,
    v.id,
    'shipped',
    'USD', 78.50, 25.00, 103.50, 103.50,
    a.id,
    NOW()
FROM users b, vendors v, addresses a
WHERE b.email = 'diaspora@example.com'
  AND v.slug  = 'monrovia-crafts'
  AND a.user_id = b.id;

INSERT INTO order_items (
    order_id, product_id, vendor_id, title_snapshot,
    unit_price, quantity, line_total, commission_amount
)
SELECT o.id, p.id, v.id, 'Carved Wooden Mask',
       78.50, 1, 78.50, 7.85
FROM orders o, products p, vendors v
WHERE o.order_number = 'LMG-251004-0002'
  AND p.slug = 'carved-wooden-mask'
  AND v.slug = 'monrovia-crafts';

INSERT INTO payments (
    order_id, provider, provider_reference, amount, currency_code, amount_usd,
    status, paid_at
)
SELECT id, 'flutterwave', 'FLW-TEST-00002', 103.50, 'USD', 103.50, 'confirmed', NOW()
FROM orders WHERE order_number = 'LMG-251004-0002';

-- =====================================================================
-- 10. SAMPLE ORDER #3 — Massa buys Palm Butter from Liberian Foods (pending payment)
-- =====================================================================

INSERT INTO orders (
    order_number, buyer_user_id, vendor_id, status,
    currency_code, subtotal, shipping_total, grand_total, grand_total_usd,
    shipping_address_id, placed_at
)
SELECT
    'LMG-251004-0003',
    b.id,
    v.id,
    'pending_payment',
    'USD', 12.99, 2.00, 14.99, 14.99,
    a.id,
    NOW()
FROM users b, vendors v, addresses a
WHERE b.email = 'buyer@example.com'
  AND v.slug  = 'liberian-foods'
  AND a.user_id = b.id;

INSERT INTO order_items (
    order_id, product_id, vendor_id, title_snapshot,
    unit_price, quantity, line_total, commission_amount
)
SELECT o.id, p.id, v.id, 'Palm Butter (32oz Jar)',
       12.99, 1, 12.99, 1.30
FROM orders o, products p, vendors v
WHERE o.order_number = 'LMG-251004-0003'
  AND p.slug = 'palm-butter-32oz'
  AND v.slug = 'liberian-foods';

INSERT INTO payments (
    order_id, provider, amount, currency_code, amount_usd, status
)
SELECT id, 'mtn_momo', 14.99, 'USD', 14.99, 'pending'
FROM orders WHERE order_number = 'LMG-251004-0003';

-- =====================================================================
-- VERIFICATION QUERIES — run these to see the data
-- =====================================================================

-- How many of each entity?
SELECT 'users'       AS entity, COUNT(*) AS count FROM users
UNION ALL SELECT 'vendors',      COUNT(*) FROM vendors
UNION ALL SELECT 'products',     COUNT(*) FROM products
UNION ALL SELECT 'orders',       COUNT(*) FROM orders
UNION ALL SELECT 'payments',     COUNT(*) FROM payments;

-- Full order overview
SELECT
    o.order_number,
    o.status,
    u.full_name        AS buyer,
    v.business_name    AS vendor,
    oi.title_snapshot  AS product,
    oi.line_total,
    o.grand_total,
    p.provider         AS payment_method,
    p.status           AS payment_status
FROM orders o
JOIN users u       ON u.id = o.buyer_user_id
JOIN vendors v     ON v.id = o.vendor_id
JOIN order_items oi ON oi.order_id = o.id
JOIN payments p    ON p.order_id = o.id
ORDER BY o.placed_at DESC;

-- Vendor earnings summary (commission deducted)
SELECT
    v.business_name,
    COUNT(DISTINCT o.id)             AS total_orders,
    SUM(oi.line_total)               AS gross_sales,
    SUM(oi.commission_amount)        AS platform_commission,
    SUM(oi.line_total - oi.commission_amount) AS vendor_net
FROM vendors v
LEFT JOIN order_items oi ON oi.vendor_id = v.id
LEFT JOIN orders o       ON o.id = oi.order_id AND o.status IN ('paid','shipped','delivered')
GROUP BY v.id, v.business_name;