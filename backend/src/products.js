// src/products.js
// Vendor product CRUD routes
// Public read-only product routes live in server.js

const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ----------------------------------------------------------------
// Helper: fetch the vendor record owned by a user
// ----------------------------------------------------------------
async function getVendorForUser(userId) {
    const [rows] = await pool.query(
        `SELECT id, business_name, verification_status
         FROM vendors WHERE owner_user_id = ? LIMIT 1`,
        [userId]
    );
    return rows.length > 0 ? rows[0] : null;
}

// ----------------------------------------------------------------
// Middleware: user must own an APPROVED vendor
// ----------------------------------------------------------------
async function requireApprovedVendor(req, res, next) {
    try {
        const vendor = await getVendorForUser(req.user.id);
        if (!vendor) {
            return res.status(403).json({ error: 'You are not a registered vendor' });
        }
        if (vendor.verification_status !== 'approved') {
            return res.status(403).json({
                error: 'Your vendor account is not approved yet',
                verification_status: vendor.verification_status
            });
        }
        req.vendor = vendor;
        next();
    } catch (err) {
        console.error('requireApprovedVendor error:', err);
        res.status(500).json({ error: 'Failed to verify vendor status' });
    }
}

// ----------------------------------------------------------------
// Helpers: slug generation
// ----------------------------------------------------------------
function slugify(text) {
    return text.toString().toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

async function uniqueProductSlug(base) {
    let slug = base;
    let n = 1;
    while (true) {
        const [rows] = await pool.query(
            'SELECT id FROM products WHERE slug = ? LIMIT 1', [slug]
        );
        if (rows.length === 0) return slug;
        n++;
        slug = `${base}-${n}`;
    }
}

// ----------------------------------------------------------------
// POST /products — create a new product (starts as draft)
// ----------------------------------------------------------------
router.post('/', requireAuth, requireApprovedVendor, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const vendorId = req.vendor.id;
        const {
            title, description, base_price, shipping_fee_usd, category_id, brand,
            condition_type, weight_grams, length_cm, width_cm, height_cm,
            is_handmade, is_digital, currency_code, initial_stock
        } = req.body;

        if (!title || base_price === undefined || base_price === null) {
            return res.status(400).json({ error: 'title and base_price are required' });
        }
        const price = Number(base_price);
        if (isNaN(price) || price < 0) {
            return res.status(400).json({ error: 'base_price must be a valid positive number' });
        }

        // Optional per-product shipping fee override
        let shippingFee = 0;
        if (shipping_fee_usd !== undefined && shipping_fee_usd !== null && shipping_fee_usd !== '') {
            const fee = Number(shipping_fee_usd);
            if (isNaN(fee) || fee < 0) {
                return res.status(400).json({ error: 'shipping_fee_usd must be >= 0' });
            }
            shippingFee = fee;
        }

        const slug = await uniqueProductSlug(slugify(title));

        await conn.beginTransaction();

        const [result] = await conn.query(
            `INSERT INTO products (
                vendor_id, category_id, title, slug, description, brand,
                condition_type, status, base_price, shipping_fee_usd, currency_code,
                weight_grams, length_cm, width_cm, height_cm,
                is_handmade, is_digital, origin_country
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LR')`,
            [
                vendorId,
                category_id || null,
                title, slug, description || null, brand || null,
                condition_type || 'new',
                price,
                shippingFee,
                currency_code || 'USD',
                weight_grams || null,
                length_cm || null, width_cm || null, height_cm || null,
                is_handmade ? 1 : 0,
                is_digital ? 1 : 0
            ]
        );

        const productId = result.insertId;

        await conn.query(
            `INSERT INTO inventory (product_id, quantity_available)
             VALUES (?, ?)`,
            [productId, Number(initial_stock) || 0]
        );

        await conn.commit();

        const [rows] = await pool.query(
            'SELECT * FROM products WHERE id = ?', [productId]
        );

        res.status(201).json({
            message: 'Product created as draft. Publish it when ready.',
            product: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Create product error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// PATCH /products/:id — edit fields, or set status (draft/active/archived)
// ----------------------------------------------------------------
router.patch('/:id', requireAuth, requireApprovedVendor, async (req, res) => {
    try {
        const productId = req.params.id;
        const vendorId = req.vendor.id;

        const [rows] = await pool.query(
            'SELECT * FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [productId, vendorId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not yours' });
        }

        const allowed = [
            'title', 'description', 'base_price', 'shipping_fee_usd', 'category_id', 'brand',
            'condition_type', 'status', 'weight_grams',
            'length_cm', 'width_cm', 'height_cm',
            'is_handmade', 'is_digital', 'currency_code'
        ];
        const updates = [];
        const values = [];

        for (const field of allowed) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                let v = req.body[field];
                if (field === 'is_handmade' || field === 'is_digital') v = v ? 1 : 0;
                values.push(v);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // If publishing (status -> active), stamp published_at
        if (req.body.status === 'active') {
            updates.push('published_at = COALESCE(published_at, NOW())');
        }

        values.push(productId, vendorId);

        await pool.query(
            `UPDATE products SET ${updates.join(', ')}
             WHERE id = ? AND vendor_id = ?`,
            values
        );

        const [updated] = await pool.query(
            'SELECT * FROM products WHERE id = ?', [productId]
        );
        res.json({ message: 'Product updated', product: updated[0] });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// ----------------------------------------------------------------
// DELETE /products/:id — soft-delete (archive)
// ----------------------------------------------------------------
router.delete('/:id', requireAuth, requireApprovedVendor, async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [req.params.id, req.vendor.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not yours' });
        }
        await pool.query(
            `UPDATE products SET status = 'archived' WHERE id = ?`,
            [req.params.id]
        );
        res.json({ message: 'Product archived' });
    } catch (err) {
        console.error('Archive product error:', err);
        res.status(500).json({ error: 'Failed to archive product' });
    }
});

// ----------------------------------------------------------------
// POST /products/:id/images — add an image URL
// Body: { url, alt_text?, is_primary? }
// ----------------------------------------------------------------
router.post('/:id/images', requireAuth, requireApprovedVendor, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { url, alt_text, is_primary } = req.body;
        if (!url) return res.status(400).json({ error: 'url is required' });

        const [rows] = await conn.query(
            'SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [req.params.id, req.vendor.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not yours' });
        }
        const productId = rows[0].id;

        await conn.beginTransaction();

        if (is_primary) {
            await conn.query(
                'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
                [productId]
            );
        }

        const [result] = await conn.query(
            `INSERT INTO product_images (product_id, url, alt_text, is_primary)
             VALUES (?, ?, ?, ?)`,
            [productId, url, alt_text || null, is_primary ? 1 : 0]
        );

        await conn.commit();

        const [img] = await conn.query(
            'SELECT * FROM product_images WHERE id = ?', [result.insertId]
        );
        res.status(201).json({ message: 'Image added', image: img[0] });
    } catch (err) {
        await conn.rollback();
        console.error('Add image error:', err);
        res.status(500).json({ error: 'Failed to add image' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// DELETE /products/:id/images/:imageId — remove an image
// ----------------------------------------------------------------
router.delete('/:id/images/:imageId', requireAuth, requireApprovedVendor, async (req, res) => {
    try {
        const { id: productId, imageId } = req.params;

        const [rows] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [productId, req.vendor.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not yours' });
        }

        const [imgRows] = await pool.query(
            'SELECT id, is_primary FROM product_images WHERE id = ? AND product_id = ? LIMIT 1',
            [imageId, productId]
        );
        if (imgRows.length === 0) {
            return res.status(404).json({ error: 'Image not found' });
        }

        await pool.query('DELETE FROM product_images WHERE id = ?', [imageId]);

        if (imgRows[0].is_primary) {
            const [remaining] = await pool.query(
                'SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1',
                [productId]
            );
            if (remaining.length > 0) {
                await pool.query(
                    'UPDATE product_images SET is_primary = 1 WHERE id = ?',
                    [remaining[0].id]
                );
            }
        }

        res.json({ message: 'Image removed' });
    } catch (err) {
        console.error('Delete image error:', err);
        res.status(500).json({ error: 'Failed to remove image' });
    }
});

// ----------------------------------------------------------------
// PATCH /products/:id/inventory — update stock
// Body: { quantity_available, low_stock_threshold? }
// ----------------------------------------------------------------
router.patch('/:id/inventory', requireAuth, requireApprovedVendor, async (req, res) => {
    try {
        const { quantity_available, low_stock_threshold } = req.body;
        if (quantity_available === undefined) {
            return res.status(400).json({ error: 'quantity_available is required' });
        }
        const qty = Number(quantity_available);
        if (isNaN(qty) || qty < 0) {
            return res.status(400).json({ error: 'quantity_available must be >= 0' });
        }

        const [rows] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [req.params.id, req.vendor.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found or not yours' });
        }

        if (low_stock_threshold !== undefined) {
            await pool.query(
                `UPDATE inventory
                 SET quantity_available = ?, low_stock_threshold = ?
                 WHERE product_id = ?`,
                [qty, Number(low_stock_threshold), req.params.id]
            );
        } else {
            await pool.query(
                `UPDATE inventory SET quantity_available = ? WHERE product_id = ?`,
                [qty, req.params.id]
            );
        }

        const [inv] = await pool.query(
            'SELECT * FROM inventory WHERE product_id = ?', [req.params.id]
        );
        res.json({ message: 'Inventory updated', inventory: inv[0] });
    } catch (err) {
        console.error('Update inventory error:', err);
        res.status(500).json({ error: 'Failed to update inventory' });
    }
});

module.exports = { router };