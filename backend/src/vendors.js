// src/vendors.js
// Vendor application + KYC document routes + vendor-side payout view

const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ----------------------------------------------------------------
// Helper: turn a business name into a URL-safe slug
// ----------------------------------------------------------------
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// ----------------------------------------------------------------
// Helper: ensure the slug is unique (append -2, -3, ...)
// ----------------------------------------------------------------
async function uniqueSlug(base) {
    let slug = base;
    let n = 1;
    while (true) {
        const [rows] = await pool.query(
            'SELECT id FROM vendors WHERE slug = ? LIMIT 1', [slug]
        );
        if (rows.length === 0) return slug;
        n++;
        slug = `${base}-${n}`;
    }
}

// ----------------------------------------------------------------
// POST /vendors/apply
// ----------------------------------------------------------------
router.post('/apply', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            business_name, description, phone, email,
            county, city, business_registration_no, tax_id
        } = req.body;

        if (!business_name || !phone || !email) {
            return res.status(400).json({
                error: 'business_name, phone, and email are required'
            });
        }

        const [existing] = await pool.query(
            'SELECT id, verification_status FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [userId]
        );
        if (existing.length > 0) {
            return res.status(409).json({
                error: 'You have already submitted a vendor application',
                vendor_id: existing[0].id,
                verification_status: existing[0].verification_status
            });
        }

        const slug = await uniqueSlug(slugify(business_name));

        const [result] = await pool.query(
            `INSERT INTO vendors (
                owner_user_id, business_name, slug, description,
                business_registration_no, tax_id, phone, email,
                county, city, verification_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                userId, business_name, slug, description || null,
                business_registration_no || null, tax_id || null,
                phone, email, county || null, city || null
            ]
        );

        const [rows] = await pool.query(
            'SELECT * FROM vendors WHERE id = ?', [result.insertId]
        );

        res.status(201).json({
            message: 'Application submitted. Awaiting admin review.',
            vendor: rows[0]
        });
    } catch (err) {
        console.error('Vendor apply error:', err);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// ----------------------------------------------------------------
// POST /vendors/documents
// ----------------------------------------------------------------
router.post('/documents', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { doc_type, file_url } = req.body;

        if (!doc_type || !file_url) {
            return res.status(400).json({
                error: 'doc_type and file_url are required'
            });
        }

        const allowed = [
            'business_registration', 'national_id', 'tax_clearance',
            'momo_proof', 'proof_of_address'
        ];
        if (!allowed.includes(doc_type)) {
            return res.status(400).json({ error: 'Invalid doc_type', allowed });
        }

        const [vRows] = await pool.query(
            'SELECT id FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [userId]
        );
        if (vRows.length === 0) {
            return res.status(400).json({
                error: 'You must apply to be a vendor before uploading documents'
            });
        }
        const vendorId = vRows[0].id;

        const [result] = await pool.query(
            `INSERT INTO vendor_documents (vendor_id, doc_type, file_url)
             VALUES (?, ?, ?)`,
            [vendorId, doc_type, file_url]
        );

        const [rows] = await pool.query(
            'SELECT * FROM vendor_documents WHERE id = ?', [result.insertId]
        );

        res.status(201).json({
            message: 'Document submitted for review',
            document: rows[0]
        });
    } catch (err) {
        console.error('Document submit error:', err);
        res.status(500).json({ error: 'Failed to submit document' });
    }
});

// ----------------------------------------------------------------
// GET /vendors/me/products
// ----------------------------------------------------------------
router.get('/me/products', requireAuth, async (req, res) => {
    try {
        const [vRows] = await pool.query(
            'SELECT id FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'You are not a vendor' });
        }
        const vendorId = vRows[0].id;

        const [rows] = await pool.query(
            `SELECT
                p.id, p.title, p.slug, p.status, p.base_price,
                p.currency_code, p.view_count, p.published_at, p.created_at,
                c.name AS category_name,
                i.quantity_available AS stock,
                (SELECT url FROM product_images pi
                 WHERE pi.product_id = p.id AND pi.is_primary = 1
                 LIMIT 1) AS primary_image
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN inventory i  ON i.product_id = p.id
             WHERE p.vendor_id = ?
             ORDER BY p.created_at DESC`,
            [vendorId]
        );
        res.json({ count: rows.length, products: rows });
    } catch (err) {
        console.error('My products error:', err);
        res.status(500).json({ error: 'Failed to list products' });
    }
});

// ----------------------------------------------------------------
// GET /vendors/me/products/:id
// Vendor-owned product detail (includes drafts + images).
// ----------------------------------------------------------------
router.get('/me/products/:id', requireAuth, async (req, res) => {
    try {
        const [vRows] = await pool.query(
            'SELECT id FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'You are not a vendor' });
        }
        const vendorId = vRows[0].id;

        const [pRows] = await pool.query(
            `SELECT id, title, slug, status, base_price, currency_code
             FROM products
             WHERE id = ? AND vendor_id = ?
             LIMIT 1`,
            [req.params.id, vendorId]
        );
        if (pRows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const product = pRows[0];

        const [images] = await pool.query(
            `SELECT id, url, alt_text, sort_order, is_primary
             FROM product_images
             WHERE product_id = ?
             ORDER BY is_primary DESC, sort_order ASC, id ASC`,
            [product.id]
        );
        product.images = images;

        res.json({ product });
    } catch (err) {
        console.error('Vendor product detail error:', err);
        res.status(500).json({ error: 'Failed to load product' });
    }
});

// ----------------------------------------------------------------
// GET /vendors/me/payouts
// Earnings breakdown by stage + payout history
// ----------------------------------------------------------------
router.get('/me/payouts', requireAuth, async (req, res) => {
    try {
        const [vRows] = await pool.query(
            'SELECT id, business_name FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'You are not a vendor' });
        }
        const vendor = vRows[0];

        const [salesRows] = await pool.query(
            `SELECT
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.line_total ELSE 0 END), 0)                       AS delivered_gross,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.commission_amount ELSE 0 END), 0)                AS delivered_commission,
                COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN oi.line_total - oi.commission_amount ELSE 0 END), 0) AS delivered_net,

                COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped') THEN oi.line_total ELSE 0 END), 0)                       AS pending_gross,
                COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped') THEN oi.commission_amount ELSE 0 END), 0)                AS pending_commission,
                COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped') THEN oi.line_total - oi.commission_amount ELSE 0 END), 0) AS pending_net,

                COALESCE(SUM(oi.line_total), 0)                        AS total_gross,
                COALESCE(SUM(oi.commission_amount), 0)                 AS total_commission,
                COALESCE(SUM(oi.line_total - oi.commission_amount), 0) AS total_net
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.vendor_id = ?
               AND o.status IN ('paid', 'shipped', 'delivered')`,
            [vendor.id]
        );

        const [countRows] = await pool.query(
            `SELECT
                SUM(o.status = 'delivered') AS delivered_count,
                SUM(o.status IN ('paid', 'shipped')) AS pending_count
             FROM orders o
             WHERE o.vendor_id = ?
               AND o.status IN ('paid', 'shipped', 'delivered')`,
            [vendor.id]
        );

        const [paidRows] = await pool.query(
            `SELECT
                COALESCE(SUM(amount), 0) AS total_paid,
                MAX(paid_at)             AS last_paid_at
             FROM payouts
             WHERE vendor_id = ?`,
            [vendor.id]
        );

        const [payouts] = await pool.query(
            `SELECT id, amount, period_start, period_end, method,
                    reference, note, paid_at
             FROM payouts
             WHERE vendor_id = ?
             ORDER BY paid_at DESC`,
            [vendor.id]
        );

        const totalNet = Number(salesRows[0].total_net);
        const deliveredNet = Number(salesRows[0].delivered_net);
        const totalPaid = Number(paidRows[0].total_paid);

        res.json({
            vendor: {
                id: vendor.id,
                business_name: vendor.business_name,
            },
            summary: {
                total_gross:      salesRows[0].total_gross,
                total_commission: salesRows[0].total_commission,
                total_net:        salesRows[0].total_net,

                delivered_gross:      salesRows[0].delivered_gross,
                delivered_commission: salesRows[0].delivered_commission,
                delivered_net:        salesRows[0].delivered_net,

                pending_gross:      salesRows[0].pending_gross,
                pending_commission: salesRows[0].pending_commission,
                pending_net:        salesRows[0].pending_net,

                delivered_count: Number(countRows[0].delivered_count) || 0,
                pending_count:   Number(countRows[0].pending_count)   || 0,

                total_paid:   paidRows[0].total_paid,
                last_paid_at: paidRows[0].last_paid_at,

                payable_now: Math.max(0, deliveredNet - totalPaid).toFixed(2),
                amount_owed: (totalNet - totalPaid).toFixed(2),
            },
            count: payouts.length,
            payouts,
        });
    } catch (err) {
        console.error('Vendor payouts error:', err);
        res.status(500).json({ error: 'Failed to load payouts' });
    }
});

// ----------------------------------------------------------------
// GET /vendors/me
// ----------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
    try {
        const [vRows] = await pool.query(
            `SELECT
                v.*,
                u.full_name AS owner_name,
                u.email     AS owner_email
             FROM vendors v
             JOIN users u ON u.id = v.owner_user_id
             WHERE v.owner_user_id = ?
             LIMIT 1`,
            [req.user.id]
        );

        if (vRows.length === 0) {
            return res.status(404).json({
                error: 'You have not applied to be a vendor yet'
            });
        }

        const vendor = vRows[0];

        const [docs] = await pool.query(
            `SELECT id, doc_type, file_url, status,
                    rejection_reason, reviewed_at, created_at
             FROM vendor_documents
             WHERE vendor_id = ?
             ORDER BY created_at DESC`,
            [vendor.id]
        );
        vendor.documents = docs;

        res.json({ vendor });
    } catch (err) {
        console.error('Vendor me error:', err);
        res.status(500).json({ error: 'Failed to fetch vendor info' });
    }
});

// ----------------------------------------------------------------
// PATCH /vendors/me — update the vendor's own settings
// Body: { default_shipping_usd? }
// ----------------------------------------------------------------
router.patch('/me', requireAuth, async (req, res) => {
    try {
        const [vRows] = await pool.query(
            'SELECT id FROM vendors WHERE owner_user_id = ? LIMIT 1',
            [req.user.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'You are not a vendor' });
        }
        const vendorId = vRows[0].id;

        const allowed = ['default_shipping_usd'];
        const updates = [];
        const values = [];

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                const n = Number(req.body[field]);
                if (isNaN(n) || n < 0) {
                    return res.status(400).json({
                        error: `${field} must be a number >= 0`
                    });
                }
                updates.push(`${field} = ?`);
                values.push(n);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        values.push(vendorId);
        await pool.query(
            `UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [rows] = await pool.query(
            `SELECT id, business_name, default_shipping_usd
             FROM vendors WHERE id = ?`,
            [vendorId]
        );

        res.json({
            message: 'Vendor settings updated',
            vendor: rows[0]
        });
    } catch (err) {
        console.error('Vendor settings update error:', err);
        res.status(500).json({ error: 'Failed to update vendor settings' });
    }
});

module.exports = { router };