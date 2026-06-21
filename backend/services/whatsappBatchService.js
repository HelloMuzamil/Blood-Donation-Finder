/**
 * services/whatsappBatchService.js
 * Donor matching, batching, and WhatsApp click-to-chat link generation
 */

const DEFAULT_BATCH_SIZE = 15;
const MAX_RADIUS_KM = 10000; // Increased temporarily for testing from anywhere
const MIN_TRUST_SCORE = 0;   // Decreased temporarily so new users (score 0) can be matched

/** Blood groups a donor can give to a recipient */
const DONOR_COMPATIBILITY = {
  'O-':  ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+':  ['O+', 'A+', 'B+', 'AB+'],
  'A-':  ['A-', 'A+', 'AB-', 'AB+'],
  'A+':  ['A+', 'AB+'],
  'B-':  ['B-', 'B+', 'AB-', 'AB+'],
  'B+':  ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

function isBloodCompatible(donorBlood, recipientBlood) {
  return DONOR_COMPATIBILITY[donorBlood]?.includes(recipientBlood) ?? false;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function createBatches(donors, batchSize = DEFAULT_BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < donors.length; i += batchSize) {
    batches.push(donors.slice(i, i + batchSize));
  }
  return batches;
}

function googleMapsLink(lat, lng) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function formatUrgency(urgency) {
  const map = { critical: 'CRITICAL', urgent: 'HIGH', normal: 'NORMAL' };
  return map[urgency] || 'NORMAL';
}

function buildWhatsAppMessage(request) {
  const { blood_group, latitude, longitude, urgency } = request;
  const locationLink =
    latitude && longitude
      ? googleMapsLink(latitude, longitude)
      : request.city || 'Location not specified';

  return [
    '🚨 EMERGENCY BLOOD REQUEST',
    '',
    `🩸 Blood Group: ${blood_group}`,
    `📍 Location: ${locationLink}`,
    `⏱ Urgency: ${formatUrgency(urgency)}`,
    '',
    'Please reply YES if you are available.',
    '',
    '_Note: If you are temporarily unavailable, you can turn off alerts by unchecking Availability in your BloodConnect Profile._'
  ].join('\n');
}

function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '92' + clean.slice(1);
  if (!clean.startsWith('92') && clean.length === 10) clean = '92' + clean;
  return clean;
}

function generateWhatsAppLink(phone, message) {
  const formatted = formatPhoneForWhatsApp(phone);
  if (!formatted) return null;
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

/**
 * Filter and rank donors for an emergency request.
 * Returns donors sorted by distance ASC, trust_score DESC.
 */
function matchDonors(allDonors, request, options = {}) {
  const {
    maxRadiusKm = MAX_RADIUS_KM,
    minTrustScore = MIN_TRUST_SCORE,
    excludeUserId = null,
  } = options;

  const reqLat = parseFloat(request.latitude);
  const reqLng = parseFloat(request.longitude);

  if (!reqLat || !reqLng || isNaN(reqLat) || isNaN(reqLng)) {
    return [];
  }

  const matched = [];

  for (const donor of allDonors) {
    if (excludeUserId && donor.id === excludeUserId) continue;
    if (!donor.availability || !donor.is_active) continue;
    if (!isBloodCompatible(donor.blood_group, request.blood_group)) continue;

    const trustScore = parseFloat(donor.trust_score) || parseFloat(donor.avg_rating) || 0;
    if (trustScore < minTrustScore) continue;

    const dLat = parseFloat(donor.latitude);
    const dLng = parseFloat(donor.longitude);
    if (!dLat || !dLng || isNaN(dLat) || isNaN(dLng)) continue;

    const distance = haversineDistance(reqLat, reqLng, dLat, dLng);
    if (distance > maxRadiusKm) continue;

    matched.push({
      ...donor,
      distance_km: Math.round(distance * 10) / 10,
      trust_score: trustScore,
      whatsapp_link: generateWhatsAppLink(donor.phone, buildWhatsAppMessage(request)),
      maps_link: googleMapsLink(dLat, dLng),
    });
  }

  matched.sort((a, b) => {
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return b.trust_score - a.trust_score;
  });

  return matched;
}

/**
 * Build batch structure for admin panel.
 */
function prepareBatchQueue(matchedDonors, batchSize = DEFAULT_BATCH_SIZE) {
  const batches = createBatches(matchedDonors, batchSize);

  return batches.map((donors, index) => ({
    batch_number: index + 1,
    donor_count: donors.length,
    status: 'pending',
    donors: donors.map((d) => ({
      id: d.id,
      name: `${d.first_name} ${d.last_name}`,
      phone: d.phone,
      blood_group: d.blood_group,
      city: d.city,
      distance_km: d.distance_km,
      trust_score: d.trust_score,
      whatsapp_link: d.whatsapp_link,
      maps_link: d.maps_link,
    })),
  }));
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  MAX_RADIUS_KM,
  MIN_TRUST_SCORE,
  isBloodCompatible,
  haversineDistance,
  createBatches,
  googleMapsLink,
  buildWhatsAppMessage,
  generateWhatsAppLink,
  matchDonors,
  prepareBatchQueue,
};
