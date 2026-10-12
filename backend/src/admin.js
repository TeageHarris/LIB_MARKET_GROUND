// src/admin.js
// Admin-only routes: approve/reject/suspend/reinstate vendors,
// view all orders across the platform, mark orders paid, record vendor payouts.

const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireAdmin } = require('./auth');
const { expireStaleOrders } = require('./expireOrders');

const router = express.Router();

// Every route below requires a valid JWT + admin role
router.use(requireAuth, requireAdmin);

// ================================================================
// VENDOR ROUTES
// ================================================================

// ----------------------------------------------------------------
// GET /admin/vendors?status=pending
// ----------------------------------------------------------------
router.get('/vendors', async (req, res) => {
    try {
        const { status } = req.query;
        const allowed = ['pending', 'approved', 'rejected', 'suspended'];

        let sql = `
            SELECT
                v.id, v.business_name, v.slug, v.email, v.phone,
                v.county, v.city, v.verification_status,
                v.created_at, v.approved_at,
                u.id           AS owner_id,
                u.full_name    AS owner_name,
                u.email        AS owner_email,
                (SELECT COUNT(*) FROM vendor_documents d
                 WHERE d.vendor_id = v.id) AS document_count
            FROM vendors v
            JOIN users u ON u.id = v.owner_user_id
        `;
        const params = [];

        if (status && allowed.includes(status)) {
            sql += ' WHERE v.verification_status = ?';
            params.push(status);
        }
        sql += ' ORDER BY v.created_at DESC';

        const [rows] = await pool.query(sql, params);
        res.json({ count: rows.length, vendors: rows });
    } catch (err) {
        console.error('Admin vendors list error:', err);
        res.status(500).json({ error: 'Failed to list vendors' });
    }
});

// ----------------------------------------------------------------
// GET /admin/vendors/:id
// ----------------------------------------------------------------
router.get('/vendors/:id', async (req, res) => {
    try {
        const [vRows] = await pool.query(
            `SELECT v.*,
                    u.full_name AS owner_name,
                    u.email     AS owner_email,
                    u.phone     AS owner_phone
             FROM vendors v
             JOIN users u ON u.id = v.owner_user_id
             WHERE v.id = ?
             LIMIT 1`,
            [req.params.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        const [docs] = await pool.query(
            'SELECT * FROM vendor_documents WHERE vendor_id = ? ORDER BY created_at DESC',
            [vendor.id]
        );
        vendor.documents = docs;

        res.json({ vendor });
    } catch (err) {
        console.error('Admin vendor detail error:', err);
        res.status(500).json({ error: 'Failed to fetch vendor' });
    }
});

// ----------------------------------------------------------------
// POST /admin/vendors/:id/approve
// ----------------------------------------------------------------
router.post('/vendors/:id/approve', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [vRows] = await conn.query(
            'SELECT id, owner_user_id FROM vendors WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (vRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        await conn.query(
            `UPDATE vendors
             SET verification_status = 'approved', approved_at = NOW()
             WHERE id = ?`,
            [vendor.id]
        );

        await conn.query(
            `UPDATE users SET role = 'vendor_owner'
             WHERE id = ? AND role != 'admin'`,
            [vendor.owner_user_id]
        );

        await conn.query(
            `UPDATE vendor_documents
             SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
             WHERE vendor_id = ? AND status = 'pending'`,
            [req.user.id, vendor.id]
        );

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM vendors WHERE id = ?', [vendor.id]
        );
        res.json({ message: 'Vendor approved', vendor: rows[0] });
    } catch (err) {
        await conn.rollback();
        console.error('Approve error:', err);
        res.status(500).json({ error: 'Failed to approve vendor' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// POST /admin/vendors/:id/reject
// Body: { reason }
// ----------------------------------------------------------------
router.post('/vendors/:id/reject', async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
        return res.status(400).json({ error: 'A rejection reason is required' });
    }

    try {
        const [vRows] = await pool.query(
            'SELECT id FROM vendors WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendorId = vRows[0].id;

        await pool.query(
            `UPDATE vendors SET verification_status = 'rejected' WHERE id = ?`,
            [vendorId]
        );

        await pool.query(
            `UPDATE vendor_documents
             SET status = 'rejected', rejection_reason = ?,
                 reviewed_by = ?, reviewed_at = NOW()
             WHERE vendor_id = ?`,
            [reason, req.user.id, vendorId]
        );

        res.json({ message: 'Vendor rejected', reason });
    } catch (err) {
        console.error('Reject error:', err);
        res.status(500).json({ error: 'Failed to reject vendor' });
    }
});

// ----------------------------------------------------------------
// POST /admin/vendors/:id/suspend
// Body: { reason? }
// ----------------------------------------------------------------
router.post('/vendors/:id/suspend', async (req, res) => {
    const { reason } = req.body || {};
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [vRows] = await conn.query(
            'SELECT id, owner_user_id, business_name FROM vendors WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (vRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        await conn.query(
            `UPDATE vendors SET verification_status = 'suspended' WHERE id = ?`,
            [vendor.id]
        );

        await conn.query(
            `UPDATE products SET status = 'archived'
             WHERE vendor_id = ? AND status != 'archived'`,
            [vendor.id]
        );

        await conn.query(
            `UPDATE users SET role = 'buyer'
             WHERE id = ? AND role = 'vendor_owner'`,
            [vendor.owner_user_id]
        );

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM vendors WHERE id = ?', [vendor.id]
        );
        res.json({
            message: `Vendor "${vendor.business_name}" suspended`,
            reason: reason || null,
            vendor: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Suspend error:', err);
        res.status(500).json({ error: 'Failed to suspend vendor' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// POST /admin/vendors/:id/reinstate
// ----------------------------------------------------------------
router.post('/vendors/:id/reinstate', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [vRows] = await conn.query(
            'SELECT id, owner_user_id, business_name, verification_status FROM vendors WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (vRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        if (vendor.verification_status === 'approved') {
            await conn.rollback();
            return res.status(400).json({ error: 'Vendor is already approved' });
        }

        await conn.query(
            `UPDATE vendors
             SET verification_status = 'approved',
                 approved_at = COALESCE(approved_at, NOW())
             WHERE id = ?`,
            [vendor.id]
        );

        await conn.query(
            `UPDATE products SET status = 'active'
             WHERE vendor_id = ? AND status = 'archived'`,
            [vendor.id]
        );

        await conn.query(
            `UPDATE users SET role = 'vendor_owner'
             WHERE id = ? AND role = 'buyer'`,
            [vendor.owner_user_id]
        );

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM vendors WHERE id = ?', [vendor.id]
        );
        res.json({
            message: `Vendor "${vendor.business_name}" reinstated`,
            vendor: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Reinstate error:', err);
        res.status(500).json({ error: 'Failed to reinstate vendor' });
    } finally {
        conn.release();
    }
});

// ================================================================
// ORDER ROUTES
// ================================================================

// ----------------------------------------------------------------
// GET /admin/orders?status=...&search=...
// ----------------------------------------------------------------
router.get('/orders', async (req, res) => {
    try {
        const { status, search } = req.query;
        const allowed = ['pending_payment', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

        let sql = `
            SELECT
                o.id, o.order_number, o.status, o.currency_code,
                o.subtotal, o.grand_total, o.grand_total_usd,
                o.placed_at, o.delivered_at,
                u.full_name     AS buyer_name,
                u.email         AS buyer_email,
                v.business_name AS vendor_name,
                v.slug          AS vendor_slug,
                (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                (SELECT status   FROM payments p WHERE p.order_id = o.id LIMIT 1) AS payment_status,
                (SELECT provider FROM payments p WHERE p.order_id = o.id LIMIT 1) AS payment_provider
            FROM orders o
            JOIN users u   ON u.id = o.buyer_user_id
            JOIN vendors v ON v.id = o.vendor_id
        `;
        const params = [];
        const where = [];

        if (status && allowed.includes(status)) {
            where.push('o.status = ?');
            params.push(status);
        }
        if (search) {
            where.push('(o.order_number LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like, like);
        }
        if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
        sql += ' ORDER BY o.placed_at DESC LIMIT 200';

        const [rows] = await pool.query(sql, params);

        const [statsRows] = await pool.query(`
            SELECT
                COUNT(*) AS total,
                SUM(status = 'pending_payment') AS pending_payment,
                SUM(status IN ('paid','shipped','delivered')) AS paid,
                SUM(status = 'shipped')         AS shipped,
                SUM(status = 'delivered')       AS delivered,
                SUM(status = 'cancelled')       AS cancelled,
                SUM(status = 'refunded')        AS refunded,
                COALESCE(SUM(CASE
                    WHEN status IN ('paid','shipped','delivered')
                    THEN grand_total_usd ELSE 0 END), 0) AS gross_usd
            FROM orders
        `);

        res.json({ count: rows.length, stats: statsRows[0], orders: rows });
    } catch (err) {
        console.error('Admin orders list error:', err);
        res.status(500).json({ error: 'Failed to list orders' });
    }
});

// ----------------------------------------------------------------
// GET /admin/orders/:id
// ----------------------------------------------------------------
router.get('/orders/:id', async (req, res) => {
    try {
        const [oRows] = await pool.query(
            `SELECT
                o.*,
                u.id            AS buyer_id,
                u.full_name     AS buyer_name,
                u.email         AS buyer_email,
                u.phone         AS buyer_phone,
                v.id            AS vendor_id,
                v.business_name AS vendor_name,
                v.slug          AS vendor_slug,
                v.email         AS vendor_email,
                v.phone         AS vendor_phone,
                a.label             AS addr_label,
                a.recipient_name    AS addr_recipient,
                a.phone             AS addr_phone,
                a.country           AS addr_country,
                a.county            AS addr_county,
                a.city              AS addr_city,
                a.line1             AS addr_line1,
                a.line2             AS addr_line2,
                a.postal_code       AS addr_postal_code
             FROM orders o
             JOIN users u   ON u.id = o.buyer_user_id
             JOIN vendors v ON v.id = o.vendor_id
             LEFT JOIN addresses a ON a.id = o.shipping_address_id
             WHERE o.id = ?
             LIMIT 1`,
            [req.params.id]
        );
        if (oRows.length === 0) return res.status(404).json({ error: 'Order not found' });
        const order = oRows[0];

        const [items] = await pool.query(
            `SELECT id, product_id, vendor_id, title_snapshot, image_snapshot,
                    unit_price, quantity, line_total, commission_amount, created_at
             FROM order_items WHERE order_id = ?`,
            [order.id]
        );
        order.items = items;

        const [payments] = await pool.query(
            `SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC`,
            [order.id]
        );
        order.payments = payments;

        const [refunds] = await pool.query(
            `SELECT r.*, u.full_name AS created_by_name
             FROM refunds r
             LEFT JOIN users u ON u.id = r.created_by
             WHERE r.order_id = ?
             ORDER BY r.created_at DESC`,
            [order.id]
        );
        order.refunds = refunds;

        res.json({ order });
    } catch (err) {
        console.error('Admin order detail error:', err);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// ----------------------------------------------------------------
// POST /admin/orders/:id/mark-paid
// Body: { reference? }
// ----------------------------------------------------------------
router.post('/orders/:id/mark-paid', async (req, res) => {
    const { reference } = req.body || {};
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [oRows] = await conn.query(
            'SELECT id, order_number, status, grand_total_usd, currency_code FROM orders WHERE id = ? LIMIT 1',
            [req.params.id]
        );
        if (oRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = oRows[0];

        if (order.status === 'paid') {
            await conn.rollback();
            return res.status(400).json({ error: 'Order is already paid' });
        }
        if (order.status !== 'pending_payment') {
            await conn.rollback();
            return res.status(400).json({
                error: `Cannot mark ${order.status} orders as paid`
            });
        }

        await conn.query(
            `UPDATE orders SET status = 'paid' WHERE id = ?`,
            [order.id]
        );

        const [updateResult] = await conn.query(
            `UPDATE payments
             SET provider = 'manual',
                 provider_reference = ?,
                 status = 'confirmed',
                 paid_at = NOW(),
                 confirmed_by = ?
             WHERE order_id = ? AND status = 'pending'`,
            [
                reference || `MANUAL-${order.order_number}`,
                req.user.id,
                order.id
            ]
        );

        if (updateResult.affectedRows === 0) {
            await conn.query(
                `INSERT INTO payments
                    (order_id, provider, provider_reference, amount,
                     currency_code, amount_usd, status, paid_at, confirmed_by)
                 VALUES (?, 'manual', ?, ?, ?, ?, 'confirmed', NOW(), ?)`,
                [
                    order.id,
                    reference || `MANUAL-${order.order_number}`,
                    order.grand_total_usd,
                    order.currency_code,
                    order.grand_total_usd,
                    req.user.id
                ]
            );
        }

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM orders WHERE id = ?', [order.id]
        );
        res.json({
            message: `Order ${order.order_number} marked as paid`,
            order: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Mark paid error:', err);
        res.status(500).json({ error: 'Failed to mark order as paid' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// POST /admin/orders/:id/refund
// Body: { amount, fee?, reason, note? }
//
// Full or partial refund. Sets order status to 'refunded' and
// records a refund row. Refunded orders drop out of vendor payouts.
// ----------------------------------------------------------------
router.post('/orders/:id/refund', async (req, res) => {
    const { amount, fee, reason, note } = req.body || {};

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
        return res.status(400).json({ error: 'A valid amount is required' });
    }
    if (!reason) {
        return res.status(400).json({ error: 'A reason is required' });
    }
    const numFee = fee !== undefined && fee !== null ? Number(fee) : 0;
    if (isNaN(numFee) || numFee < 0) {
        return res.status(400).json({ error: 'Fee must be a number >= 0' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [oRows] = await conn.query(
            `SELECT id, order_number, status, vendor_id, grand_total_usd, currency_code
             FROM orders WHERE id = ? LIMIT 1`,
            [req.params.id]
        );
        if (oRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = oRows[0];

        const refundable = ['paid', 'shipped', 'delivered'];
        if (!refundable.includes(order.status)) {
            await conn.rollback();
            return res.status(400).json({
                error: `Cannot refund ${order.status} orders. Only paid, shipped, or delivered orders can be refunded.`
            });
        }

        if (numAmount > Number(order.grand_total_usd)) {
            await conn.rollback();
            return res.status(400).json({
                error: `Refund amount cannot exceed order total ($${Number(order.grand_total_usd).toFixed(2)})`
            });
        }

        const [insert] = await conn.query(
            `INSERT INTO refunds
                (order_id, vendor_id, amount, fee, currency_code, reason, note, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                order.id,
                order.vendor_id,
                numAmount.toFixed(2),
                numFee.toFixed(2),
                order.currency_code,
                reason,
                note || null,
                req.user.id
            ]
        );

        await conn.query(
            `UPDATE orders SET status = 'refunded' WHERE id = ?`,
            [order.id]
        );

        await conn.query(
            `UPDATE payments SET status = 'refunded'
             WHERE order_id = ? AND status = 'confirmed'`,
            [order.id]
        );

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM refunds WHERE id = ?', [insert.insertId]
        );
        res.status(201).json({
            message: `Refunded $${numAmount.toFixed(2)} on ${order.order_number}`,
            refund: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Refund error:', err);
        res.status(500).json({ error: 'Failed to process refund' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// POST /admin/orders/expire-stale
// Body: { hours?: number }  (defaults to 48)
// ----------------------------------------------------------------
router.post('/orders/expire-stale', async (req, res) => {
    const hours = Number(req.body?.hours) || 48;
    try {
        const result = await expireStaleOrders(hours);
        res.json({
            message: result.expired === 0
                ? 'No stale orders to expire'
                : `Expired ${result.expired} order(s)`,
            expired: result.expired,
            order_ids: result.order_ids
        });
    } catch (err) {
        console.error('Expire stale orders error:', err);
        res.status(500).json({ error: 'Failed to expire stale orders' });
    }
});

// ================================================================
// PAYOUT ROUTES
// ================================================================

// ----------------------------------------------------------------
// GET /admin/payouts
//
// Payout policy: vendors are paid ONLY for orders the buyer has
// confirmed delivered. Refunded orders drop out of the sum.
// ----------------------------------------------------------------
router.get('/payouts', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                v.id,
                v.business_name,
                v.email,
                v.phone,
                v.county,
                v.city,
                v.verification_status,
                COALESCE(sales.total_gross, 0)        AS total_gross,
                COALESCE(sales.total_commission, 0)   AS total_commission,
                COALESCE(sales.total_net, 0)          AS total_net,
                COALESCE(paid.total_paid, 0)          AS total_paid,
                COALESCE(sales.total_net, 0) - COALESCE(paid.total_paid, 0) AS amount_owed,
                paid.last_paid_at
            FROM vendors v
            LEFT JOIN (
                SELECT
                    oi.vendor_id,
                    SUM(oi.line_total)                        AS total_gross,
                    SUM(oi.commission_amount)                 AS total_commission,
                    SUM(oi.line_total - oi.commission_amount) AS total_net
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status = 'delivered'
                GROUP BY oi.vendor_id
            ) sales ON sales.vendor_id = v.id
            LEFT JOIN (
                SELECT
                    vendor_id,
                    SUM(amount)  AS total_paid,
                    MAX(paid_at) AS last_paid_at
                FROM payouts
                GROUP BY vendor_id
            ) paid ON paid.vendor_id = v.id
            WHERE v.verification_status = 'approved'
            ORDER BY amount_owed DESC, v.business_name ASC
        `);

        const [summaryRows] = await pool.query(`
            SELECT
                COUNT(*) AS vendor_count,
                COALESCE(SUM(sales.total_net), 0) - COALESCE(SUM(paid.total_paid), 0) AS total_owed,
                COALESCE(SUM(paid.total_paid), 0) AS total_paid_all_time
            FROM vendors v
            LEFT JOIN (
                SELECT oi.vendor_id,
                       SUM(oi.line_total - oi.commission_amount) AS total_net
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.status = 'delivered'
                GROUP BY oi.vendor_id
            ) sales ON sales.vendor_id = v.id
            LEFT JOIN (
                SELECT vendor_id, SUM(amount) AS total_paid
                FROM payouts GROUP BY vendor_id
            ) paid ON paid.vendor_id = v.id
            WHERE v.verification_status = 'approved'
        `);

        res.json({
            count: rows.length,
            summary: summaryRows[0],
            vendors: rows
        });
    } catch (err) {
        console.error('Admin payouts list error:', err);
        res.status(500).json({ error: 'Failed to load payouts' });
    }
});

// ----------------------------------------------------------------
// GET /admin/payouts/:vendorId/history
// ----------------------------------------------------------------
router.get('/payouts/:vendorId/history', async (req, res) => {
    try {
        const [vRows] = await pool.query(
            `SELECT id, business_name, email, phone
             FROM vendors WHERE id = ? LIMIT 1`,
            [req.params.vendorId]
        );
        if (vRows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        const [payouts] = await pool.query(
            `SELECT p.*, u.full_name AS paid_by_name
             FROM payouts p
             LEFT JOIN users u ON u.id = p.paid_by
             WHERE p.vendor_id = ?
             ORDER BY p.paid_at DESC`,
            [vendor.id]
        );

        res.json({ vendor, count: payouts.length, payouts });
    } catch (err) {
        console.error('Payout history error:', err);
        res.status(500).json({ error: 'Failed to load payout history' });
    }
});

// ----------------------------------------------------------------
// POST /admin/payouts/:vendorId/pay
// Body: { amount, method?, reference?, note?, period_start?, period_end? }
// ----------------------------------------------------------------
router.post('/payouts/:vendorId/pay', async (req, res) => {
    const {
        amount,
        method,
        reference,
        note,
        period_start,
        period_end,
    } = req.body || {};

    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'A valid positive amount is required' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [vRows] = await conn.query(
            'SELECT id, business_name FROM vendors WHERE id = ? LIMIT 1',
            [req.params.vendorId]
        );
        if (vRows.length === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Vendor not found' });
        }
        const vendor = vRows[0];

        const [result] = await conn.query(
            `INSERT INTO payouts
                (vendor_id, amount, period_start, period_end,
                 method, reference, note, paid_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vendor.id,
                numAmount.toFixed(2),
                period_start || null,
                period_end || null,
                method || 'orange_money',
                reference || null,
                note || null,
                req.user.id
            ]
        );

        await conn.commit();

        const [rows] = await conn.query(
            'SELECT * FROM payouts WHERE id = ?', [result.insertId]
        );
        res.status(201).json({
            message: `Payout of $${numAmount.toFixed(2)} recorded for ${vendor.business_name}`,
            payout: rows[0]
        });
    } catch (err) {
        await conn.rollback();
        console.error('Record payout error:', err);
        res.status(500).json({ error: 'Failed to record payout' });
    } finally {
        conn.release();
    }
});

module.exports = { router };