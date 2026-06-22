/**
 * middleware/validate.js
 * ─────────────────────────────────────────────────────────────────
 * Central validation middleware for BloodConnect.
 * Each exported function is a middleware that checks specific fields
 * and returns a clear, friendly error message if validation fails.
 *
 * Usage (in routes):
 *   const { validateRegister } = require('../middleware/validate');
 *   router.post('/register', validateRegister, register);
 * ─────────────────────────────────────────────────────────────────
 */

// ── Valid values ───────────────────────────────────────────────────────────────

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_ROLES        = ['donor', 'requester', 'both', 'admin'];
const VALID_URGENCIES    = ['normal', 'urgent', 'critical'];
const VALID_STATUSES     = ['pending', 'processing', 'completed', 'expired'];

// ── Regex patterns ─────────────────────────────────────────────────────────────

/**
 * Accepts:
 *  - Pakistani mobile: 03XX-XXXXXXX or 03XXXXXXXXX (10-11 digits)
 *  - International:    +92-3XX-XXXXXXX or +1234567890 etc.
 */
const PHONE_REGEX    = /^(\+?\d{1,4}[\s\-]?)?(\(?\d{2,4}\)?[\s\-]?)?\d{3,4}[\s\-]?\d{4,7}$/;

/** Standard email */
const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Latitude: -90 to 90 */
const LAT_RANGE      = { min: -90,  max: 90  };

/** Longitude: -180 to 180 */
const LNG_RANGE      = { min: -180, max: 180 };

// ── Helper ─────────────────────────────────────────────────────────────────────

/**
 * Sends a 422 Unprocessable Entity with a structured error response.
 * @param {object} res
 * @param {string} field   - Which field failed
 * @param {string} message - Human-readable reason
 */
function validationError(res, field, message) {
  return res.status(422).json({
    success: false,
    error  : 'Validation Error',
    field,
    message,
    hint   : `Please check the value you provided for "${field}" and try again.`,
  });
}

/** Trim string or return empty */
const trim = (v) => (typeof v === 'string' ? v.trim() : '');

// ── Individual field validators (pure functions) ───────────────────────────────

function checkFirstName(first_name, res) {
  const v = trim(first_name);
  if (!v)             return validationError(res, 'first_name', 'First name is required.');
  if (v.length < 2)   return validationError(res, 'first_name', 'First name must be at least 2 characters long.');
  if (v.length > 50)  return validationError(res, 'first_name', 'First name must not exceed 50 characters.');
  if (!/^[a-zA-Z\s\-'.]+$/.test(v))
    return validationError(res, 'first_name', 'First name can only contain letters, spaces, hyphens, and apostrophes.');
  return null;
}

function checkLastName(last_name, res) {
  const v = trim(last_name);
  if (!v)             return validationError(res, 'last_name', 'Last name is required.');
  if (v.length < 2)   return validationError(res, 'last_name', 'Last name must be at least 2 characters long.');
  if (v.length > 50)  return validationError(res, 'last_name', 'Last name must not exceed 50 characters.');
  if (!/^[a-zA-Z\s\-'.]+$/.test(v))
    return validationError(res, 'last_name', 'Last name can only contain letters, spaces, hyphens, and apostrophes.');
  return null;
}

function checkEmail(email, res) {
  const v = trim(email);
  if (!v)                    return validationError(res, 'email', 'Email address is required.');
  if (!EMAIL_REGEX.test(v))  return validationError(res, 'email', 'Please enter a valid email address (e.g. name@example.com).');
  if (v.length > 100)        return validationError(res, 'email', 'Email address must not exceed 100 characters.');
  return null;
}

function checkPassword(password, res) {
  const v = trim(password);
  if (!v)            return validationError(res, 'password', 'Password is required.');
  if (v.length < 8)  return validationError(res, 'password', 'Password must be at least 8 characters long.');
  if (v.length > 72) return validationError(res, 'password', 'Password must not exceed 72 characters.');
  if (!/[A-Z]/.test(v))
    return validationError(res, 'password', 'Password must contain at least one uppercase letter (A-Z).');
  if (!/[a-z]/.test(v))
    return validationError(res, 'password', 'Password must contain at least one lowercase letter (a-z).');
  if (!/[0-9]/.test(v))
    return validationError(res, 'password', 'Password must contain at least one number (0-9).');
  return null;
}

function checkPhone(phone, res, { required = false } = {}) {
  if (!phone && !required) return null;  // Optional field — skip if empty
  const v = trim(phone);
  if (required && !v)
    return validationError(res, 'phone', 'Phone number is required.');
  if (v && !PHONE_REGEX.test(v))
    return validationError(res, 'phone', 'Please enter a valid phone number (e.g. 03001234567 or +923001234567).');
  if (v && (v.replace(/\D/g, '').length < 7 || v.replace(/\D/g, '').length > 15))
    return validationError(res, 'phone', 'Phone number must be between 7 and 15 digits.');
  return null;
}

function checkBloodGroup(blood_group, res) {
  const v = trim(blood_group).toUpperCase();
  if (!v)
    return validationError(res, 'blood_group', 'Blood group is required.');
  if (!VALID_BLOOD_GROUPS.includes(v))
    return validationError(res, 'blood_group', `Invalid blood group "${blood_group}". Valid values: ${VALID_BLOOD_GROUPS.join(', ')}.`);
  return null;
}

function checkCity(city, res) {
  const v = trim(city);
  if (!v)           return validationError(res, 'city', 'City is required.');
  if (v.length < 2) return validationError(res, 'city', 'City name must be at least 2 characters long.');
  if (v.length > 100) return validationError(res, 'city', 'City name must not exceed 100 characters.');
  if (!/^[a-zA-Z\s\-'.]+$/.test(v))
    return validationError(res, 'city', 'City name can only contain letters, spaces, hyphens, and apostrophes.');
  return null;
}

function checkRole(role, res, { required = false } = {}) {
  if (!role && !required) return null;
  const v = trim(role).toLowerCase();
  if (!VALID_ROLES.includes(v))
    return validationError(res, 'role', `Invalid role "${role}". Valid values: ${VALID_ROLES.filter(r => r !== 'admin').join(', ')}.`);
  return null;
}

function checkLatitude(latitude, res, { required = false } = {}) {
  if (latitude === undefined || latitude === null || latitude === '') {
    if (required) return validationError(res, 'latitude', 'Latitude is required.');
    return null;
  }
  const v = parseFloat(latitude);
  if (isNaN(v) || v < LAT_RANGE.min || v > LAT_RANGE.max)
    return validationError(res, 'latitude', `Latitude must be a number between ${LAT_RANGE.min} and ${LAT_RANGE.max}.`);
  return null;
}

function checkLongitude(longitude, res, { required = false } = {}) {
  if (longitude === undefined || longitude === null || longitude === '') {
    if (required) return validationError(res, 'longitude', 'Longitude is required.');
    return null;
  }
  const v = parseFloat(longitude);
  if (isNaN(v) || v < LNG_RANGE.min || v > LNG_RANGE.max)
    return validationError(res, 'longitude', `Longitude must be a number between ${LNG_RANGE.min} and ${LNG_RANGE.max}.`);
  return null;
}

function checkUrgency(urgency, res, { required = false } = {}) {
  if (!urgency && !required) return null;
  const v = trim(urgency).toLowerCase();
  if (!VALID_URGENCIES.includes(v))
    return validationError(res, 'urgency', `Invalid urgency "${urgency}". Valid values: ${VALID_URGENCIES.join(', ')}.`);
  return null;
}

function checkStatus(status, res) {
  const v = trim(status).toLowerCase();
  if (!v)                     return validationError(res, 'status', 'Status is required.');
  if (!VALID_STATUSES.includes(v))
    return validationError(res, 'status', `Invalid status "${status}". Valid values: ${VALID_STATUSES.join(', ')}.`);
  return null;
}

function checkPatientName(patient_name, res) {
  const v = trim(patient_name);
  if (!v)           return validationError(res, 'patient_name', 'Patient name is required.');
  if (v.length < 2) return validationError(res, 'patient_name', 'Patient name must be at least 2 characters.');
  if (v.length > 100) return validationError(res, 'patient_name', 'Patient name must not exceed 100 characters.');
  return null;
}

function checkRating(rating, res) {
  const v = parseInt(rating, 10);
  if (isNaN(v))     return validationError(res, 'rating', 'Rating is required and must be a number.');
  if (v < 1 || v > 5)
    return validationError(res, 'rating', 'Rating must be between 1 and 5 stars.');
  return null;
}

function checkFeedbackText(feedback, res, { required = false } = {}) {
  if (!feedback && !required) return null;
  const v = trim(feedback);
  if (v.length > 500)
    return validationError(res, 'feedback', 'Feedback text must not exceed 500 characters.');
  return null;
}

function checkUnitsNeeded(units, res) {
  if (units === undefined || units === null || units === '') return null; // optional
  const v = parseInt(units, 10);
  if (isNaN(v) || v < 1 || v > 20)
    return validationError(res, 'units_needed', 'Units needed must be a number between 1 and 20.');
  return null;
}

// ── Composed route validators ──────────────────────────────────────────────────

/** POST /api/auth/register */
const validateRegister = (req, res, next) => {
  const { first_name, last_name, email, password, phone, city, blood_group, role, latitude, longitude } = req.body;

  return (
    checkFirstName(first_name, res) ||
    checkLastName(last_name, res)   ||
    checkEmail(email, res)          ||
    checkPassword(password, res)    ||
    checkPhone(phone, res)          ||
    checkCity(city, res)            ||
    checkBloodGroup(blood_group, res) ||
    checkRole(role, res)            ||
    checkLatitude(latitude, res)    ||
    checkLongitude(longitude, res)  ||
    next()
  );
};

/** POST /api/auth/login */
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  return (
    checkEmail(email, res)    ||
    (!trim(password) ? validationError(res, 'password', 'Password is required.') : null) ||
    next()
  );
};

/** PUT /api/donors/profile */
const validateUpdateProfile = (req, res, next) => {
  const { first_name, last_name, phone, city, blood_group, latitude, longitude } = req.body;

  return (
    checkFirstName(first_name, res)   ||
    checkLastName(last_name, res)     ||
    checkPhone(phone, res)            ||
    checkCity(city, res)              ||
    checkBloodGroup(blood_group, res) ||
    checkLatitude(latitude, res)      ||
    checkLongitude(longitude, res)    ||
    next()
  );
};

/** PUT /api/donors/availability */
const validateAvailability = (req, res, next) => {
  const { availability, latitude, longitude } = req.body;

  if (availability === undefined || availability === null) {
    return validationError(res, 'availability', 'Availability (true/false) is required.');
  }
  if (typeof availability !== 'boolean' && availability !== 0 && availability !== 1
      && availability !== 'true' && availability !== 'false') {
    return validationError(res, 'availability', 'Availability must be true or false.');
  }

  return (
    checkLatitude(latitude, res)   ||
    checkLongitude(longitude, res) ||
    next()
  );
};

/** POST /api/requests */
const validateCreateRequest = (req, res, next) => {
  const { patient_name, blood_group, phone, city, urgency, units_needed, latitude, longitude } = req.body;

  return (
    checkPatientName(patient_name, res)  ||
    checkBloodGroup(blood_group, res)    ||
    checkPhone(phone, res, { required: true }) ||
    checkCity(city, res)                 ||
    checkUrgency(urgency, res)           ||
    checkUnitsNeeded(units_needed, res)  ||
    checkLatitude(latitude, res)         ||
    checkLongitude(longitude, res)       ||
    next()
  );
};

/** PUT /api/requests/:id/status */
const validateUpdateStatus = (req, res, next) => {
  return checkStatus(req.body.status, res) || next();
};

/** POST /api/requests/:id/fulfill */
const validateFulfill = (req, res, next) => {
  const { donor_id } = req.body;
  if (!donor_id || isNaN(parseInt(donor_id, 10))) {
    return validationError(res, 'donor_id', 'A valid donor_id (number) is required.');
  }
  return next();
};

/** POST /api/ratings */
const validateRating = (req, res, next) => {
  const { donor_id, rating, feedback } = req.body;

  if (!donor_id || isNaN(parseInt(donor_id, 10))) {
    return validationError(res, 'donor_id', 'A valid donor_id (number) is required.');
  }

  return (
    checkRating(rating, res)               ||
    checkFeedbackText(feedback, res)       ||
    next()
  );
};

/** POST /api/ai/chat */
const validateAIChat = (req, res, next) => {
  const { message } = req.body;
  const v = trim(message);
  if (!v)            return validationError(res, 'message', 'Message is required.');
  if (v.length < 3)  return validationError(res, 'message', 'Message must be at least 3 characters.');
  if (v.length > 2000) return validationError(res, 'message', 'Message must not exceed 2000 characters.');
  return next();
};

/** POST /api/ai/generate-outreach */
const validateAIOutreach = (req, res, next) => {
  const { requestId } = req.body;
  if (!requestId || isNaN(parseInt(requestId, 10))) {
    return validationError(res, 'requestId', 'A valid blood request ID (number) is required.');
  }
  return next();
};

/** POST /api/ai/feedback */
const validateAIFeedback = (req, res, next) => {
  const { logId, feedback } = req.body;
  if (!logId || isNaN(parseInt(logId, 10))) {
    return validationError(res, 'logId', 'A valid logId (number) is required.');
  }
  const v = parseInt(feedback, 10);
  if (isNaN(v) || ![-1, 0, 1].includes(v)) {
    return validationError(res, 'feedback', 'Feedback must be 1 (thumbs up), 0 (neutral), or -1 (thumbs down).');
  }
  return next();
};

// ── Exports ────────────────────────────────────────────────────────────────────

module.exports = {
  // Auth
  validateRegister,
  validateLogin,
  // Donors
  validateUpdateProfile,
  validateAvailability,
  // Requests
  validateCreateRequest,
  validateUpdateStatus,
  validateFulfill,
  // Ratings
  validateRating,
  // AI
  validateAIChat,
  validateAIOutreach,
  validateAIFeedback,
  // Individual checkers (re-exported for test use)
  VALID_BLOOD_GROUPS,
  VALID_URGENCIES,
  VALID_STATUSES,
};
