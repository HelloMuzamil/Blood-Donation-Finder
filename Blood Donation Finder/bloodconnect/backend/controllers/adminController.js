/**
 * controllers/adminController.js
 * Admin-only dashboard operations
 */
const db = require('../config/db');

/* ----------------------------------------------------------------
   DASHBOARD STATS
   GET /api/admin/stats
   ---------------------------------------------------------------- */
const getStats = async (req, res) => {
  try {
    const [[totalUsers]]    = await db.query('SELECT COUNT(*) AS count FROM users WHERE role != "admin"');
    const [[activeDonors]]  = await db.query('SELECT COUNT(*) AS count FROM users WHERE role IN ("donor","both") AND availability = 1');
    const [[activeReqs]]    = await db.query('SELECT COUNT(*) AS count FROM blood_requests WHERE status = "pending" AND expires_at > NOW()');
    const [[fulfilledReqs]] = await db.query('SELECT COUNT(*) AS count FROM blood_requests WHERE status = "fulfilled"');
    const [[totalRatings]]  = await db.query('SELECT COUNT(*) AS count FROM ratings');

    return res.json({
      success: true,
      stats: {
        total_users:       totalUsers.count,
        active_donors:     activeDonors.count,
        active_requests:   activeReqs.count,
        fulfilled_requests: fulfilledReqs.count,
        total_ratings:     totalRatings.count
      }
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET ALL USERS
   GET /api/admin/users
   ---------------------------------------------------------------- */
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, role, city, blood_group,
              availability, total_donations, avg_rating, is_trusted, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );
    const users = rows.map(u => ({ ...u, name: `${u.first_name} ${u.last_name}` }));
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET ALL REQUESTS
   GET /api/admin/requests
   ---------------------------------------------------------------- */
const getAllRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, CONCAT(u.first_name,' ',u.last_name) AS requester_name
       FROM blood_requests r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 50`
    );
    return res.json({ success: true, requests: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   SUSPEND / ACTIVATE USER
   PUT /api/admin/users/:id/status
   ---------------------------------------------------------------- */
const toggleUserStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    return res.json({ success: true, message: `User ${is_active ? 'activated' : 'suspended'}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   DELETE USER
   DELETE /api/admin/users/:id
   ---------------------------------------------------------------- */
const deleteUser = async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ? AND role != "admin"', [req.params.id]);
    return res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getStats, getAllUsers, getAllRequests, toggleUserStatus, deleteUser };