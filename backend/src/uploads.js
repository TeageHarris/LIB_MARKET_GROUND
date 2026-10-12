// src/uploads.js
// Local file upload handling — stores images in backend/uploads/

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer to save files with unique names
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `product-${unique}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files allowed'));
        }
        cb(null, true);
    }
});

async function getVendorForUser(userId) {
    const [rows] = await pool.query(
        'SELECT id, verification_status FROM vendors WHERE owner_user_id = ? LIMIT 1',
        [userId]
    );
    return rows.length > 0 ? rows[0] : null;
}

router.post('/:id/upload', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const vendor = await getVendorForUser(req.user.id);
        if (!vendor || vendor.verification_status !== 'approved') {
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'You are not an approved vendor' });
        }

        const [rows] = await pool.query(
            'SELECT id FROM products WHERE id = ? AND vendor_id = ? LIMIT 1',
            [req.params.id, vendor.id]
        );
        if (rows.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Product not found or not yours' });
        }

        const publicUrl = `/uploads/${req.file.filename}`;

        const [existing] = await pool.query(
            'SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?',
            [req.params.id]
        );
        const isFirst = existing[0].n === 0;

        await pool.query(
            `INSERT INTO product_images (product_id, url, alt_text, is_primary)
             VALUES (?, ?, ?, ?)`,
            [req.params.id, publicUrl, req.body.alt_text || null, isFirst ? 1 : 0]
        );

        res.json({ message: 'Image uploaded', url: publicUrl });
    } catch (err) {
        console.error('Upload error:', err);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Upload failed' });
    }
});

module.exports = { router, UPLOAD_DIR };