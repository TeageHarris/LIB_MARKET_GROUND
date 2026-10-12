// src/expireOrders.js
// Auto-cancel orders stuck in pending_shipping_quote / pending_payment
// for too long. Releases reserved stock and fails pending payments.

const { pool } = require('./db');

/**
 * Cancel every order in pending_shipping_quote or pending_payment that
 * was placed more than `hours` hours ago.
 *
 * Returns: { expired: number, order_ids: number[] }
 */
async function expireStaleOrders(hours = 48) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [stale] = await conn.query(
            `SELECT id FROM orders
             WHERE status IN ('pending_shipping_quote', 'pending_payment')
               AND placed_at < NOW() - INTERVAL ? HOUR`,
            [hours]
        );

        if (stale.length === 0) {
            await conn.commit();
            return { expired: 0, order_ids: [] };
        }

        const ids = stale.map((r) => r.id);

        // 1. Release reserved stock
        await conn.query(
            `UPDATE inventory i
             JOIN order_items oi ON oi.product_id = i.product_id
             SET i.quantity_reserved = GREATEST(i.quantity_reserved - oi.quantity, 0)
             WHERE oi.order_id IN (?)`,
            [ids]
        );

        // 2. Fail any pending payment rows
        await conn.query(
            `UPDATE payments
             SET status = 'failed',
                 failure_reason = ?
             WHERE order_id IN (?) AND status = 'pending'`,
            [`Auto-cancelled: expired after ${hours}h`, ids]
        );

        // 3. Cancel the orders
        await conn.query(
            `UPDATE orders SET status = 'cancelled' WHERE id IN (?)`,
            [ids]
        );

        await conn.commit();
        return { expired: ids.length, order_ids: ids };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

module.exports = { expireStaleOrders };