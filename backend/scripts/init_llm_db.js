const db = require('../config/db');

async function init() {
  try {
    console.log('Creating llm_logs table in database...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS llm_logs (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT NULL,
        feature_name VARCHAR(50) NOT NULL,
        prompt       TEXT NOT NULL,
        response     TEXT NOT NULL,
        latency_ms   INT NOT NULL,
        feedback     TINYINT DEFAULT 0,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table llm_logs created/verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating table:', err);
    process.exit(1);
  }
}

init();
