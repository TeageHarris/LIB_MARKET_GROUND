-- =====================================================================
-- LIB_MARKET_GROUND — MVP Database Schema (v1.0)
-- MySQL 8.0+
-- =====================================================================

USE lib_market_ground;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop in reverse dependency order (safe to re-run)
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS vendor_documents;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================
-- 1. USERS
-- =====================================================================
CREATE TABLE users (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email              VARCHAR(150) NOT NULL,
    phone              VARCHAR(20) NOT NULL,
    password_hash      VARCHAR(255) NOT NULL,
    full_name          VARCHAR(120) NOT NULL,
    role               ENUM('buyer','vendor_owner','admin') NOT NULL DEFAULT 'buyer',
    status             ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
    email_verified     TINYINT(1) NOT NULL DEFAULT 0,
    phone_verified     TINYINT(1) NOT NULL DEFAULT 0,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    last_login_at      TIMESTAMP NULL DEFAULT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_phone (phone),
    KEY idx_users_role (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 2. ADDRESSES
-- =====================================================================
CREATE TABLE addresses (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id        BIGINT UNSIGNED NOT NULL,
    label          VARCHAR(50) NOT NULL DEFAULT 'Home',
    recipient_name VARCHAR(120) NOT NULL,
    phone          VARCHAR(20) NOT NULL,
    country        VARCHAR(2) NOT NULL DEFAULT 'LR',
    county         VARCHAR(60) NULL,
    city           VARCHAR(80) NOT NULL,
    line1          VARCHAR(200) NOT NULL,
    line2          VARCHAR(200) NULL,
    postal_code    VARCHAR(20) NULL,
    latitude       DECIMAL(10,7) NULL,
    longitude      DECIMAL(10,7) NULL,
    is_default     TINYINT(1) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_addresses_user (user_id),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 3. VENDORS
-- =====================================================================
CREATE TABLE vendors (
    id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    owner_user_id            BIGINT UNSIGNED NOT NULL,
    business_name            VARCHAR(150) NOT NULL,
    slug                     VARCHAR(160) NOT NULL,
    description              TEXT NULL,
    business_registration_no VARCHAR(80) NULL,
    tax_id                   VARCHAR(80) NULL,
    phone                    VARCHAR(20) NOT NULL,
    email                    VARCHAR(150) NOT NULL,
    logo_url                 VARCHAR(500) NULL,
    banner_url               VARCHAR(500) NULL,
    country                  VARCHAR(2) NOT NULL DEFAULT 'LR',
    county                   VARCHAR(60) NULL,
    city                     VARCHAR(80) NULL,
    verification_status      ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
    commission_rate          DECIMAL(5,4) NOT NULL DEFAULT 0.1000,
    rating_avg               DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_orders             INT UNSIGNED NOT NULL DEFAULT 0,
    total_sales_usd          DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    accepts_momo             TINYINT(1) NOT NULL DEFAULT 1,
    ships_international      TINYINT(1) NOT NULL DEFAULT 0,
    approved_at              TIMESTAMP NULL DEFAULT NULL,
    created_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vendors_owner (owner_user_id),
    UNIQUE KEY uq_vendors_slug (slug),
    KEY idx_vendors_status (verification_status),
    KEY idx_vendors_county (county),
    CONSTRAINT fk_vendors_owner FOREIGN KEY (owner_user_id)
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT chk_vendors_commission CHECK (commission_rate BETWEEN 0 AND 1),
    CONSTRAINT chk_vendors_rating CHECK (rating_avg BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 4. VENDOR_DOCUMENTS
-- =====================================================================
CREATE TABLE vendor_documents (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_id        BIGINT UNSIGNED NOT NULL,
    doc_type         ENUM('business_registration','national_id','tax_clearance','momo_proof','proof_of_address') NOT NULL,
    file_url         VARCHAR(500) NOT NULL,
    status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    reviewed_by      BIGINT UNSIGNED NULL,
    rejection_reason TEXT NULL,
    reviewed_at      TIMESTAMP NULL DEFAULT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_vendor_docs_vendor (vendor_id),
    KEY idx_vendor_docs_status (status),
    CONSTRAINT fk_vendor_docs_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE CASCADE,
    CONSTRAINT fk_vendor_docs_reviewer FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 5. CATEGORIES
-- =====================================================================
CREATE TABLE categories (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id  BIGINT UNSIGNED NULL,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(120) NOT NULL,
    icon_url   VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_slug (slug),
    KEY idx_categories_parent (parent_id),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id)
        REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 6. PRODUCTS
-- =====================================================================
CREATE TABLE products (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vendor_id      BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NULL,
    title          VARCHAR(200) NOT NULL,
    slug           VARCHAR(220) NOT NULL,
    description    TEXT NULL,
    brand          VARCHAR(100) NULL,
    condition_type ENUM('new','used','refurbished') NOT NULL DEFAULT 'new',
    status         ENUM('draft','active','archived') NOT NULL DEFAULT 'draft',
    base_price     DECIMAL(12,2) NOT NULL,
    currency_code  VARCHAR(3) NOT NULL DEFAULT 'USD',
    weight_grams   INT UNSIGNED NULL,
    length_cm      DECIMAL(6,2) NULL,
    width_cm       DECIMAL(6,2) NULL,
    height_cm      DECIMAL(6,2) NULL,
    is_digital     TINYINT(1) NOT NULL DEFAULT 0,
    is_handmade    TINYINT(1) NOT NULL DEFAULT 0,
    origin_country VARCHAR(2) NOT NULL DEFAULT 'LR',
    view_count     INT UNSIGNED NOT NULL DEFAULT 0,
    published_at   TIMESTAMP NULL DEFAULT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_slug (slug),
    KEY idx_products_vendor_status (vendor_id, status),
    KEY idx_products_category (category_id),
    KEY idx_products_price (base_price),
    FULLTEXT KEY ft_products_search (title, description),
    CONSTRAINT fk_products_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id)
        REFERENCES categories(id) ON DELETE SET NULL,
    CONSTRAINT chk_products_price CHECK (base_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 7. PRODUCT_IMAGES
-- =====================================================================
CREATE TABLE product_images (
    id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id BIGINT UNSIGNED NOT NULL,
    url        VARCHAR(500) NOT NULL,
    alt_text   VARCHAR(200) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_product_images_product (product_id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 8. INVENTORY
-- =====================================================================
CREATE TABLE inventory (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id          BIGINT UNSIGNED NOT NULL,
    quantity_available  INT UNSIGNED NOT NULL DEFAULT 0,
    quantity_reserved   INT UNSIGNED NOT NULL DEFAULT 0,
    low_stock_threshold INT UNSIGNED NOT NULL DEFAULT 5,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_product (product_id),
    CONSTRAINT fk_inventory_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT chk_inventory_reserved CHECK (quantity_reserved <= quantity_available)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 9. CARTS
-- =====================================================================
CREATE TABLE carts (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id       BIGINT UNSIGNED NOT NULL,
    vendor_id     BIGINT UNSIGNED NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_carts_user (user_id),
    CONSTRAINT fk_carts_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_carts_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 10. CART_ITEMS
-- =====================================================================
CREATE TABLE cart_items (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cart_id             BIGINT UNSIGNED NOT NULL,
    product_id          BIGINT UNSIGNED NOT NULL,
    vendor_id           BIGINT UNSIGNED NOT NULL,
    quantity            INT UNSIGNED NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    added_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cart_items (cart_id, product_id),
    KEY idx_cart_items_cart (cart_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id)
        REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE CASCADE,
    CONSTRAINT chk_cart_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 11. ORDERS
-- =====================================================================
CREATE TABLE orders (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_number        VARCHAR(20) NOT NULL,
    buyer_user_id       BIGINT UNSIGNED NOT NULL,
    vendor_id           BIGINT UNSIGNED NOT NULL,
    status              ENUM('pending_payment','paid','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending_payment',
    currency_code       VARCHAR(3) NOT NULL DEFAULT 'USD',
    subtotal            DECIMAL(12,2) NOT NULL,
    shipping_total      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_total      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    grand_total         DECIMAL(12,2) NOT NULL,
    grand_total_usd     DECIMAL(12,2) NOT NULL,
    shipping_address_id BIGINT UNSIGNED NOT NULL,
    buyer_note          TEXT NULL,
    placed_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at        TIMESTAMP NULL DEFAULT NULL,
    delivered_at        TIMESTAMP NULL DEFAULT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_number (order_number),
    KEY idx_orders_buyer (buyer_user_id, placed_at),
    KEY idx_orders_vendor (vendor_id, status),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_buyer FOREIGN KEY (buyer_user_id)
        REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE RESTRICT,
    CONSTRAINT fk_orders_address FOREIGN KEY (shipping_address_id)
        REFERENCES addresses(id) ON DELETE RESTRICT,
    CONSTRAINT chk_orders_grand_total CHECK (grand_total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 12. ORDER_ITEMS
-- =====================================================================
CREATE TABLE order_items (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id          BIGINT UNSIGNED NOT NULL,
    product_id        BIGINT UNSIGNED NULL,
    vendor_id         BIGINT UNSIGNED NOT NULL,
    title_snapshot    VARCHAR(200) NOT NULL,
    image_snapshot    VARCHAR(500) NULL,
    unit_price        DECIMAL(12,2) NOT NULL,
    quantity          INT UNSIGNED NOT NULL,
    line_total        DECIMAL(12,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_vendor (vendor_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT fk_order_items_vendor FOREIGN KEY (vendor_id)
        REFERENCES vendors(id) ON DELETE RESTRICT,
    CONSTRAINT chk_order_items_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- 13. PAYMENTS
-- =====================================================================
CREATE TABLE payments (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id           BIGINT UNSIGNED NOT NULL,
    provider           ENUM('mtn_momo','orange_money','flutterwave','paydunya','manual') NOT NULL,
    provider_reference VARCHAR(120) NULL,
    amount             DECIMAL(12,2) NOT NULL,
    currency_code      VARCHAR(3) NOT NULL DEFAULT 'USD',
    amount_usd         DECIMAL(12,2) NOT NULL,
    gateway_fee        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status             ENUM('pending','confirmed','failed','refunded') NOT NULL DEFAULT 'pending',
    failure_reason     TEXT NULL,
    confirmed_by       BIGINT UNSIGNED NULL,
    raw_response       JSON NULL,
    paid_at            TIMESTAMP NULL DEFAULT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_payments_ref (provider_reference),
    KEY idx_payments_order (order_id),
    KEY idx_payments_status (status),
    KEY idx_payments_provider (provider),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id)
        REFERENCES orders(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_confirmer FOREIGN KEY (confirmed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_payments_amount CHECK (amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
-- SEED DATA: Default categories
-- =====================================================================
INSERT INTO categories (name, slug, sort_order) VALUES
    ('Food & Agriculture', 'food-agriculture', 1),
    ('Fashion & Textiles', 'fashion-textiles', 2),
    ('Arts & Crafts',      'arts-crafts',      3),
    ('Electronics',        'electronics',      4),
    ('Home & Living',      'home-living',      5),
    ('Beauty & Health',    'beauty-health',    6),
    ('Books & Stationery', 'books-stationery', 7),
    ('Services',           'services',         8);

-- =====================================================================
-- DONE
-- =====================================================================