
/**
 * controllers/authController.js
 * Handles user registration and login
 */
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

/* ----------------------------------------------------------------
   REGISTER
   ---------------------------------------------------------------- */
const register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone, city, blood_group, role, latitude, longitude } = req.body;

    // Validation
    if (!first_name || !last_name || !email || !password || !blood_group || !city) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const lat = latitude ? parseFloat(latitude) : null;
    const lng = longitude ? parseFloat(longitude) : null;

    const [result] = await db.query(
      `INSERT INTO users (first_name, last_name, email, password, phone, city, blood_group, role, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email, hashedPassword, phone || null, city, blood_group, role || 'donor', lat, lng]
    );

    // Create welcome notification
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
      [result.insertId, `Welcome to BloodConnect, ${first_name}! Your profile is now active.`]
    );

    // Generate JWT
    const token = jwt.sign(
      { id: result.insertId, email, role: role || 'donor' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: result.insertId, first_name, last_name, email, role: role || 'donor',
        city, blood_group, latitude: lat, longitude: lng,
      }
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/* ----------------------------------------------------------------
   LOGIN
   ---------------------------------------------------------------- */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find user
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id:           user.id,
        first_name:   user.first_name,
        last_name:    user.last_name,
        email:        user.email,
        role:         user.role,
        city:         user.city,
        blood_group:  user.blood_group,
        availability: user.availability,
        avg_rating:   user.avg_rating,
        trust_score:  user.trust_score,
        is_trusted:   user.is_trusted,
        total_donations: user.total_donations,
        latitude:     user.latitude,
        longitude:    user.longitude,
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

/* ----------------------------------------------------------------
   GET CURRENT USER (me)
   ---------------------------------------------------------------- */
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email, role, phone, city, blood_group,
              availability, total_donations, avg_rating, trust_score, is_trusted,
              latitude, longitude, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { register, login, getMe };