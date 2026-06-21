const db = require('../config/db');

async function check() {
  try {
    await db.query('USE bloodconnect');
    const [tables] = await db.query('SHOW TABLES');
    console.log('Tables in bloodconnect:', tables);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
check();
