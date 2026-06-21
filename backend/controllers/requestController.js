/**
 * controllers/requestController.js
 * Emergency blood request CRUD + batch queue generation
 */
const db = require('../config/db');
const {
  matchDonors,
  prepareBatchQueue,
  DEFAULT_BATCH_SIZE,
} = require('../services/whatsappBatchService');

/* ----------------------------------------------------------------
   CREATE EMERGENCY REQUEST
   POST /api/requests
   ---------------------------------------------------------------- */
const createRequest = async (req, res) => {
  try {
    const {
      patient_name, blood_group, units_needed, hospital, city, phone,
      urgency, notes, latitude, longitude,
    } = req.body;

    if (!patient_name || !blood_group || !city || !phone) {
      return res.status(400).json({ success: false, message: 'Required fields missing.' });
    }

    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const [result] = await db.query(
      `INSERT INTO blood_requests
         (user_id, patient_name, blood_group, units_needed, hospital, city, phone,
          urgency, notes, latitude, longitude, status, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL 3 HOUR))`,
      [
        req.user.id, patient_name, blood_group, units_needed || 1, hospital, city, phone,
        urgency || 'normal', notes || null, lat, lng,
      ]
    );

    const requestId = result.insertId;
    let batchSummary = { total_donors: 0, total_batches: 0, batches: [] };

    if (lat && lng) {
      const [allDonors] = await db.query(
        `SELECT id, first_name, last_name, phone, city, blood_group, availability,
                latitude, longitude, trust_score, avg_rating, is_active
         FROM users
         WHERE role IN ('donor','both') AND is_active = 1 AND availability = 1`
      );

      const requestData = {
        blood_group, latitude: lat, longitude: lng, city, urgency: urgency || 'normal',
      };

      const matchedDonors = matchDonors(allDonors, requestData, { excludeUserId: req.user.id });
      const batches = prepareBatchQueue(matchedDonors, DEFAULT_BATCH_SIZE);

      if (matchedDonors.length > 0) {
        const queueValues = [];
        matchedDonors.forEach((donor, index) => {
          const batchNum = Math.floor(index / DEFAULT_BATCH_SIZE) + 1;
          queueValues.push([requestId, donor.id, batchNum, 'pending']);
        });

        await db.query(
          'INSERT INTO request_queue (request_id, donor_id, batch_number, status) VALUES ?',
          [queueValues]
        );

        await db.query(
          `UPDATE blood_requests SET status = 'processing', assigned_batches = ? WHERE id = ?`,
          [JSON.stringify(batches), requestId]
        );

        batchSummary = {
          total_donors: matchedDonors.length,
          total_batches: batches.length,
          batches: batches.map((b) => ({
            batch_number: b.batch_number,
            donor_count: b.donor_count,
            status: b.status,
          })),
        };
      }
    } else {
      // Fallback: city-based in-app notifications when no coordinates
      const [matchingDonors] = await db.query(
        `SELECT id FROM users
         WHERE blood_group = ? AND city LIKE ? AND availability = 1 AND is_active = 1
           AND role IN ('donor','both') AND id != ?`,
        [blood_group, `%${city}%`, req.user.id]
      );

      if (matchingDonors.length > 0) {
        const notifValues = matchingDonors.map((d) => [
          d.id,
          `🚨 Emergency: ${blood_group} blood needed in ${city} for ${patient_name}. Urgency: ${urgency || 'normal'}.`,
        ]);
        await db.query('INSERT INTO notifications (user_id, message) VALUES ?', [notifValues]);
      }
    }

    return res.status(201).json({
      success: true,
      message: batchSummary.total_donors > 0
        ? `Emergency request submitted! ${batchSummary.total_donors} donor(s) queued in ${batchSummary.total_batches} batch(es) for admin alerts.`
        : lat && lng
          ? 'Emergency request submitted. No matching donors within 30km — admin will review.'
          : 'Emergency request submitted! Add location for smart donor matching.',
      request_id: requestId,
      batch_summary: batchSummary,
    });
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET ALL ACTIVE REQUESTS (public)
   GET /api/requests/active
   ---------------------------------------------------------------- */
const getActiveRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, patient_name, blood_group, units_needed, hospital, city, phone,
              urgency, status, latitude, longitude, created_at, expires_at
       FROM blood_requests
       WHERE status IN ('pending','processing') AND expires_at > NOW()
       ORDER BY
         CASE urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT 20`
    );

    const now = Date.now();
    const requests = rows.map((r) => {
      const expiresMs = new Date(r.expires_at).getTime();
      const remainingMs = Math.max(0, expiresMs - now);
      const hrs = Math.floor(remainingMs / 3600000);
      const mins = Math.floor((remainingMs % 3600000) / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      return {
        ...r,
        maps_link: r.latitude && r.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`
          : null,
        timer: `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
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
              urgency, status, latitude, longitude, created_at, expires_at
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
    const validStatuses = ['pending', 'processing', 'completed', 'expired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

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
