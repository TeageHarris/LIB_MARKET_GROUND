// src/orders.js
// Order creation, listing, payment confirmation, fulfillment

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
// Helper: generate a unique order_number like LMG-YYMMDD-0001
// ----------------------------------------------------------------
async function generateOrderNumber(conn) {
    const prefix = 'LMG-' +
        new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-';
    const [rows] = await conn.query(
        `SELECT order_number FROM orders
         WHERE order_number LIKE ?
         ORDER BY order_number DESC LIMIT 1`,
        [prefix + '%']
    );
    let next = 1;
    if (rows.length > 0) {
        const last = rows[0].order_number;
        const parts = last.split('-');
        const lastNum = parseInt(parts[2], 10);
        if (!isNaN(lastNum)) next = lastNum + 1;
    }
    return prefix + String(next).padStart(4, '0');
}

// ================================================================
// BUYER ROUTES
// ================================================================

// ----------------------------------------------------------------
// POST /orders — create order from current cart
// Body: { shipping_address_id, buyer_note? }
// ----------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const userId = req.user.id;
        const { shipping_address_id, buyer_note } = req.body;

        if (!shipping_address_id) {
            return res.status(400).json({ error: 'shipping_address_id is required' });
        }

        const [addrRows] = await conn.query(
            'SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
            [shipping_address_id, userId]
        );
        if (addrRows.length === 0) {
            return res.status(404).json({ error: 'Shipping address not found' });
        }

        const [cartRows] = await conn.query(
            'SELECT * FROM carts WHERE user_id = ? LIMIT 1', [userId]
        );
        if (cartRows.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        const cart = cartRows[0];

        const [items] = await conn.query(
            `SELECT
                ci.id, ci.product_id, ci.vendor_id, ci.quantity, ci.unit_price_snapshot,
                p.title, p.status AS product_status,
                (SELECT url FROM product_images pi
                 WHERE pi.product_id = p.id AND pi.is_primary = 1
                 LIMIT 1) AS primary_image,
                i.quantity_available AS stock,
                v.commission_rate
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             JOIN vendors  v ON v.id = ci.vendor_id
             LEFT JOIN inventory i ON i.product_id = p.id
             WHERE ci.cart_id = ?`,
            [cart.id]
        );

        if (items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        for (const it of items) {
            if (it.product_status !== 'active') {
                return res.status(400).json({
                    error: `"${it.title}" is no longer available`
                });
            }
            const stock = it.stock || 0;
            if (it.quantity > stock) {
                return res.status(400).json({
                    error: `"${it.title}" only has ${stock} in stock`
                });
            }
        }

        const subtotal = items.reduce(
            (s, it) => s + parseFloat(it.unit_price_snapshot) * it.quantity, 0
        );
        const shippingTotal = 0;
        const taxTotal = 0;
        const grandTotal = subtotal + shippingTotal + taxTotal;
        const currency = cart.currency_code || 'USD';
        const vendorId = cart.vendor_id;
        const commissionRate = parseFloat(items[0].commission_rate) || 0.10;

        await conn.beginTransaction();

        const orderNumber = await generateOrderNumber(conn);

        const [orderResult] = await conn.query(
            `INSERT INTO orders
             (order_number, buyer_user_id, vendor_id, status, currency_code,
              subtotal, shipping_total, tax_total, discount_total,
              grand_total, grand_total_usd,
              shipping_address_id, buyer_note)
             VALUES (?, ?, ?, 'pending_payment', ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
            [
                orderNumber,
                userId, vendorId, currency,
                subtotal.toFixed(2), shippingTotal.toFixed(2), taxTotal.toFixed(2),
                grandTotal.toFixed(2), grandTotal.toFixed(2),
                shipping_address_id, buyer_note || null
            ]
        );
        const orderId = orderResult.insertId;

        for (const it of items) {
            const lineTotal = parseFloat(it.unit_price_snapshot) * it.quantity;
            const commission = lineTotal * commissionRate;

            await conn.query(
                `INSERT INTO order_items
                 (order_id, product_id, vendor_id, title_snapshot, image_snapshot,
                  unit_price, quantity, line_total, commission_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId, it.product_id, it.vendor_id,
                    it.title, it.primary_image,
                    it.unit_price_snapshot, it.quantity,
                    lineTotal.toFixed(2), commission.toFixed(2)
                ]
            );

            await conn.query(
                `UPDATE inventory
                 SET quantity_reserved = quantity_reserved + ?
                 WHERE product_id = ?`,
                [it.quantity, it.product_id]
            );
        }

        await conn.query(
            `INSERT INTO payments (order_id, provider, amount, currency_code, amount_usd, status)
             VALUES (?, 'mtn_momo', ?, ?, ?, 'pending')`,
            [orderId, grandTotal.toFixed(2), currency, grandTotal.toFixed(2)]
        );

        await conn.query('DELETE FROM cart_items WHERE cart_id = ?', [cart.id]);
        await conn.query('UPDATE carts SET vendor_id = NULL WHERE id = ?', [cart.id]);

        await conn.commit();

        res.status(201).json({
            message: 'Order placed. Awaiting payment confirmation.',
            order_id: orderId,
            order_number: orderNumber,
            grand_total: grandTotal.toFixed(2),
            currency
        });
    } catch (err) {
        await conn.rollback();
        console.error('Create order error:', err);
        res.status(500).json({ error: 'Failed to place order' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// GET /orders — buyer's own orders
// ----------------------------------------------------------------
router.get('/', requireAuth, async (req, res) => {
    try {
        const [orders] = await pool.query(
            `SELECT
                o.id, o.order_number, o.status, o.currency_code,
                o.subtotal, o.grand_total, o.placed_at, o.delivered_at,
                v.business_name AS vendor_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                (SELECT title_snapshot FROM order_items oi WHERE oi.order_id = o.id LIMIT 1) AS first_item_title,
                (SELECT status FROM payments p WHERE p.order_id = o.id LIMIT 1) AS payment_status
             FROM orders o
             JOIN vendors v ON v.id = o.vendor_id
             WHERE o.buyer_user_id = ?
             ORDER BY o.placed_at DESC`,
            [req.user.id]
        );
        res.json({ count: orders.length, orders });
    } catch (err) {
        console.error('List orders error:', err);
        res.status(500).json({ error: 'Failed to list orders' });
    }
});

// ----------------------------------------------------------------
// GET /orders/:id — single order (buyer OR vendor OR admin)
// ----------------------------------------------------------------
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const [orderRows] = await pool.query(
            `SELECT
                o.*,
                v.business_name AS vendor_name,
                v.slug          AS vendor_slug,
                a.recipient_name, a.phone AS shipping_phone,
                a.country, a.county, a.city, a.line1, a.line2, a.postal_code
             FROM orders o
             JOIN vendors v ON v.id = o.vendor_id
             JOIN addresses a ON a.id = o.shipping_address_id
             WHERE o.id = ? LIMIT 1`,
            [req.params.id]
        );
        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRows[0];

        const isBuyer = order.buyer_user_id === req.user.id;
        let isVendor = false;
        if (!isBuyer) {
            const [v] = await pool.query(
                'SELECT id FROM vendors WHERE id = ? AND owner_user_id = ? LIMIT 1',
                [order.vendor_id, req.user.id]
            );
            isVendor = v.length > 0;
        }
        if (!isBuyer && !isVendor && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to view this order' });
        }

        const [items] = await pool.query(
            `SELECT id, product_id, title_snapshot, image_snapshot,
                    unit_price, quantity, line_total, commission_amount
             FROM order_items WHERE order_id = ?`,
            [order.id]
        );
        order.items = items;

        const [payments] = await pool.query(
            `SELECT id, provider, provider_reference, amount, currency_code,
                    status, paid_at, failure_reason
             FROM payments WHERE order_id = ? ORDER BY created_at DESC`,
            [order.id]
        );
        order.payments = payments;

        res.json({ order });
    } catch (err) {
        console.error('Get order error:', err);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// ----------------------------------------------------------------
// POST /orders/:id/pay — simulate payment confirmation
// ----------------------------------------------------------------
router.post('/:id/pay', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { provider_reference, provider } = req.body;

        const [orderRows] = await conn.query(
            'SELECT * FROM orders WHERE id = ? AND buyer_user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (orderRows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orderRows[0];
        if (order.status !== 'pending_payment') {
            return res.status(400).json({ error: `Order is ${order.status}, cannot pay` });
        }

        await conn.beginTransaction();

        await conn.query(
            `UPDATE payments
             SET status = 'confirmed',
                 provider = COALESCE(?, provider),
                 provider_reference = COALESCE(?, provider_reference),
                 confirmed_by = ?,
                 paid_at = NOW()
             WHERE order_id = ? AND status = 'pending'`,
            [provider || null, provider_reference || null, req.user.id, order.id]
        );

        await conn.query(
            `UPDATE orders SET status = 'paid' WHERE id = ?`, [order.id]
        );

        await conn.query(
            `UPDATE inventory i
             JOIN order_items oi ON oi.product_id = i.product_id
             SET i.quantity_available = i.quantity_available - oi.quantity,
                 i.quantity_reserved  = i.quantity_reserved  - oi.quantity
             WHERE oi.order_id = ?`,
            [order.id]
        );

        await conn.commit();

        const [final] = await conn.query(
            'SELECT id, order_number, status FROM orders WHERE id = ?', [order.id]
        );
        res.json({ message: 'Payment confirmed', order: final[0] });
    } catch (err) {
        await conn.rollback();
        console.error('Pay order error:', err);
        res.status(500).json({ error: 'Failed to confirm payment' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// POST /orders/:id/confirm-delivery — buyer marks delivered
// ----------------------------------------------------------------
router.post('/:id/confirm-delivery', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, status FROM orders
             WHERE id = ? AND buyer_user_id = ? LIMIT 1`,
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });

        const order = rows[0];
        if (order.status !== 'shipped') {
            return res.status(400).json({
                error: `Order is ${order.status}, cannot confirm delivery`
            });
        }

        await pool.query(
            `UPDATE orders SET status = 'delivered', delivered_at = NOW() WHERE id = ?`,
            [order.id]
        );
        res.json({ message: 'Delivery confirmed' });
    } catch (err) {
        console.error('Confirm delivery error:', err);
        res.status(500).json({ error: 'Failed to confirm delivery' });
    }
});

// ================================================================
// VENDOR ROUTES
// ================================================================

router.get('/vendor/mine', requireAuth, async (req, res) => {
    try {
        const vendor = await getVendorForUser(req.user.id);
        if (!vendor) return res.status(403).json({ error: 'You are not a vendor' });

        const [orders] = await pool.query(
            `SELECT
                o.id, o.order_number, o.status, o.currency_code,
                o.subtotal, o.grand_total, o.placed_at, o.delivered_at,
                u.full_name AS buyer_name,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                (SELECT status FROM payments p WHERE p.order_id = o.id LIMIT 1) AS payment_status
             FROM orders o
             JOIN users u ON u.id = o.buyer_user_id
             WHERE o.vendor_id = ?
             ORDER BY o.placed_at DESC`,
            [vendor.id]
        );
        res.json({ count: orders.length, orders });
    } catch (err) {
        console.error('Vendor orders error:', err);
        res.status(500).json({ error: 'Failed to list vendor orders' });
    }
});

router.post('/vendor/:id/ship', requireAuth, async (req, res) => {
    try {
        const vendor = await getVendorForUser(req.user.id);
        if (!vendor) return res.status(403).json({ error: 'You are not a vendor' });

        const [rows] = await pool.query(
            `SELECT id, status FROM orders
             WHERE id = ? AND vendor_id = ? LIMIT 1`,
            [req.params.id, vendor.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });

        const order = rows[0];
        if (order.status !== 'paid') {
            return res.status(400).json({
                error: `Order is ${order.status}, must be 'paid' before shipping`
            });
        }

        await pool.query(
            `UPDATE orders SET status = 'shipped' WHERE id = ?`, [order.id]
        );
        res.json({ message: 'Order marked as shipped' });
    } catch (err) {
        console.error('Ship order error:', err);
        res.status(500).json({ error: 'Failed to mark shipped' });
    }
});

module.exports = { router };