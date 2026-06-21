/**
 * controllers/donorController.js
 * Search donors, get profile, update availability + location
 */
const db = require('../config/db');
const { haversineDistance } = require('../services/whatsappBatchService');

/* ----------------------------------------------------------------
   SEARCH DONORS
   GET /api/donors?blood=A+&city=Lahore&availability=1&lat=31.5&lng=74.3&radius=30
   ---------------------------------------------------------------- */
const searchDonors = async (req, res) => {
  try {
    const { blood, city, availability, lat, lng, radius, min_trust } = req.query;

    let query = `
      SELECT id, first_name, last_name, email, phone, city,
             blood_group, availability, total_donations, avg_rating,
             trust_score, is_trusted, latitude, longitude, created_at
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
    if (min_trust) {
      query += ' AND (trust_score >= ? OR avg_rating >= ?)';
      params.push(parseFloat(min_trust), parseFloat(min_trust));
    }

    query += ' ORDER BY is_trusted DESC, trust_score DESC, avg_rating DESC, total_donations DESC';

    const [rows] = await db.query(query, params);

    const searchLat = lat ? parseFloat(lat) : null;
    const searchLng = lng ? parseFloat(lng) : null;
    const maxRadius = radius ? parseFloat(radius) : 30;

    let donors = rows.map((d) => {
      const trust = parseFloat(d.trust_score) || parseFloat(d.avg_rating) || 0;
      let distance_km = null;

      if (searchLat && searchLng && d.latitude && d.longitude) {
        distance_km = Math.round(
          haversineDistance(searchLat, searchLng, parseFloat(d.latitude), parseFloat(d.longitude)) * 10
        ) / 10;
      }

      return {
        ...d,
        trust_score: trust,
        distance_km,
        initials: `${d.first_name[0]}${d.last_name[0]}`.toUpperCase(),
        name: `${d.first_name} ${d.last_name}`,
        maps_link: d.latitude && d.longitude
          ? `https://www.google.com/maps/search/?api=1&query=${d.latitude},${d.longitude}`
          : null,
      };
    });

    if (searchLat && searchLng) {
      donors = donors.filter((d) => d.distance_km !== null && d.distance_km <= maxRadius);
      donors.sort((a, b) => a.distance_km - b.distance_km);
    }

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
              availability, total_donations, avg_rating, trust_score, is_trusted,
              latitude, longitude, created_at
       FROM users WHERE id = ? AND is_active = 1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    const donor = rows[0];
    donor.name = `${donor.first_name} ${donor.last_name}`;
    donor.initials = `${donor.first_name[0]}${donor.last_name[0]}`.toUpperCase();
    donor.maps_link = donor.latitude && donor.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${donor.latitude},${donor.longitude}`
      : null;

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
   UPDATE AVAILABILITY + optional location
   PUT /api/donors/availability
   ---------------------------------------------------------------- */
const updateAvailability = async (req, res) => {
  try {
    const { availability, latitude, longitude } = req.body;

    if (latitude !== undefined && longitude !== undefined) {
      await db.query(
        'UPDATE users SET availability = ?, latitude = ?, longitude = ? WHERE id = ?',
        [availability ? 1 : 0, parseFloat(latitude), parseFloat(longitude), req.user.id]
      );
    } else {
      await db.query(
        'UPDATE users SET availability = ? WHERE id = ?',
        [availability ? 1 : 0, req.user.id]
      );
    }

    return res.json({
      success: true,
      message: `You are now marked as ${availability ? 'Available' : 'Not Available'}.`,
      availability: availability ? 1 : 0,
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
              availability, total_donations, avg_rating, trust_score, is_trusted,
              latitude, longitude, role, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    const profile = rows[0];
    profile.name = `${profile.first_name} ${profile.last_name}`;
    profile.initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    profile.maps_link = profile.latitude && profile.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${profile.latitude},${profile.longitude}`
      : null;

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
    const { first_name, last_name, phone, city, blood_group, latitude, longitude } = req.body;

    const lat = latitude !== undefined ? parseFloat(latitude) : null;
    const lng = longitude !== undefined ? parseFloat(longitude) : null;

    await db.query(
      `UPDATE users SET first_name = ?, last_name = ?, phone = ?, city = ?,
              blood_group = ?, latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude)
       WHERE id = ?`,
      [first_name, last_name, phone, city, blood_group, lat, lng, req.user.id]
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
    const [[completedReqs]] = await db.query(
      `SELECT COUNT(*) AS count FROM blood_requests WHERE status = 'completed'`
    );
    const [[avgRating]] = await db.query(
      `SELECT AVG(avg_rating) AS avg_rating FROM users WHERE role IN ('donor', 'both') AND avg_rating > 0 AND is_active = 1`
    );

    return res.json({
      success: true,
      stats: {
        total_donors: totalDonors.count || 0,
        total_cities: totalCities.count || 0,
        fulfilled_requests: completedReqs.count || 0,
        avg_rating: avgRating.avg_rating ? parseFloat(avgRating.avg_rating).toFixed(1) : '0.0',
      },
    });
  } catch (err) {
    console.error('Get public stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  searchDonors,
  getDonorById,
  updateAvailability,
  getMyProfile,
  updateProfile,
  getPublicStats,
};
