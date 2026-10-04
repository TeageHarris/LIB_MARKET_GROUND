// src/db.js
// MySQL connection pool for LIB_MARKET_GROUND

const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci'
});

// Quick test on startup
async function testConnection() {
    try {
        const [rows] = await pool.query('SELECT 1 AS ok');
        console.log('✅ MySQL connected successfully');
        return true;
    } catch (err) {
        console.error('❌ MySQL connection failed:', err.message);
        return false;
    }
}

module.exports = { pool, testConnection };