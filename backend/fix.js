const mysql = require('mysql2/promise');
mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'NewPassword123',
    database: 'bloodconnect'
}).then(c => {
    return c.execute("ALTER TABLE blood_requests MODIFY COLUMN status VARCHAR(20) DEFAULT 'pending'")
        .then(() => c.execute("UPDATE blood_requests SET status = 'completed' WHERE status = 'fulfilled'"))
        .then(() => c.execute("UPDATE blood_requests SET status = 'pending' WHERE status NOT IN ('pending','processing','completed','expired')"))
        .then(() => c.execute("ALTER TABLE blood_requests MODIFY COLUMN status ENUM('pending','processing','completed','expired') DEFAULT 'pending'"))
        .then(() => {
            console.log('Successfully fixed blood_requests table status column!');
            process.exit(0);
        })
        .catch(console.error);
}).catch(console.error);
