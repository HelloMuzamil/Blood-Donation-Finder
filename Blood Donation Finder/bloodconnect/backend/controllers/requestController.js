/**
 * controllers/requestController.js
 * Emergency blood request CRUD
 */
const db = require('../config/db');

/* ----------------------------------------------------------------
   CREATE EMERGENCY REQUEST
   POST /api/requests
   ---------------------------------------------------------------- */
const createRequest = async (req, res) => {
  try {
    const { patient_name, blood_group, units_needed, hospital, city, phone, urgency, notes } = req.body;

    if (!patient_name || !blood_group || !city || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    const [result] = await db.query(
      `INSERT INTO blood_requests
         (user_id, patient_name, blood_group, units_needed, hospital, city, phone, urgency, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, patient_name, blood_group, units_needed || 1, hospital, city, phone,
       urgency || 'normal', notes || null]
    );

    // Notify matching available donors in same city
    const [matchingDonors] = await db.query(
      `SELECT id FROM users
       WHERE blood_group = ? AND city LIKE ? AND availability = 1 AND is_active = 1
         AND role IN ('donor','both') AND id != ?`,
      [blood_group, `%${city}%`, req.user.id]
    );

    if (matchingDonors.length > 0) {
      const notifValues = matchingDonors.map(d => [
        d.id,
        `🚨 Emergency: ${blood_group} blood needed in ${city} for ${patient_name}. Urgency: ${urgency || 'normal'}.`
      ]);
      await db.query(
        'INSERT INTO notifications (user_id, message) VALUES ?',
        [notifValues]
      );
    }

    return res.status(201).json({
      success: true,
      message: `Emergency request submitted! ${matchingDonors.length} donor(s) notified.`,
      request_id: result.insertId,
      notified_donors: matchingDonors.length
    });
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET ALL ACTIVE REQUESTS (public — for homepage)
   GET /api/requests/active
   ---------------------------------------------------------------- */
const getActiveRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, patient_name, blood_group, units_needed, hospital, city, phone,
              urgency, status, created_at, expires_at
       FROM blood_requests
       WHERE status = 'pending' AND expires_at > NOW()
       ORDER BY
         CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT 20`
    );

    // Calculate remaining time for each
    const now = Date.now();
    const requests = rows.map(r => {
      const expiresMs   = new Date(r.expires_at).getTime();
      const remainingMs = Math.max(0, expiresMs - now);
      const hrs  = Math.floor(remainingMs / 3600000);
      const mins = Math.floor((remainingMs % 3600000) / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      return {
        ...r,
        timer: `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`
      };
    });

    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('Get requests error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET MY REQUESTS
   GET /api/requests/mine
   ---------------------------------------------------------------- */
const getMyRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, patient_name, blood_group, units_needed, hospital, city,
              urgency, status, created_at, expires_at
       FROM blood_requests WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('Get my requests error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   UPDATE REQUEST STATUS
   PUT /api/requests/:id/status
   ---------------------------------------------------------------- */
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'fulfilled', 'expired'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    // User can only update their own requests (admin can update any)
    const whereClause = req.user.role === 'admin'
      ? 'WHERE id = ?'
      : 'WHERE id = ? AND user_id = ?';
    const params = req.user.role === 'admin'
      ? [status, req.params.id]
      : [status, req.params.id, req.user.id];

    await db.query(`UPDATE blood_requests SET status = ? ${whereClause}`, params);

    return res.json({ success: true, message: `Request marked as ${status}.` });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { createRequest, getActiveRequests, getMyRequests, updateRequestStatus };