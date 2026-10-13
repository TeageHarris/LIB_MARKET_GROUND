// src/auth.js
// Authentication routes: register, login, get current user, edit profile, forgot/reset password

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('./db');

const router = express.Router();

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        email_verified: !!user.email_verified,
        phone_verified: !!user.phone_verified,
        created_at: user.created_at
    };
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Authorization required' });
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// ----------------------------------------------------------------
// POST /auth/register
// ----------------------------------------------------------------
router.post('/register', async (req, res) => {
    try {
        const { email, phone, password, full_name, role } = req.body;
        if (!email || !phone || !password || !full_name) {
            return res.status(400).json({ error: 'email, phone, password, and full_name are all required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        const allowedRoles = ['buyer', 'vendor_owner'];
        const finalRole = allowedRoles.includes(role) ? role : 'buyer';

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1',
            [email, phone]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Email or phone already registered' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await pool.query(
            `INSERT INTO users (email, phone, password_hash, full_name, role)
             VALUES (?, ?, ?, ?, ?)`,
            [email, phone, passwordHash, full_name, finalRole]
        );

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
        const user = rows[0];
        const token = signToken(user);

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: publicUser(user)
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ----------------------------------------------------------------
// POST /auth/login
// ----------------------------------------------------------------
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
            [email, email]
        );
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const user = rows[0];
        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is ' + user.status });
        }
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]).catch(() => {});

        const token = signToken(user);
        res.json({ message: 'Login successful', token, user: publicUser(user) });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ----------------------------------------------------------------
// GET /auth/me — current user
// ----------------------------------------------------------------
router.get('/me', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json({ user: publicUser(rows[0]) });
    } catch (err) {
        console.error('Me error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ----------------------------------------------------------------
// PATCH /auth/me — update profile (name + phone)
// ----------------------------------------------------------------
router.patch('/me', requireAuth, async (req, res) => {
    try {
        const { full_name, phone } = req.body || {};
        const updates = [];
        const values = [];

        if (full_name !== undefined) {
            if (typeof full_name !== 'string' || full_name.trim().length < 2) {
                return res.status(400).json({ error: 'Full name must be at least 2 characters' });
            }
            updates.push('full_name = ?');
            values.push(full_name.trim());
        }

        if (phone !== undefined) {
            if (typeof phone !== 'string' || phone.trim().length < 6) {
                return res.status(400).json({ error: 'Phone must be at least 6 characters' });
            }
            const cleanPhone = phone.trim();

            const [conflict] = await pool.query(
                'SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1',
                [cleanPhone, req.user.id]
            );
            if (conflict.length > 0) {
                return res.status(409).json({ error: 'That phone number is already in use' });
            }

            updates.push('phone = ?');
            values.push(cleanPhone);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        values.push(req.user.id);
        await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profile updated', user: publicUser(rows[0]) });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// ----------------------------------------------------------------
// PATCH /auth/me/password — change password
// ----------------------------------------------------------------
router.patch('/me/password', requireAuth, async (req, res) => {
    try {
        const { current_password, new_password } = req.body || {};
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }
        if (new_password.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'User not found' });

        const ok = await bcrypt.compare(current_password, rows[0].password_hash);
        if (!ok) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// ----------------------------------------------------------------
// POST /auth/forgot-password
// ----------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const genericOk = { message: 'If that email is registered, a reset link has been sent.' };

        const [rows] = await pool.query(
            'SELECT id, email, full_name, status FROM users WHERE LOWER(email) = ? LIMIT 1',
            [cleanEmail]
        );
        if (rows.length === 0) return res.json(genericOk);

        const user = rows[0];
        if (user.status !== 'active') return res.json(genericOk);

        await pool.query('DELETE FROM password_resets WHERE user_id = ?', [user.id]);

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await pool.query(
            'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
            [user.id, tokenHash, expiresAt]
        );

        const resetLink = `${process.env.APP_URL}/reset-password?token=${rawToken}`;

        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            console.error('RESEND_API_KEY not set — cannot send reset email');
            return res.json(genericOk);
        }

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'LIB_MARKET_GROUND <onboarding@resend.dev>',
                to: [user.email],
                subject: 'Reset your LIB_MARKET_GROUND password',
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
                        <h2 style="color:#047857;margin:0 0 8px;">LIB_MARKET_GROUND</h2>
                        <p style="color:#374151;">Hi ${user.full_name || 'there'},</p>
                        <p style="color:#374151;">We got a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
                        <p style="margin:28px 0;">
                            <a href="${resetLink}" style="background:#047857;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">Reset password</a>
                        </p>
                        <p style="color:#6b7280;font-size:13px;">If the button doesn't work, copy this link into your browser:</p>
                        <p style="color:#6b7280;font-size:13px;word-break:break-all;">${resetLink}</p>
                        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;">
                        <p style="color:#9ca3af;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `
            })
        });

        if (!emailRes.ok) {
            const body = await emailRes.text();
            console.error('Resend error:', emailRes.status, body);
        }

        return res.json(genericOk);
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// ----------------------------------------------------------------
// POST /auth/reset-password
// ----------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body || {};
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Reset token is required' });
        }
        if (!password || typeof password !== 'string') {
            return res.status(400).json({ error: 'New password is required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const [rows] = await pool.query(
            `SELECT id, user_id FROM password_resets
             WHERE token_hash = ? AND used = 0 AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        if (rows.length === 0) {
            return res.status(400).json({ error: 'This reset link is invalid or has expired' });
        }

        const reset = rows[0];
        const newHash = await bcrypt.hash(password, SALT_ROUNDS);

        await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, reset.user_id]);
        await pool.query('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);

        res.json({ message: 'Password reset successfully. You can now sign in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = { router, requireAuth, requireAdmin };