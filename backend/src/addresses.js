// src/addresses.js
// Delivery address routes for buyers

const express = require('express');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();
router.use(requireAuth);

// ----------------------------------------------------------------
// GET /addresses — list my addresses
// ----------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
            [req.user.id]
        );
        res.json({ count: rows.length, addresses: rows });
    } catch (err) {
        console.error('List addresses error:', err);
        res.status(500).json({ error: 'Failed to list addresses' });
    }
});

// ----------------------------------------------------------------
// POST /addresses — create a new address
// ----------------------------------------------------------------
router.post('/', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const {
            label, recipient_name, phone, country, county, city,
            line1, line2, postal_code, is_default
        } = req.body;

        if (!recipient_name || !phone || !city || !line1) {
            return res.status(400).json({
                error: 'recipient_name, phone, city, and line1 are required'
            });
        }

        await conn.beginTransaction();

        if (is_default) {
            await conn.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        }

        const [result] = await conn.query(
            `INSERT INTO addresses
             (user_id, label, recipient_name, phone, country, county, city, line1, line2, postal_code, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                label || 'Home',
                recipient_name, phone,
                country || 'LR',
                county || null,
                city, line1,
                line2 || null, postal_code || null,
                is_default ? 1 : 0
            ]
        );

        await conn.commit();

        const [rows] = await conn.query('SELECT * FROM addresses WHERE id = ?', [result.insertId]);
        res.status(201).json({ message: 'Address added', address: rows[0] });
    } catch (err) {
        await conn.rollback();
        console.error('Create address error:', err);
        res.status(500).json({ error: 'Failed to add address' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// PATCH /addresses/:id — update
// ----------------------------------------------------------------
router.patch('/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const [rows] = await conn.query(
            'SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Address not found' });

        const allowed = [
            'label', 'recipient_name', 'phone', 'country', 'county',
            'city', 'line1', 'line2', 'postal_code', 'is_default'
        ];
        const updates = [];
        const values = [];

        for (const f of allowed) {
            if (req.body[f] !== undefined) {
                updates.push(`${f} = ?`);
                let v = req.body[f];
                if (f === 'is_default') v = v ? 1 : 0;
                values.push(v);
            }
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        await conn.beginTransaction();

        if (req.body.is_default) {
            await conn.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.user.id]);
        }

        values.push(req.params.id, req.user.id);
        await conn.query(
            `UPDATE addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
            values
        );

        await conn.commit();

        const [updated] = await conn.query('SELECT * FROM addresses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Address updated', address: updated[0] });
    } catch (err) {
        await conn.rollback();
        console.error('Update address error:', err);
        res.status(500).json({ error: 'Failed to update address' });
    } finally {
        conn.release();
    }
});

// ----------------------------------------------------------------
// DELETE /addresses/:id
// ----------------------------------------------------------------
router.delete('/:id', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id FROM addresses WHERE id = ? AND user_id = ? LIMIT 1',
            [req.params.id, req.user.id]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Address not found' });

        const [usedBy] = await pool.query(
            'SELECT id FROM orders WHERE shipping_address_id = ? LIMIT 1',
            [req.params.id]
        );
        if (usedBy.length > 0) {
            return res.status(409).json({
                error: 'This address is used by an existing order and cannot be deleted'
            });
        }

        await pool.query('DELETE FROM addresses WHERE id = ?', [req.params.id]);
        res.json({ message: 'Address deleted' });
    } catch (err) {
        console.error('Delete address error:', err);
        res.status(500).json({ error: 'Failed to delete address' });
    }
});

module.exports = { router };