// src/admin.js
// Admin-only routes: approve/reject vendors, view pending applications

const express = require('express');
const { pool } = require('./db');
const { requireAuth, requireAdmin } = require('./auth');

const router = express.Router();

// Every route below requires a valid JWT + admin role
router.use(requireAuth, requireAdmin);

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

        // 1. Approve vendor
        await conn.query(
            `UPDATE vendors
             SET verification_status = 'approved', approved_at = NOW()
             WHERE id = ?`,
            [vendor.id]
        );

        // 2. Promote owner to vendor_owner (except if already admin)
        await conn.query(
            `UPDATE users SET role = 'vendor_owner'
             WHERE id = ? AND role != 'admin'`,
            [vendor.owner_user_id]
        );

        // 3. Mark all pending docs for this vendor as approved
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

module.exports = { router };