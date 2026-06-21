/**
 * controllers/notificationController.js
 */
const db = require('../config/db');

/* GET all notifications for current user */
const getNotifications = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    const unread = rows.filter(n => !n.is_read).length;
    return res.json({ success: true, notifications: rows, unread_count: unread });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* Mark single notification as read */
const markRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* Mark all notifications as read */
const markAllRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getNotifications, markRead, markAllRead };