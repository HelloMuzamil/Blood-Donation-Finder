/**
 * config/db.js — MySQL connection pool
 * Supports Railway MySQL env vars, DATABASE_URL, or individual vars (local dev).
 * Railway provides: MYSQL_URL, MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

// Priority: MYSQL_URL (Railway) > DATABASE_URL > individual vars
if (process.env.MYSQL_URL) {
  // Railway provides MYSQL_URL
  pool = mysql.createPool(process.env.MYSQL_URL);
} else if (process.env.DATABASE_URL) {
  // Generic connection string
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Individual env vars (local dev or manual config)
  pool = mysql.createPool({
    host:               process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    port:               parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    user:               process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password:           process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database:           process.env.MYSQLDATABASE || process.env.DB_NAME || 'bloodconnect',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    timezone:           '+00:00',
    ssl: {
      rejectUnauthorized: false
    }
  });
}

// Test connection on startup (non-blocking)
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
  });

module.exports = pool;