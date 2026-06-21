/**
 * controllers/adminController.js
 * Admin dashboard + batch alert control panel
 */
const db = require('../config/db');
const {
  buildWhatsAppMessage,
  generateWhatsAppLink,
  googleMapsLink,
} = require('../services/whatsappBatchService');

/* ----------------------------------------------------------------
   DASHBOARD STATS
   GET /api/admin/stats
   ---------------------------------------------------------------- */
const getStats = async (req, res) => {
  try {
    const [[totalUsers]] = await db.query('SELECT COUNT(*) AS count FROM users WHERE role != "admin"');
    const [[activeDonors]] = await db.query(
      'SELECT COUNT(*) AS count FROM users WHERE role IN ("donor","both") AND availability = 1'
    );
    const [[activeReqs]] = await db.query(
      'SELECT COUNT(*) AS count FROM blood_requests WHERE status IN ("pending","processing") AND expires_at > NOW()'
    );
    const [[completedReqs]] = await db.query(
      'SELECT COUNT(*) AS count FROM blood_requests WHERE status = "completed"'
    );
    const [[totalRatings]] = await db.query('SELECT COUNT(*) AS count FROM ratings');
    const [[pendingBatches]] = await db.query(
      'SELECT COUNT(DISTINCT request_id) AS count FROM request_queue WHERE status = "pending"'
    );

    return res.json({
      success: true,
      stats: {
        total_users: totalUsers.count,
        active_donors: activeDonors.count,
        active_requests: activeReqs.count,
        fulfilled_requests: completedReqs.count,
        total_ratings: totalRatings.count,
        pending_batch_requests: pendingBatches.count,
      },
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
              availability, total_donations, avg_rating, trust_score, is_trusted,
              is_active, latitude, longitude, created_at
       FROM users ORDER BY created_at DESC`
    );
    const users = rows.map((u) => ({ ...u, name: `${u.first_name} ${u.last_name}` }));
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
      `SELECT r.*, CONCAT(u.first_name,' ',u.last_name) AS requester_name,
              (SELECT COUNT(*) FROM request_queue rq WHERE rq.request_id = r.id) AS queue_count,
              (SELECT COUNT(*) FROM request_queue rq WHERE rq.request_id = r.id AND rq.status = 'pending') AS pending_count
       FROM blood_requests r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 50`
    );

    const requests = rows.map((r) => ({
      ...r,
      assigned_batches: r.assigned_batches
        ? (typeof r.assigned_batches === 'string' ? JSON.parse(r.assigned_batches) : r.assigned_batches)
        : null,
      maps_link: r.latitude && r.longitude ? googleMapsLink(r.latitude, r.longitude) : null,
    }));

    return res.json({ success: true, requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET REQUEST BATCH QUEUE
   GET /api/admin/requests/:id/batches
   ---------------------------------------------------------------- */
const getRequestBatches = async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await db.query(
      'SELECT * FROM blood_requests WHERE id = ?',
      [requestId]
    );
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requests[0];
    const message = buildWhatsAppMessage(request);

    const [queueRows] = await db.query(
      `SELECT rq.id AS queue_id, rq.batch_number, rq.status AS queue_status,
              u.id, u.first_name, u.last_name, u.phone, u.blood_group, u.city,
              u.latitude, u.longitude, u.trust_score, u.avg_rating
       FROM request_queue rq
       JOIN users u ON rq.donor_id = u.id
       WHERE rq.request_id = ?
       ORDER BY rq.batch_number ASC, u.trust_score DESC`,
      [requestId]
    );

    const batchMap = {};
    for (const row of queueRows) {
      if (!batchMap[row.batch_number]) {
        batchMap[row.batch_number] = {
          batch_number: row.batch_number,
          status: 'pending',
          donors: [],
        };
      }
      const allSent = row.queue_status === 'sent';
      if (row.queue_status === 'pending') batchMap[row.batch_number].status = 'pending';

      batchMap[row.batch_number].donors.push({
        queue_id: row.queue_id,
        id: row.id,
        name: `${row.first_name} ${row.last_name}`,
        phone: row.phone,
        blood_group: row.blood_group,
        city: row.city,
        trust_score: parseFloat(row.trust_score) || parseFloat(row.avg_rating) || 0,
        whatsapp_link: generateWhatsAppLink(row.phone, message),
        maps_link: row.latitude && row.longitude
          ? googleMapsLink(row.latitude, row.longitude)
          : null,
        queue_status: row.queue_status,
      });
    }

    // Mark batch as sent only if all donors in batch are sent
    Object.values(batchMap).forEach((batch) => {
      if (batch.donors.every((d) => d.queue_status === 'sent')) {
        batch.status = 'sent';
      } else if (batch.donors.some((d) => d.queue_status === 'sent')) {
        batch.status = 'partial';
      }
    });

    const batches = Object.values(batchMap).sort((a, b) => a.batch_number - b.batch_number);

    return res.json({
      success: true,
      request: {
        id: request.id,
        patient_name: request.patient_name,
        blood_group: request.blood_group,
        city: request.city,
        urgency: request.urgency,
        status: request.status,
        latitude: request.latitude,
        longitude: request.longitude,
        maps_link: request.latitude && request.longitude
          ? googleMapsLink(request.latitude, request.longitude)
          : null,
      },
      total_donors: queueRows.length,
      total_batches: batches.length,
      batches,
    });
  } catch (err) {
    console.error('Get request batches error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   SEND BATCH — mark sent + return WhatsApp links
   POST /api/admin/requests/:id/batches/:batchNum/send
   ---------------------------------------------------------------- */
const sendBatch = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const batchNum = parseInt(req.params.batchNum, 10);

    const [requests] = await db.query('SELECT * FROM blood_requests WHERE id = ?', [requestId]);
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requests[0];
    const message = buildWhatsAppMessage(request);

    const [donors] = await db.query(
      `SELECT rq.id AS queue_id, u.id, u.first_name, u.last_name, u.phone,
              u.blood_group, u.city, u.latitude, u.longitude, u.trust_score
       FROM request_queue rq
       JOIN users u ON rq.donor_id = u.id
       WHERE rq.request_id = ? AND rq.batch_number = ?`,
      [requestId, batchNum]
    );

    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'Batch not found or empty.' });
    }

    const queueIds = donors.map((d) => d.queue_id);
    await db.query(
      'UPDATE request_queue SET status = ? WHERE id IN (?)',
      ['sent', queueIds]
    );

    // Update assigned_batches JSON status
    if (request.assigned_batches) {
      const batches = typeof request.assigned_batches === 'string'
        ? JSON.parse(request.assigned_batches)
        : request.assigned_batches;
      const batch = batches.find((b) => b.batch_number === batchNum);
      if (batch) batch.status = 'sent';
      await db.query(
        'UPDATE blood_requests SET assigned_batches = ?, status = ? WHERE id = ?',
        [JSON.stringify(batches), 'processing', requestId]
      );
    }

    const links = donors.map((d) => ({
      donor_id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      phone: d.phone,
      blood_group: d.blood_group,
      city: d.city,
      trust_score: parseFloat(d.trust_score) || 0,
      whatsapp_link: generateWhatsAppLink(d.phone, message),
      maps_link: d.latitude && d.longitude ? googleMapsLink(d.latitude, d.longitude) : null,
    }));

    return res.json({
      success: true,
      message: `Batch ${batchNum} marked as sent. Open ${links.length} WhatsApp link(s).`,
      batch_number: batchNum,
      links,
    });
  } catch (err) {
    console.error('Send batch error:', err);
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

/* ----------------------------------------------------------------
   SEND ALL BATCHES — mark ALL donors sent + return all WhatsApp links
   POST /api/admin/requests/:id/batches/send-all
   ---------------------------------------------------------------- */
const sendAllBatches = async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    const [requests] = await db.query('SELECT * FROM blood_requests WHERE id = ?', [requestId]);
    if (requests.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = requests[0];
    const message = buildWhatsAppMessage(request);

    // Get ALL donors in queue for this request (all batches)
    const [donors] = await db.query(
      `SELECT rq.id AS queue_id, u.id, u.first_name, u.last_name, u.phone,
              u.blood_group, u.city, u.latitude, u.longitude, u.trust_score
       FROM request_queue rq
       JOIN users u ON rq.donor_id = u.id
       WHERE rq.request_id = ?
       ORDER BY rq.batch_number ASC`,
      [requestId]
    );

    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'No donors in queue for this request.' });
    }

    // Mark ALL donors in queue as sent
    const queueIds = donors.map((d) => d.queue_id);
    await db.query(
      'UPDATE request_queue SET status = ? WHERE id IN (?)',
      ['sent', queueIds]
    );

    // Update assigned_batches JSON — mark every batch as sent
    if (request.assigned_batches) {
      const batches = typeof request.assigned_batches === 'string'
        ? JSON.parse(request.assigned_batches)
        : request.assigned_batches;
      batches.forEach((b) => { b.status = 'sent'; });
      await db.query(
        'UPDATE blood_requests SET assigned_batches = ?, status = ? WHERE id = ?',
        [JSON.stringify(batches), 'processing', requestId]
      );
    }

    const links = donors.map((d) => ({
      donor_id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      phone: d.phone,
      blood_group: d.blood_group,
      city: d.city,
      trust_score: parseFloat(d.trust_score) || 0,
      whatsapp_link: generateWhatsAppLink(d.phone, message),
      maps_link: d.latitude && d.longitude ? googleMapsLink(d.latitude, d.longitude) : null,
    }));

    return res.json({
      success: true,
      message: `All ${links.length} donor(s) alerted successfully!`,
      total_sent: links.length,
      links,
    });
  } catch (err) {
    console.error('Send all batches error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  getAllRequests,
  getRequestBatches,
  sendBatch,
  sendAllBatches,
  toggleUserStatus,
  deleteUser,
};
