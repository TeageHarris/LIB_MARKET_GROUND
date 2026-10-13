// src/server.js
// LIB_MARKET_GROUND API Server

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('./db');
const { router: authRouter }      = require('./auth');
const { router: vendorsRouter }   = require('./vendors');
const { router: adminRouter }     = require('./admin');
const { router: productsRouter }  = require('./products');
const { router: uploadsRouter }   = require('./uploads');
const { router: cartRouter }      = require('./cart');
const { router: addressesRouter } = require('./addresses');
const { router: ordersRouter }    = require('./orders');
const { expireStaleOrders }       = require('./expireOrders');

// ----------------------------------------------------------------
// Startup: ensure uploads folder exists, and seed it from git
// on first boot if the Railway volume is empty.
// ----------------------------------------------------------------
const uploadsDir = path.join(__dirname, '..', 'uploads');
const seedDir    = path.join(__dirname, '..', 'seed-uploads');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (fs.existsSync(seedDir)) {
    const existing = fs.readdirSync(uploadsDir).filter((f) => f !== 'lost+found');
    if (existing.length === 0) {
        console.log('[uploads] Volume empty — seeding from seed-uploads/');
        const seedFiles = fs.readdirSync(seedDir);
        for (const f of seedFiles) {
            fs.copyFileSync(
                path.join(seedDir, f),
                path.join(uploadsDir, f)
            );
        }
        console.log(`[uploads] Seeded ${seedFiles.length} file(s)`);
    } else {
        console.log(`[uploads] Volume has ${existing.length} file(s) — skipping seed`);
    }
} else {
    console.log('[uploads] No seed-uploads/ folder found — skipping seed');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()}  ${req.method}  ${req.url}`);
    next();
});

// ----------------------------------------------------------------
// Static serving for uploaded images
// ----------------------------------------------------------------
app.use('/uploads', express.static(uploadsDir));

// ----------------------------------------------------------------
// Health check
// ----------------------------------------------------------------
app.get('/health', async (req, res) => {
    const dbOk = await testConnection();
    res.json({
        status: 'ok',
        database: dbOk ? 'connected' : 'error',
        timestamp: new Date().toISOString()
    });
});

// ----------------------------------------------------------------
// GET /products — public list
// ----------------------------------------------------------------
app.get('/products', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                p.id, p.title, p.slug, p.description,
                p.base_price, p.currency_code, p.is_handmade, p.origin_country,
                v.business_name AS vendor_name,
                v.slug          AS vendor_slug,
                c.name          AS category_name,
                c.slug          AS category_slug,
                i.quantity_available AS stock,
                i.quantity_reserved  AS reserved,
                (
                    SELECT url FROM product_images pi
                    WHERE pi.product_id = p.id AND pi.is_primary = 1
                    LIMIT 1
                ) AS primary_image
            FROM products p
            JOIN vendors v         ON v.id = p.vendor_id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN inventory i  ON i.product_id = p.id
            WHERE p.status = 'active'
            ORDER BY p.published_at DESC
        `);
        res.json({ count: rows.length, products: rows });
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// ----------------------------------------------------------------
// GET /products/:slug — public detail
// ----------------------------------------------------------------
app.get('/products/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const [productRows] = await pool.query(`
            SELECT
                p.id, p.title, p.slug, p.description, p.brand,
                p.condition_type, p.base_price, p.currency_code, p.weight_grams,
                p.is_handmade, p.is_digital, p.origin_country, p.view_count,
                v.id            AS vendor_id,
                v.business_name AS vendor_name,
                v.slug          AS vendor_slug,
                v.logo_url      AS vendor_logo,
                v.county        AS vendor_county,
                v.rating_avg    AS vendor_rating,
                c.name          AS category_name,
                c.slug          AS category_slug,
                i.quantity_available AS stock
            FROM products p
            JOIN vendors v         ON v.id = p.vendor_id
            LEFT JOIN categories c ON c.id = p.category_id
            LEFT JOIN inventory i  ON i.product_id = p.id
            WHERE p.slug = ? AND p.status = 'active'
            LIMIT 1
        `, [slug]);

        if (productRows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = productRows[0];

        const [images] = await pool.query(`
            SELECT id, url, alt_text, sort_order, is_primary
            FROM product_images
            WHERE product_id = ?
            ORDER BY sort_order ASC
        `, [product.id]);
        product.images = images;

        pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id])
            .catch(() => {});

        res.json({ product });
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// ----------------------------------------------------------------
// GET /categories — public
// ----------------------------------------------------------------
app.get('/categories', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                c.id, c.name, c.slug, c.icon_url, c.sort_order, c.parent_id,
                (
                    SELECT COUNT(*) FROM products p
                    WHERE p.category_id = c.id AND p.status = 'active'
                ) AS product_count
            FROM categories c
            WHERE c.is_active = 1
            ORDER BY c.sort_order ASC, c.name ASC
        `);
        res.json({ count: rows.length, categories: rows });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// ----------------------------------------------------------------
// Mounted routers
// ----------------------------------------------------------------
app.use('/auth',      authRouter);
app.use('/vendors',   vendorsRouter);
app.use('/products',  uploadsRouter);
app.use('/products',  productsRouter);
app.use('/cart',      cartRouter);
app.use('/addresses', addressesRouter);
app.use('/orders',    ordersRouter);
app.use('/admin',     adminRouter);

// ----------------------------------------------------------------
// 404 (MUST be last, before app.listen)
// ----------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ----------------------------------------------------------------
// Start server
// ----------------------------------------------------------------
app.listen(PORT, async () => {
    console.log('');
    console.log('=====================================');
    console.log('  LIB_MARKET_GROUND API');
    console.log('=====================================');
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log('');
    await testConnection();
    console.log('');
    console.log('  Try these URLs:');
    console.log(`  -> http://localhost:${PORT}/health`);
    console.log(`  -> http://localhost:${PORT}/products`);
    console.log(`  -> http://localhost:${PORT}/categories`);
    console.log('');
    console.log('  Press Ctrl+C to stop');
    console.log('=====================================');
    console.log('');
});

// ----------------------------------------------------------------
// Background sweep: auto-cancel stale orders
// Runs every 6 hours. Orders stuck in pending_shipping_quote
// or pending_payment for more than 48h get cancelled.
// ----------------------------------------------------------------
const SWEEP_INTERVAL_HOURS = 6;
const EXPIRE_AFTER_HOURS   = 48;

setInterval(async () => {
    try {
        const result = await expireStaleOrders(EXPIRE_AFTER_HOURS);
        if (result.expired > 0) {
            console.log(`[sweep] Auto-expired ${result.expired} stale order(s): ${result.order_ids.join(', ')}`);
        }
    } catch (err) {
        console.error('[sweep] Failed:', err.message);
    }
}, SWEEP_INTERVAL_HOURS * 60 * 60 * 1000);