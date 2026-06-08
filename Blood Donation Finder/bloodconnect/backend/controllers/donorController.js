/**
 * controllers/donorController.js
 * Search donors, get profile, update availability
 */
const db = require('../config/db');

/* ----------------------------------------------------------------
   SEARCH DONORS
   GET /api/donors?blood=A+&city=Lahore&availability=1
   ---------------------------------------------------------------- */
const searchDonors = async (req, res) => {
  try {
    const { blood, city, availability } = req.query;

    let query = `
      SELECT id, first_name, last_name, email, phone, city,
             blood_group, availability, total_donations, avg_rating, is_trusted, created_at
      FROM users
      WHERE is_active = 1
        AND role IN ('donor','both')
    `;
    const params = [];

    if (blood && blood !== '') {
      query += ' AND blood_group = ?';
      params.push(blood);
    }
    if (city && city !== '') {
      query += ' AND city LIKE ?';
      params.push(`%${city}%`);
    }
    if (availability !== undefined && availability !== '') {
      query += ' AND availability = ?';
      params.push(availability === '1' || availability === 'true' ? 1 : 0);
    }

    query += ' ORDER BY is_trusted DESC, avg_rating DESC, total_donations DESC';

    const [rows] = await db.query(query, params);

    // Build initials for frontend avatars
    const donors = rows.map(d => ({
      ...d,
      initials: `${d.first_name[0]}${d.last_name[0]}`.toUpperCase(),
      name: `${d.first_name} ${d.last_name}`
    }));

    return res.json({ success: true, count: donors.length, donors });
  } catch (err) {
    console.error('Search donors error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET DONOR BY ID
   GET /api/donors/:id
   ---------------------------------------------------------------- */
const getDonorById = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, phone, city, blood_group,
              availability, total_donations, avg_rating, is_trusted, created_at
       FROM users WHERE id = ? AND is_active = 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    const donor = rows[0];
    donor.name     = `${donor.first_name} ${donor.last_name}`;
    donor.initials = `${donor.first_name[0]}${donor.last_name[0]}`.toUpperCase();

    // Get recent ratings with feedback
    const [ratings] = await db.query(
      `SELECT r.rating, r.feedback, r.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS rater_name
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       WHERE r.donor_id = ?
       ORDER BY r.created_at DESC LIMIT 5`,
      [donor.id]
    );

    return res.json({ success: true, donor, ratings });
  } catch (err) {
    console.error('Get donor error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   UPDATE AVAILABILITY (own profile)
   PUT /api/donors/availability
   ---------------------------------------------------------------- */
const updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    await db.query(
      'UPDATE users SET availability = ? WHERE id = ?',
      [availability ? 1 : 0, req.user.id]
    );
    return res.json({
      success: true,
      message: `You are now marked as ${availability ? 'Available' : 'Not Available'}.`,
      availability: availability ? 1 : 0
    });
  } catch (err) {
    console.error('Update availability error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET OWN PROFILE
   GET /api/donors/profile/me
   ---------------------------------------------------------------- */
const getMyProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, phone, city, blood_group,
              availability, total_donations, avg_rating, is_trusted, role, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const profile = rows[0];
    profile.name     = `${profile.first_name} ${profile.last_name}`;
    profile.initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();

    // Fetch request history (requests made by this user)
    const [history] = await db.query(
      `SELECT id, patient_name, blood_group, city, urgency, status, created_at
       FROM blood_requests WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      [req.user.id]
    );

    return res.json({ success: true, profile, history });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   UPDATE PROFILE
   PUT /api/donors/profile
   ---------------------------------------------------------------- */
const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, city, blood_group } = req.body;
    await db.query(
      `UPDATE users SET first_name = ?, last_name = ?, phone = ?, city = ?, blood_group = ?
       WHERE id = ?`,
      [first_name, last_name, phone, city, blood_group, req.user.id]
    );
    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET PUBLIC STATS
   GET /api/donors/stats
   ---------------------------------------------------------------- */
const getPublicStats = async (req, res) => {
  try {
    const [[totalDonors]] = await db.query(
      `SELECT COUNT(*) AS count FROM users WHERE role IN ('donor', 'both') AND is_active = 1`
    );
    const [[totalCities]] = await db.query(
      `SELECT COUNT(DISTINCT city) AS count FROM users WHERE city IS NOT NULL AND city != '' AND is_active = 1`
    );
    const [[fulfilledReqs]] = await db.query(
      `SELECT COUNT(*) AS count FROM blood_requests WHERE status = 'fulfilled'`
    );
    const [[avgRating]] = await db.query(
      `SELECT AVG(avg_rating) AS avg_rating FROM users WHERE role IN ('donor', 'both') AND avg_rating > 0 AND is_active = 1`
    );

    return res.json({
      success: true,
      stats: {
        total_donors: totalDonors.count || 0,
        total_cities: totalCities.count || 0,
        fulfilled_requests: fulfilledReqs.count || 0,
        avg_rating: avgRating.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : "0.0"
      }
    });
  } catch (err) {
    console.error('Get public stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { searchDonors, getDonorById, updateAvailability, getMyProfile, updateProfile, getPublicStats };