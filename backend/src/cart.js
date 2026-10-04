// src/cart.js
// Shopping cart routes (single vendor per cart in v1)

const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// ----------------------------------------------------------------
// Get or create the user's cart
// ----------------------------------------------------------------
async function ensureCart(userId) {
    const [rows] = await pool.query('SELECT * FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    if (rows.length > 0) return rows[0];
    const [result] = await pool.query('INSERT INTO carts (user_id) VALUES (?)', [userId]);
    const [created] = await pool.query('SELECT * FROM carts WHERE id = ?', [result.insertId]);
    return created[0];
}

// ----------------------------------------------------------------
// GET /cart — full cart with item details
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const cart = await ensureCart(req.user.id);

        const [items] = await pool.query(`
            SELECT
                ci.id AS cart_item_id,
                ci.quantity,
                ci.unit_price_snapshot,
                ci.added_at,
                p.id AS product_id,
                p.title, p.slug, p.base_price, p.currency_code,
                p.status AS product_status,
                v.id AS vendor_id,
                v.business_name AS vendor_name,
                v.slug AS vendor_slug,
                i.quantity_available AS stock,
                (SELECT url FROM product_images pi
                 WHERE pi.product_id = p.id AND pi.is_primary = 1
                 LIMIT 1) AS primary_image
            FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            JOIN vendors v ON v.id = ci.vendor_id
            LEFT JOIN inventory i ON i.product_id = p.id
            WHERE ci.cart_id = ?
            ORDER BY ci.added_at DESC
        `, [cart.id]);

        const subtotal = items.reduce(
            (sum, item) => sum + (parseFloat(item.unit_price_snapshot) * item.quantity), 0
        );

        res.json({
            cart_id: cart.id,
            vendor_id: cart.vendor_id,
            currency_code: cart.currency_code,
            item_count: items.length,
            subtotal: subtotal.toFixed(2),
            items
        });
    } catch (err) {
        console.error('Get cart error:', err);
        res.status(500).json({ error: 'Failed to load cart' });
    }
});

// ----------------------------------------------------------------
// POST /cart/items — add product to cart
// Body: { product_id, quantity }
// ----------------------------------------------------------------
router.post('/items', async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        if (!product_id) return res.status(400).json({ error: 'product_id is required' });

        const qty = Number(quantity) || 1;
        if (qty < 1) return res.status(400).json({ error: 'quantity must be at least 1' });

        const [prodRows] = await pool.query(`
            SELECT p.id, p.vendor_id, p.base_price, p.status,
                   i.quantity_available AS stock
            FROM products p
            LEFT JOIN inventory i ON i.product_id = p.id
            WHERE p.id = ? LIMIT 1
        `, [product_id]);

        if (prodRows.length === 0) return res.status(404).json({ error: 'Product not found' });
        const product = prodRows[0];
        if (product.status !== 'active') return res.status(400).json({ error: 'Product is not available' });

        const stock = product.stock || 0;
        if (stock < qty) return res.status(400).json({ error: `Only ${stock} in stock` });

        const cart = await ensureCart(req.user.id);

        // Single-vendor cart rule
        if (cart.vendor_id && cart.vendor_id !== product.vendor_id) {
            return res.status(409).json({
                error: 'Your cart contains items from a different vendor',
                hint: 'Clear your cart before adding items from another vendor'
            });
        }
        if (!cart.vendor_id) {
            await pool.query('UPDATE carts SET vendor_id = ? WHERE id = ?', [product.vendor_id, cart.id]);
        }

        const [existing] = await pool.query(
            'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
            [cart.id, product_id]
        );

        if (existing.length > 0) {
            const newQty = existing[0].quantity + qty;
            if (stock < newQty) {
                return res.status(400).json({
                    error: `Only ${stock} in stock (you already have ${existing[0].quantity} in cart)`
                });
            }
            await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
        } else {
            await pool.query(
                `INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, unit_price_snapshot)
                 VALUES (?, ?, ?, ?, ?)`,
                [cart.id, product_id, product.vendor_id, qty, product.base_price]
            );
        }

        res.status(201).json({ message: 'Added to cart' });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// ----------------------------------------------------------------
// PATCH /cart/items/:id — update quantity
// ----------------------------------------------------------------
router.patch('/items/:id', async (req, res) => {
    try {
        const qty = Number(req.body.quantity);
        if (!qty || qty < 1) return res.status(400).json({ error: 'quantity must be >= 1' });

        const [rows] = await pool.query(`
            SELECT ci.id, ci.product_id, i.quantity_available AS stock
            FROM cart_items ci
            JOIN carts c ON c.id = ci.cart_id
            LEFT JOIN inventory i ON i.product_id = ci.product_id
            WHERE ci.id = ? AND c.user_id = ? LIMIT 1
        `, [req.params.id, req.user.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Cart item not found' });

        const stock = rows[0].stock || 0;
        if (qty > stock) return res.status(400).json({ error: `Only ${stock} in stock` });

        await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [qty, req.params.id]);
        res.json({ message: 'Quantity updated' });
    } catch (err) {
        console.error('Update cart item error:', err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// ----------------------------------------------------------------
// DELETE /cart/items/:id — remove item
// ----------------------------------------------------------------
router.delete('/items/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT ci.id, ci.cart_id FROM cart_items ci
            JOIN carts c ON c.id = ci.cart_id
            WHERE ci.id = ? AND c.user_id = ? LIMIT 1
        `, [req.params.id, req.user.id]);

        if (rows.length === 0) return res.status(404).json({ error: 'Cart item not found' });

        const cartId = rows[0].cart_id;
        await pool.query('DELETE FROM cart_items WHERE id = ?', [req.params.id]);

        // Clear vendor_id if cart is now empty
        const [remaining] = await pool.query(
            'SELECT COUNT(*) AS n FROM cart_items WHERE cart_id = ?', [cartId]
        );
        if (remaining[0].n === 0) {
            await pool.query('UPDATE carts SET vendor_id = NULL WHERE id = ?', [cartId]);
        }

        res.json({ message: 'Item removed' });
    } catch (err) {
        console.error('Remove cart item error:', err);
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

// ----------------------------------------------------------------
// DELETE /cart — clear entire cart
// ----------------------------------------------------------------
router.delete('/', async (req, res) => {
    try {
        const [cartRows] = await pool.query(
            'SELECT id FROM carts WHERE user_id = ? LIMIT 1', [req.user.id]
        );
        if (cartRows.length > 0) {
            const cartId = cartRows[0].id;
            await pool.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
            await pool.query('UPDATE carts SET vendor_id = NULL WHERE id = ?', [cartId]);
        }
        res.json({ message: 'Cart cleared' });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = { router };