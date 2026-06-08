/**
 * controllers/ratingController.js
 * Submit and fetch donor ratings
 */
const db = require('../config/db');

/* ----------------------------------------------------------------
   SUBMIT RATING
   POST /api/ratings
   ---------------------------------------------------------------- */
const submitRating = async (req, res) => {
  try {
    const { donor_id, rating, feedback } = req.body;

    if (!donor_id || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Valid donor_id and rating (1-5) required.' });
    }

    // Cannot rate yourself
    if (parseInt(donor_id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot rate yourself.' });
    }

    // Check if donor exists
    const [donor] = await db.query(
      'SELECT id, first_name FROM users WHERE id = ? AND role IN ("donor","both")',
      [donor_id]
    );
    if (donor.length === 0) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    // Insert or update rating (one rating per donor-rater pair)
    await db.query(
      `INSERT INTO ratings (donor_id, rater_id, rating, feedback)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), feedback = VALUES(feedback), created_at = NOW()`,
      [donor_id, req.user.id, rating, feedback || null]
    );

    // Recalculate average rating for the donor
    const [avg] = await db.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS review_count FROM ratings WHERE donor_id = ?',
      [donor_id]
    );
    const newAvg = parseFloat(avg[0].avg_rating).toFixed(2);

    // Auto-assign trusted badge if avg >= 4.5 and total reviews >= 10
    const isTrusted = newAvg >= 4.5 && avg[0].review_count >= 10 ? 1 : 0;

    await db.query(
      'UPDATE users SET avg_rating = ?, is_trusted = ? WHERE id = ?',
      [newAvg, isTrusted, donor_id]
    );

    // Notify donor about new rating
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [donor_id, `You received a ${rating}-star rating! New average: ${newAvg} ⭐`]
    );

    return res.json({
      success: true,
      message: `Rating submitted! ${donor[0].first_name}'s new average: ${newAvg}`,
      new_avg: newAvg
    });
  } catch (err) {
    console.error('Submit rating error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* ----------------------------------------------------------------
   GET RATINGS FOR A DONOR
   GET /api/ratings/:donor_id
   ---------------------------------------------------------------- */
const getDonorRatings = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.rating, r.feedback, r.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS rater_name
       FROM ratings r
       JOIN users u ON r.rater_id = u.id
       WHERE r.donor_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.donor_id]
    );
    return res.json({ success: true, ratings: rows });
  } catch (err) {
    console.error('Get ratings error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { submitRating, getDonorRatings };