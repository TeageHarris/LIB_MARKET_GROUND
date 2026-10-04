// src/vendors.js
// Vendor application + KYC document routes

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
// Body: business_name, description, phone, email, county, city,
//       business_registration_no, tax_id
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

        // One vendor per user
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
// Body: { doc_type, file_url }
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
// GET /vendors/me — current user's vendor record + docs
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

module.exports = { router };