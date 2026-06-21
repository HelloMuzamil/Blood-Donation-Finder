const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: true },
      multipleStatements: true
    });

    const schemaPath = path.join(__dirname, '../database/schema.sql');
    let sql = fs.readFileSync(schemaPath, 'utf8');

    // Add USE bloodconnect at the beginning since we are connected without a default DB
    sql = 'USE bloodconnect;\n' + sql;

    console.log('Running full schema...');
    await conn.query(sql);
    console.log('Database schema created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error message:', err.message);
    process.exit(1);
  }
}
run();
