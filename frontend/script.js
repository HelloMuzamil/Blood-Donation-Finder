/**
 * BloodConnect — script.js
 * Full API-connected frontend logic
 */
'use strict';

/* ================================================================
   CONFIG
   ================================================================ */
// In production (Vercel), API is on the same domain under /api
const API_BASE = '/api';
const DEFAULT_MAP_CENTER = [31.5204, 74.3587]; // Lahore
const DEFAULT_MAP_ZOOM = 12;

/* ================================================================
   AUTH STATE
   ================================================================ */
let currentUser  = null;
let authToken    = localStorage.getItem('bc_token') || null;

/** Return JWT header object or empty object */
function authHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

/* ================================================================
   API HELPER
   ================================================================ */
async function api(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: authHeaders(),
      ...options
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  } catch (err) {
    throw err;
  }
}

/* ================================================================
   GEOLOCATION + LEAFLET MAPS
   ================================================================ */
const mapInstances = {};

function initLocationMap(mapId, latInputId, lngInputId, coordsDisplayId, initialLat, initialLng) {
  if (typeof L === 'undefined') return null;

  const container = document.getElementById(mapId);
  if (!container) return null;

  if (mapInstances[mapId]) {
    mapInstances[mapId].remove();
    delete mapInstances[mapId];
  }

  const lat = initialLat || DEFAULT_MAP_CENTER[0];
  const lng = initialLng || DEFAULT_MAP_CENTER[1];

  const map = L.map(mapId).setView([lat, lng], DEFAULT_MAP_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);

  const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

  const updateCoords = (newLat, newLng) => {
    const latEl = document.getElementById(latInputId);
    const lngEl = document.getElementById(lngInputId);
    const display = document.getElementById(coordsDisplayId);
    if (latEl) latEl.value = newLat.toFixed(6);
    if (lngEl) lngEl.value = newLng.toFixed(6);
    if (display) display.textContent = `${newLat.toFixed(4)}, ${newLng.toFixed(4)}`;
  };

  updateCoords(lat, lng);

  marker.on('dragend', () => {
    const pos = marker.getLatLng();
    updateCoords(pos.lat, pos.lng);
  });

  map.on('click', (e) => {
    marker.setLatLng(e.latlng);
    updateCoords(e.latlng.lat, e.latlng.lng);
  });

  mapInstances[mapId] = { map, marker, latInputId, lngInputId, coordsDisplayId, updateCoords };
  setTimeout(() => map.invalidateSize(), 200);
  return mapInstances[mapId];
}

function setMapLocation(mapId, lat, lng) {
  const instance = mapInstances[mapId];
  if (!instance) return;
  instance.marker.setLatLng([lat, lng]);
  instance.map.setView([lat, lng], DEFAULT_MAP_ZOOM);
  instance.updateCoords(lat, lng);
}

function detectGPS(context) {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', 'error');
    return;
  }

  const configs = {
    register:  { mapId: 'registerMap',  latId: 'regLat', lngId: 'regLng', coordsId: 'registerCoords' },
    emergency: { mapId: 'emergencyMap', latId: 'eLat',   lngId: 'eLng',   coordsId: 'emergencyCoords' },
    profile:   { mapId: 'profileMap',   latId: 'profLat', lngId: 'profLng', coordsId: 'profileCoords' },
  };

  const cfg = configs[context];
  if (!cfg) return;

  showToast('Detecting your location…', 'info');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (!mapInstances[cfg.mapId]) {
        initLocationMap(cfg.mapId, cfg.latId, cfg.lngId, cfg.coordsId, latitude, longitude);
      } else {
        setMapLocation(cfg.mapId, latitude, longitude);
      }
      showToast('✅ Location detected!', 'success');
    },
    () => showToast('Could not detect location. Click the map to set manually.', 'error'),
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function getUserCoords() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

/* ================================================================
   PAGE ROUTER
   ================================================================ */
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === pageId);
  });

  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific inits
  const inits = {
    home:      initHome,
    search:    initSearch,
    emergency: initEmergency,
    profile:   initProfile,
    admin:     initAdmin
  };
  if (inits[pageId]) inits[pageId]();
}

/* ================================================================
   HAMBURGER
   ================================================================ */
document.getElementById('hamburger').addEventListener('click', function () {
  this.classList.toggle('open');
  document.getElementById('navLinks').classList.toggle('open');
});

/* ================================================================
   AUTH — Login / Register / Logout
   ================================================================ */
async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginSubmitBtn');
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPass').value;

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    authToken   = data.token;
    currentUser = data.user;
    localStorage.setItem('bc_token', authToken);
    localStorage.setItem('bc_user',  JSON.stringify(currentUser));

    updateAuthUI();
    showToast(`✅ Welcome back, ${currentUser.first_name}!`, 'success');
    setTimeout(() => showPage('home'), 600);
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-bold ph-sign-in"></i> Login';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('regSubmitBtn');
  const body = {
    first_name:  document.getElementById('regFirst').value,
    last_name:   document.getElementById('regLast').value,
    email:       document.getElementById('regEmail').value,
    password:    document.getElementById('regPass').value,
    blood_group: document.getElementById('regBlood').value,
    city:        document.getElementById('regCity').value,
    phone:       document.getElementById('regPhone').value,
    role:        document.getElementById('regRole').value,
    latitude:    document.getElementById('regLat').value || null,
    longitude:   document.getElementById('regLng').value || null,
  };

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';

  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    authToken   = data.token;
    currentUser = data.user;
    localStorage.setItem('bc_token', authToken);
    localStorage.setItem('bc_user',  JSON.stringify(currentUser));

    updateAuthUI();
    showToast(`🎉 Account created! Welcome, ${currentUser.first_name}!`, 'success');
    setTimeout(() => showPage('home'), 600);
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-bold ph-user-plus"></i> Create Account';
  }
}

function logout() {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('bc_token');
  localStorage.removeItem('bc_user');
  updateAuthUI();
  showToast('👋 Logged out successfully.', 'info');
  showPage('home');
}

function updateAuthUI() {
  const loginBtn  = document.getElementById('loginBtn');
  const userMenu  = document.getElementById('userMenu');
  const nameEl    = document.getElementById('userNameDisplay');
  const adminLink = document.querySelector('.admin-link');

  if (currentUser) {
    loginBtn.classList.add('hidden');
    userMenu.classList.remove('hidden');
    nameEl.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
    if (adminLink) adminLink.style.display = currentUser.role === 'admin' ? '' : 'none';
  } else {
    loginBtn.classList.remove('hidden');
    userMenu.classList.add('hidden');
    if (adminLink) adminLink.style.display = 'none';
  }
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  if (tab === 'register') {
    setTimeout(() => initLocationMap('registerMap', 'regLat', 'regLng', 'registerCoords'), 300);
  }
}

function togglePass(inputId, eyeId) {
  const input = document.getElementById(inputId);
  const eye   = document.getElementById(eyeId);
  if (input.type === 'password') {
    input.type = 'text';
    eye.classList.replace('ph-eye', 'ph-eye-slash');
  } else {
    input.type = 'password';
    eye.classList.replace('ph-eye-slash', 'ph-eye');
  }
}

/* ================================================================
   NOTIFICATION SYSTEM
   ================================================================ */
document.getElementById('notifBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('notifPanel').classList.toggle('open');
  if (currentUser) loadNotifications();
});

document.addEventListener('click', () => {
  document.getElementById('notifPanel').classList.remove('open');
});

async function loadNotifications() {
  if (!authToken) return;
  try {
    const data = await api('/notifications');
    renderNotifications(data.notifications, data.unread_count);
  } catch {}
}

function renderNotifications(notifications, unreadCount) {
  const list  = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');

  badge.textContent = unreadCount;
  badge.classList.toggle('hidden', unreadCount === 0);

  if (!notifications || notifications.length === 0) {
    list.innerHTML = '<li class="notif-empty">No notifications yet</li>';
    return;
  }

  list.innerHTML = notifications.map(n => `
    <li class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif(${n.id})">
      <div class="notif-dot" style="${n.is_read ? 'background:var(--gray-200)' : ''}"></div>
      <div>
        <div class="notif-text">${n.message}</div>
        <div class="notif-time">${formatTime(n.created_at)}</div>
      </div>
    </li>
  `).join('');
}

async function readNotif(id) {
  try {
    await api(`/notifications/${id}/read`, { method: 'PUT' });
    loadNotifications();
  } catch {}
}

async function markAllRead() {
  try {
    await api('/notifications/read-all', { method: 'PUT' });
    loadNotifications();
    showToast('All notifications marked as read.', 'info');
  } catch {}
}

/* ================================================================
   HOME PAGE
   ================================================================ */
async function initHome() {
  try {
    const data = await api('/donors/stats');
    const stats = data.stats;

    // Animate Hero section counters
    animateCounter('counterDonors', stats.total_donors);
    animateCounter('counterCities', stats.total_cities);
    animateCounter('counterLives',  stats.fulfilled_requests);

    // Animate Bottom stats-band counters
    animateCounter('bandDonors',    stats.total_donors);
    animateCounter('bandCities',    stats.total_cities);
    animateCounter('bandFulfilled', stats.fulfilled_requests);

    const ratingEl = document.getElementById('bandRating');
    if (ratingEl) {
      ratingEl.textContent = `${parseFloat(stats.avg_rating || 0).toFixed(1)} ★`;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
    // Fallback animation in case API fails
    animateCounter('counterDonors', 0);
    animateCounter('counterCities', 0);
    animateCounter('counterLives',  0);
  }

  await loadHomeDonors();
}

async function loadHomeDonors() {
  const grid = document.getElementById('homeDonorGrid');
  grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading donors…</p></div>';
  try {
    const data = await api('/donors?availability=1');
    grid.innerHTML = '';
    const donors = data.donors.slice(0, 6);
    if (donors.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:40px">No donors found.</p>';
      return;
    }
    donors.forEach(d => grid.appendChild(createDonorCard(d)));
  } catch (err) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--gray-400);padding:40px">Could not load donors. Make sure backend is running.<br><small>${err.message}</small></p>`;
  }
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.ceil(target / 60);
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current.toLocaleString();
    if (current >= target) clearInterval(interval);
  }, 25);
}

function quickSearch() {
  const blood = document.getElementById('heroBlood').value;
  const city  = document.getElementById('heroCity').value;
  document.getElementById('searchBlood').value = blood;
  document.getElementById('searchCity').value  = city;
  showPage('search');
  searchDonors();
}

function filterByBlood(group) {
  document.getElementById('searchBlood').value = group;
  document.getElementById('searchCity').value  = '';
  document.getElementById('searchAvail').value = '';
  document.querySelectorAll('.blood-chip').forEach(b => {
    b.classList.toggle('selected', b.textContent.trim().replace('−', '-') === group);
  });
  showPage('search');
  searchDonors();
}

/* ================================================================
   SEARCH PAGE
   ================================================================ */
function initSearch() {
  searchDonors();
}

async function searchDonors() {
  const blood = document.getElementById('searchBlood').value;
  const city  = document.getElementById('searchCity').value.trim();
  const avail = document.getElementById('searchAvail').value;

  const grid = document.getElementById('searchDonorGrid');
  const meta = document.getElementById('resultsMeta');
  grid.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Searching…</p></div>';
  meta.textContent = '';

  const params = new URLSearchParams();
  if (blood) params.set('blood', blood);
  if (city)  params.set('city', city);
  if (avail) params.set('availability', avail);

  const coords = await getUserCoords();
  if (coords) {
    params.set('lat', coords.lat);
    params.set('lng', coords.lng);
    params.set('radius', city ? '10000' : '30');
  }

  try {
    const data = await api(`/donors?${params}`);
    grid.innerHTML = '';
    meta.textContent = `${data.count} donor${data.count !== 1 ? 's' : ''} found`;

    if (data.count === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray-400)">
          <i class="ph-bold ph-drop-slash" style="font-size:3rem;display:block;margin-bottom:12px"></i>
          No donors found for that search. Try different filters.
        </div>`;
      return;
    }

    data.donors.forEach(d => grid.appendChild(createDonorCard(d)));
  } catch (err) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--red);padding:40px">Error: ${err.message}</p>`;
  }
}

/* ================================================================
   DONOR CARD BUILDER
   ================================================================ */
function createDonorCard(d) {
  const card = document.createElement('div');
  card.className = 'donor-card';
  const initials = d.initials || `${d.first_name[0]}${d.last_name[0]}`.toUpperCase();
  const name     = d.name || `${d.first_name} ${d.last_name}`;
  const phone    = d.phone || '';

  const distanceHTML = d.distance_km != null
    ? `<span class="distance-chip"><i class="ph-bold ph-ruler"></i> ${d.distance_km} km</span>`
    : '';

  card.innerHTML = `
    <div class="donor-card-top">
      <div class="donor-avatar">${initials}</div>
      <div class="donor-info">
        <div class="donor-name">${name}</div>
        <div class="donor-city"><i class="ph-bold ph-map-pin"></i> ${d.city}</div>
      </div>
      <div class="blood-badge">${d.blood_group}</div>
    </div>
    <div class="donor-card-meta">
      <span class="avail-chip ${d.availability ? 'available' : 'unavailable'}">
        ${d.availability ? 'Available' : 'Not Available'}
      </span>
      ${d.is_trusted ? '<span class="trusted-chip"><i class="ph-bold ph-seal-check"></i> Trusted</span>' : ''}
      ${distanceHTML}
    </div>
    <div class="stars">
      ${buildStarsHTML(parseFloat(d.trust_score || d.avg_rating) || 0)}
    </div>
    <div class="donor-card-actions">
      ${phone ? `<a class="btn-call" href="tel:${phone}"><i class="ph-bold ph-phone-call"></i> Call</a>` : ''}
      ${phone ? `<button class="btn-whatsapp" onclick="whatsappDonor('${phone}')"><i class="ph-bold ph-whatsapp-logo"></i></button>` : ''}
      ${d.maps_link ? `<a class="btn-maps" href="${d.maps_link}" target="_blank" rel="noopener"><i class="ph-bold ph-map-trifold"></i></a>` : ''}
      <button class="donor-detail-btn" onclick="openDonorModal(${d.id})" title="View profile"><i class="ph-bold ph-arrow-right"></i></button>
    </div>
  `;
  return card;
}

/* ================================================================
   DONOR MODAL — Full Profile View
   ================================================================ */
async function openDonorModal(donorId) {
  showModal('<div class="loading-spinner" style="padding:40px"><div class="spinner"></div><p>Loading profile…</p></div>');

  try {
    const data = await api(`/donors/${donorId}`);
    const d = data.donor;
    const name = d.name || `${d.first_name} ${d.last_name}`;
    const initials = d.initials || `${d.first_name[0]}${d.last_name[0]}`.toUpperCase();

    const reviewsHTML = data.ratings.length > 0
      ? data.ratings.map(r => `
          <div style="padding:8px 0;border-bottom:1px solid var(--gray-50)">
            <div style="display:flex;align-items:center;gap:6px;font-size:.8rem">
              <strong>${r.rater_name}</strong>
              <span style="color:var(--amber)">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span>
            </div>
            ${r.feedback ? `<p style="font-size:.78rem;color:var(--gray-500);margin-top:3px">${r.feedback}</p>` : ''}
          </div>
        `).join('')
      : '<p style="font-size:.82rem;color:var(--gray-400)">No reviews yet.</p>';

    document.getElementById('modalBox').innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,var(--red),var(--rose));color:white;font-family:var(--font-display);font-size:1.4rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 10px">${initials}</div>
        <h3 style="font-family:var(--font-display);font-size:1.3rem;font-weight:800">${name}</h3>
        <p style="color:var(--gray-400);font-size:.85rem"><i class="ph-bold ph-map-pin"></i> ${d.city}</p>
        <div style="margin:8px 0">${buildStarsHTML(parseFloat(d.avg_rating) || 0)}</div>
        ${d.is_trusted ? '<span class="trusted-chip" style="margin:0 auto"><i class="ph-bold ph-seal-check"></i> Trusted Donor</span>' : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:.85rem">
        <div style="background:var(--gray-50);border-radius:8px;padding:10px">
          <div style="color:var(--gray-400);font-size:.72rem;margin-bottom:2px">BLOOD GROUP</div>
          <strong style="color:var(--red);font-size:1.1rem">${d.blood_group}</strong>
        </div>
        <div style="background:var(--gray-50);border-radius:8px;padding:10px">
          <div style="color:var(--gray-400);font-size:.72rem;margin-bottom:2px">DONATIONS</div>
          <strong style="font-size:1.1rem">${d.total_donations}</strong>
        </div>
        <div style="background:var(--gray-50);border-radius:8px;padding:10px">
          <div style="color:var(--gray-400);font-size:.72rem;margin-bottom:2px">STATUS</div>
          <span class="avail-chip ${d.availability ? 'available' : 'unavailable'}" style="font-size:.78rem">${d.availability ? 'Available' : 'Not Available'}</span>
        </div>
        <div style="background:var(--gray-50);border-radius:8px;padding:10px">
          <div style="color:var(--gray-400);font-size:.72rem;margin-bottom:2px">MEMBER SINCE</div>
          <strong style="font-size:.82rem">${new Date(d.created_at).getFullYear()}</strong>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${d.phone ? `<a class="btn-call" href="tel:${d.phone}" style="flex:1;justify-content:center"><i class="ph-bold ph-phone-call"></i> ${d.phone}</a>` : ''}
        <button class="btn-email" onclick="emailDonor('${d.email}')" style="flex:1;justify-content:center"><i class="ph-bold ph-envelope"></i> Email</button>
        ${d.phone ? `<button class="btn-whatsapp" onclick="whatsappDonor('${d.phone}')" style="flex:1;justify-content:center"><i class="ph-bold ph-whatsapp-logo"></i> WhatsApp</button>` : ''}
      </div>

      <div style="margin-bottom:20px">
        <h4 style="font-size:.85rem;font-weight:700;color:var(--gray-600);margin-bottom:10px">RECENT REVIEWS</h4>
        ${reviewsHTML}
      </div>

      ${currentUser && currentUser.id !== d.id ? `
        <div style="border-top:1px solid var(--gray-100);padding-top:16px">
          <h4 style="font-size:.85rem;font-weight:700;color:var(--gray-600);margin-bottom:10px">RATE THIS DONOR</h4>
          <div id="modalStars" style="display:flex;gap:6px;margin-bottom:8px">
            ${[1,2,3,4,5].map(v => `<i class="ph-bold ph-star star-btn" data-val="${v}" style="font-size:1.4rem;color:var(--gray-300);cursor:pointer" onclick="setModalRating(${v},${d.id})"></i>`).join('')}
          </div>
          <textarea id="modalFeedback" class="form-input textarea" style="min-height:60px" placeholder="Optional feedback…"></textarea>
          <button class="btn-primary btn-full mt-10" onclick="submitModalRating(${d.id})"><i class="ph-bold ph-star"></i> Submit Rating</button>
        </div>
      ` : ''}

      <button onclick="closeModal()" style="width:100%;margin-top:12px;padding:10px;border-radius:8px;background:var(--gray-100);color:var(--gray-600);font-weight:600;font-size:.85rem">Close</button>
    `;
  } catch (err) {
    document.getElementById('modalBox').innerHTML = `<p style="text-align:center;padding:20px;color:var(--red)">Error: ${err.message}</p><button onclick="closeModal()" class="btn-outline btn-full" style="margin-top:12px">Close</button>`;
  }
}

let modalSelectedRating = 0;
function setModalRating(val, donorId) {
  modalSelectedRating = val;
  document.querySelectorAll('#modalStars .star-btn').forEach((s, i) => {
    s.style.color = i < val ? '#f59e0b' : 'var(--gray-300)';
  });
}

async function submitModalRating(donorId) {
  if (!currentUser) { showToast('Please login to rate donors.', 'error'); return; }
  if (modalSelectedRating === 0) { showToast('Please select a star rating.', 'error'); return; }
  const feedback = document.getElementById('modalFeedback').value;
  try {
    const data = await api('/ratings', {
      method: 'POST',
      body: JSON.stringify({ donor_id: donorId, rating: modalSelectedRating, feedback })
    });
    showToast(`⭐ ${data.message}`, 'success');
    closeModal();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

/* ================================================================
   FULFILLMENT MODAL (Proof of Donation)
   ================================================================ */
async function openFulfillModal(requestId) {
  showModal('<div class="loading-spinner" style="padding:40px"><div class="spinner"></div><p>Loading donors…</p></div>');
  try {
    // Fetch the donors queued for this request
    const data = await api(`/requests/${requestId}/donors`);
    
    let allDonors = data.donors || [];

    if (allDonors.length === 0) {
      document.getElementById('modalBox').innerHTML = `
        <div style="padding:20px;text-align:center">
          <h3 style="font-family:var(--font-display);font-size:1.3rem;color:var(--gray-800);margin-bottom:10px">Mark as Fulfilled</h3>
          <p style="color:var(--gray-500);font-size:.9rem;margin-bottom:20px">No donors were matched for this request. Still want to mark it completed?</p>
          <button class="btn-primary btn-full" onclick="submitFulfill(${requestId}, null)">Mark Completed Without Donor</button>
          <button onclick="closeModal()" class="btn-outline btn-full mt-10">Cancel</button>
        </div>
      `;
      return;
    }

    const optionsHTML = allDonors.map(d => `
      <option value="${d.id}">${d.name} (${d.blood_group})</option>
    `).join('');

    document.getElementById('modalBox').innerHTML = `
      <div style="padding:10px;text-align:center">
        <div style="font-size:3rem;margin-bottom:10px">🎉</div>
        <h3 style="font-family:var(--font-display);font-size:1.4rem;color:var(--gray-800);margin-bottom:8px">Who gave blood?</h3>
        <p style="color:var(--gray-500);font-size:.85rem;margin-bottom:20px">Give credit to the donor who helped you! Their total donations will increase, and we'll pause their emergency alerts for 3 months.</p>
        
        <div style="text-align:left;margin-bottom:20px">
          <label style="font-size:.8rem;font-weight:700;color:var(--gray-600);margin-bottom:6px;display:block">SELECT DONOR:</label>
          <select id="fulfillDonorId" class="form-input" style="width:100%">
            <option value="">-- Select Donor --</option>
            ${optionsHTML}
            <option value="other">Someone else (Not in list)</option>
          </select>
        </div>

        <button class="btn-primary btn-full" onclick="submitFulfill(${requestId}, document.getElementById('fulfillDonorId').value)">
          ✅ Mark as Fulfilled
        </button>
        <button onclick="closeModal()" style="width:100%;margin-top:12px;padding:10px;border-radius:8px;background:var(--gray-100);color:var(--gray-600);font-weight:600;font-size:.85rem;border:none;cursor:pointer">Cancel</button>
      </div>
    `;
  } catch (err) {
    document.getElementById('modalBox').innerHTML = `<p style="text-align:center;padding:20px;color:var(--red)">Error: ${err.message}</p><button onclick="closeModal()" class="btn-outline btn-full" style="margin-top:12px">Close</button>`;
  }
}

async function submitFulfill(requestId, donorId) {
  if (donorId === '') {
    showToast('Please select a donor from the list.', 'error');
    return;
  }

  try {
    if (donorId === null || donorId === 'other') {
      // Just mark request as completed without crediting a donor
      await api(`/requests/${requestId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' })
      });
      showToast('✅ Request marked as completed!', 'success');
    } else {
      // Credit specific donor
      const data = await api(`/requests/${requestId}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({ donor_id: donorId })
      });
      showToast(`✅ ${data.message}`, 'success');
    }
    
    closeModal();
    // Reload profile
    initProfile();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

/* ================================================================
   STARS HTML
   ================================================================ */
function buildStarsHTML(rating) {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return `
    ${'<i class="ph-fill ph-star star-filled"></i>'.repeat(full)}
    ${'<i class="ph-bold ph-star star-empty"></i>'.repeat(empty)}
    <span class="rating-val">${rating > 0 ? rating.toFixed(1) : 'N/A'}</span>
  `;
}

/* ================================================================
   EMERGENCY PAGE
   ================================================================ */
async function initEmergency() {
  loadActiveRequests();
  setTimeout(() => initLocationMap('emergencyMap', 'eLat', 'eLng', 'emergencyCoords'), 300);

  const submitBtn  = document.getElementById('emergencySubmitBtn');
  const loginMsg   = document.getElementById('emergencyLoginMsg');
  if (!currentUser) {
    submitBtn.style.display  = 'none';
    loginMsg.style.display   = 'block';
  } else {
    submitBtn.style.display  = '';
    loginMsg.style.display   = 'none';
  }
}

async function loadActiveRequests() {
  const container = document.getElementById('activeRequests');
  container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading…</p></div>';
  try {
    const data = await api('/requests/active');
    if (data.count === 0) {
      container.innerHTML = '<p style="text-align:center;color:var(--gray-400);padding:24px;font-size:.875rem">No active requests right now.</p>';
      return;
    }
    container.innerHTML = data.requests.map(r => `
      <div class="req-card ${r.urgency}">
        <div class="req-card-top">
          <div class="req-blood">${r.blood_group}</div>
          <span class="req-urgency ${r.urgency}">${r.urgency}</span>
        </div>
        <div class="req-city"><i class="ph-bold ph-map-pin"></i>${r.patient_name} • ${r.city}</div>
        <div class="req-city" style="font-size:.75rem"><i class="ph-bold ph-hospital"></i> ${r.hospital || 'Location not specified'}</div>
        <div style="margin:6px 0;display:flex;gap:6px;flex-wrap:wrap">
          <a href="tel:${r.phone}" class="btn-call" style="font-size:.72rem;padding:5px 10px"><i class="ph-bold ph-phone"></i> ${r.phone}</a>
          ${r.maps_link ? `<a href="${r.maps_link}" target="_blank" class="btn-maps" style="font-size:.72rem;padding:5px 10px"><i class="ph-bold ph-map-trifold"></i> Maps</a>` : ''}
        </div>
        <div class="req-timer"><i class="ph-bold ph-clock-countdown"></i> Expires in ${r.timer}</div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--red);font-size:.85rem;padding:12px">Failed to load: ${err.message}</p>`;
  }
}

async function submitEmergency(e) {
  e.preventDefault();
  if (!currentUser) { showToast('Please login to submit a request.', 'error'); return; }

  const lat = document.getElementById('eLat').value;
  const lng = document.getElementById('eLng').value;
  if (!lat || !lng) {
    showToast('Please set the emergency location on the map or use GPS.', 'error');
    return;
  }

  const btn = document.getElementById('emergencySubmitBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>';

  const body = {
    patient_name: document.getElementById('ePatient').value,
    blood_group:  document.getElementById('eBlood').value,
    units_needed: document.getElementById('eUnits').value,
    hospital:     document.getElementById('eHospital').value,
    city:         document.getElementById('eCity').value,
    phone:        document.getElementById('ePhone').value,
    urgency:      document.querySelector('input[name="urgency"]:checked').value,
    notes:        document.getElementById('eNotes').value,
    latitude:     lat,
    longitude:    lng,
  };

  try {
    const data = await api('/requests', { method: 'POST', body: JSON.stringify(body) });
    showToast(`🚨 ${data.message}`, 'success');
    document.getElementById('emergencyForm').reset();
    loadActiveRequests();
    if (currentUser) loadNotifications();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> Submit Emergency Request';
  }
}

/* ================================================================
   PROFILE PAGE
   ================================================================ */
async function initProfile() {
  const container = document.getElementById('profileContent');

  if (!currentUser) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:80px 24px">
        <i class="ph-bold ph-user-circle" style="font-size:4rem;color:var(--gray-300);display:block;margin-bottom:16px"></i>
        <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:8px">Login to view your profile</h3>
        <p style="color:var(--gray-400);margin-bottom:20px">You need to be logged in to access your profile.</p>
        <button class="btn-primary btn-lg" onclick="showPage('login')"><i class="ph-bold ph-sign-in"></i> Login Now</button>
      </div>`;
    return;
  }

  container.innerHTML = '<div class="loading-spinner full"><div class="spinner"></div><p>Loading profile…</p></div>';

  try {
    const data = await api('/donors/profile/me');
    const p    = data.profile;
    const name = p.name || `${p.first_name} ${p.last_name}`;
    const initials = p.initials || `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
    const memberYears = Math.max(1, new Date().getFullYear() - new Date(p.created_at).getFullYear());

    const historyHTML = data.history.length > 0
      ? data.history.map(h => `
          <div class="history-item" style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <strong>${h.blood_group}</strong> — ${h.city}
                <div style="font-size:.75rem;color:var(--gray-400);margin-top:2px">${h.patient_name} · ${formatDate(h.created_at)}</div>
              </div>
              <span class="history-status ${h.status}">${h.status}</span>
            </div>
            ${h.status !== 'completed' ? `
              <button onclick="openFulfillModal(${h.id})" style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:6px;padding:6px 10px;font-size:.75rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px">
                ✅ Mark as Fulfilled
              </button>
            ` : ''}
          </div>
        `).join('')
      : '<p style="font-size:.85rem;color:var(--gray-400);text-align:center;padding:16px">No request history yet.</p>';

    container.className = 'profile-layout';
    container.innerHTML = `
      <!-- Profile Card -->
      <div class="profile-card-big">
        <div class="profile-avatar-wrap">
          <div class="profile-avatar">${initials}</div>
          <div class="blood-badge-big">${p.blood_group}</div>
        </div>
        <h2 class="profile-name">${name}</h2>
        <p class="profile-city"><i class="ph-bold ph-map-pin"></i> ${p.city}</p>

        <div class="avail-row">
          <span class="avail-label">Availability</span>
          <label class="toggle-switch">
            <input type="checkbox" id="availToggle" ${p.availability ? 'checked' : ''} onchange="updateAvailStatus()" />
            <span class="toggle-slider"></span>
          </label>
          <span class="avail-status ${p.availability ? '' : 'offline'}" id="availStatus">
            ${p.availability ? 'Available' : 'Not Available'}
          </span>
        </div>

        <div class="rating-section">
          <span class="rating-label">Donor Rating</span>
          <div class="stars-display">${buildStarsHTML(parseFloat(p.avg_rating) || 0)}</div>
        </div>

        ${p.is_trusted ? '<div class="trust-badge"><i class="ph-bold ph-seal-check"></i> Trusted Donor</div>' : ''}

        <div class="profile-stats">
          <div class="pstat"><strong>${p.total_donations}</strong><span>Donations</span></div>
          <div class="pstat"><strong>${parseFloat(p.avg_rating).toFixed(1)}</strong><span>Rating</span></div>
          <div class="pstat"><strong>${memberYears}yr${memberYears > 1 ? 's' : ''}</strong><span>Member</span></div>
        </div>

        <div class="contact-btns">
          ${p.phone ? `<a class="btn-call" href="tel:${p.phone}"><i class="ph-bold ph-phone-call"></i> ${p.phone}</a>` : ''}
          <button class="btn-email" onclick="emailDonor('${p.email}')"><i class="ph-bold ph-envelope"></i> Email</button>
          ${p.phone ? `<button class="btn-whatsapp" onclick="whatsappDonor('${p.phone}')"><i class="ph-bold ph-whatsapp-logo"></i> WhatsApp</button>` : ''}
        </div>
      </div>

      <!-- Details Column -->
      <div class="profile-details">
        <div class="detail-card">
          <h3><i class="ph-bold ph-user"></i> Personal Info</h3>
          <div class="detail-row"><span>Full Name</span><strong>${name}</strong></div>
          <div class="detail-row"><span>Email</span><strong>${p.email}</strong></div>
          <div class="detail-row"><span>Blood Group</span><strong class="red-text">${p.blood_group}</strong></div>
          <div class="detail-row"><span>City</span><strong>${p.city}</strong></div>
          <div class="detail-row"><span>Phone</span><strong>${p.phone || 'Not set'}</strong></div>
          <div class="detail-row"><span>Trust Score</span><strong>${parseFloat(p.trust_score || p.avg_rating || 0).toFixed(1)} ★</strong></div>
          <div class="detail-row"><span>Role</span><strong style="text-transform:capitalize">${p.role}</strong></div>
          <div class="detail-row"><span>Member Since</span><strong>${formatDate(p.created_at)}</strong></div>
          ${p.maps_link ? `<a href="${p.maps_link}" target="_blank" class="btn-maps btn-full" style="margin-top:12px;justify-content:center"><i class="ph-bold ph-map-trifold"></i> View on Google Maps</a>` : ''}
        </div>

        <div class="detail-card">
          <h3><i class="ph-bold ph-map-trifold"></i> Update Location</h3>
          <p class="map-hint">Drag the pin or use GPS to update your donor location.</p>
          <div id="profileMap" class="location-map"></div>
          <div class="map-coords-row">
            <button type="button" class="btn-outline btn-sm" onclick="detectGPS('profile')">
              <i class="ph-bold ph-crosshair"></i> Use My GPS
            </button>
            <span class="coords-display" id="profileCoords">${p.latitude && p.longitude ? `${parseFloat(p.latitude).toFixed(4)}, ${parseFloat(p.longitude).toFixed(4)}` : 'No location set'}</span>
          </div>
          <input type="hidden" id="profLat" value="${p.latitude || ''}" />
          <input type="hidden" id="profLng" value="${p.longitude || ''}" />
          <button class="btn-primary btn-full mt-10" onclick="saveProfileLocation()">
            <i class="ph-bold ph-floppy-disk"></i> Save Location
          </button>
        </div>

        <div class="detail-card">
          <h3><i class="ph-bold ph-clock-counter-clockwise"></i> Request History</h3>
          <div class="history-list">${historyHTML}</div>
        </div>
      </div>
    `;

    setTimeout(() => {
      initLocationMap(
        'profileMap', 'profLat', 'profLng', 'profileCoords',
        p.latitude ? parseFloat(p.latitude) : null,
        p.longitude ? parseFloat(p.longitude) : null
      );
    }, 300);
  } catch (err) {
    container.innerHTML = `<p style="text-align:center;padding:40px;color:var(--red)">Error loading profile: ${err.message}</p>`;
  }
}

async function saveProfileLocation() {
  const lat = document.getElementById('profLat')?.value;
  const lng = document.getElementById('profLng')?.value;
  if (!lat || !lng) {
    showToast('Please set your location on the map first.', 'error');
    return;
  }
  try {
    const avail = document.getElementById('availToggle')?.checked ?? true;
    await api('/donors/availability', {
      method: 'PUT',
      body: JSON.stringify({ availability: avail, latitude: lat, longitude: lng }),
    });
    showToast('✅ Location saved!', 'success');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

async function updateAvailStatus() {
  const checked  = document.getElementById('availToggle').checked;
  const statusEl = document.getElementById('availStatus');
  try {
    await api('/donors/availability', {
      method: 'PUT',
      body: JSON.stringify({ availability: checked })
    });
    statusEl.textContent = checked ? 'Available' : 'Not Available';
    statusEl.className   = 'avail-status' + (checked ? '' : ' offline');
    showToast(checked ? '✅ You are now Available' : '⛔ You are now Unavailable', checked ? 'success' : 'info');
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    document.getElementById('availToggle').checked = !checked; // revert
  }
}

/* ================================================================
   ADMIN PAGE
   ================================================================ */
async function initAdmin() {
  if (!currentUser || currentUser.role !== 'admin') {
    document.getElementById('page-admin').innerHTML = `
      <div style="text-align:center;padding:80px 24px;padding-top:152px">
        <i class="ph-bold ph-lock" style="font-size:4rem;color:var(--gray-300);display:block;margin-bottom:16px"></i>
        <h3 style="font-family:var(--font-display);font-size:1.4rem;margin-bottom:8px">Admin Access Only</h3>
        <p style="color:var(--gray-400)">Login as admin@bloodconnect.com to access this panel.</p>
        <button class="btn-primary btn-lg" style="margin-top:20px" onclick="showPage('login')">Login as Admin</button>
      </div>`;
    return;
  }

  document.getElementById('adminDate').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  await Promise.all([loadAdminStats(), loadAdminUsers(), loadAdminRequests()]);
}

async function loadAdminStats() {
  try {
    const data = await api('/admin/stats');
    const s = data.stats;
    document.getElementById('adminStats').innerHTML = `
      <div class="admin-stat-card red"><i class="ph-bold ph-users"></i><div><strong>${s.total_users}</strong><span>Total Users</span></div></div>
      <div class="admin-stat-card rose"><i class="ph-bold ph-drop"></i><div><strong>${s.active_donors}</strong><span>Active Donors</span></div></div>
      <div class="admin-stat-card amber"><i class="ph-bold ph-siren"></i><div><strong>${s.active_requests}</strong><span>Active Requests</span></div></div>
      <div class="admin-stat-card green"><i class="ph-bold ph-check-circle"></i><div><strong>${s.fulfilled_requests}</strong><span>Requests Fulfilled</span></div></div>
    `;
  } catch (err) {
    document.getElementById('adminStats').innerHTML = `<p style="color:var(--red);padding:20px">Error: ${err.message}</p>`;
  }
}

async function loadAdminUsers() {
  const tbody = document.getElementById('adminUsersTable');
  try {
    const data = await api('/admin/users');
    tbody.innerHTML = data.users.map(u => `
      <tr>
        <td>
          <div style="font-weight:700;color:var(--gray-800)">${u.name}</div>
          <div style="font-size:.75rem;color:var(--gray-400)">${u.email || '—'}</div>
        </td>
        <td><span class="role-badge ${u.role}">${u.role}</span></td>
        <td>${u.city || '—'}</td>
        <td><strong style="color:var(--red);font-size:1rem">${u.blood_group || '—'}</strong></td>
        <td>
          <span style="font-size:.8rem;color:var(--gray-600)">${u.phone || '—'}</span>
        </td>
        <td>
          <span style="font-weight:700;color:#16a34a">${u.total_donations || 0}</span>
          <span style="font-size:.7rem;color:var(--gray-400)"> donations</span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:4px">
            <span style="font-size:.75rem">${u.availability ? '🟢 Available' : '🔴 Unavailable'}</span>
          </div>
        </td>
        <td><span class="status-badge ${u.is_active ? 'active' : 'inactive'}">${u.is_active ? 'active' : 'suspended'}</span></td>
        <td style="white-space:nowrap">
          <button class="action-btn" onclick="adminToggleUser(${u.id}, ${u.is_active})">
            ${u.is_active ? 'Suspend' : 'Activate'}
          </button>
          <button class="action-btn" style="margin-left:4px;background:var(--red-light);color:var(--red)" onclick="adminDeleteUser(${u.id}, '${u.name}')">Delete</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="color:var(--red);text-align:center">Error: ${err.message}</td></tr>`;
  }
}

async function loadAdminRequests() {
  const tbody = document.getElementById('adminRequestsTable');
  try {
    const data = await api('/admin/requests');
    // Only show active requests (pending / processing) — hide completed & expired
    const active = data.requests.filter(r => r.status === 'pending' || r.status === 'processing');
    if (active.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--gray-400);padding:20px">✅ No active emergency requests</td></tr>`;
      return;
    }
    tbody.innerHTML = active.map(r => `
      <tr>
        <td>${r.patient_name}</td>
        <td><strong style="color:var(--red)">${r.blood_group}</strong></td>
        <td>${r.city}</td>
        <td>${r.queue_count > 0 ? `<span class="queue-badge">${r.queue_count} donors</span>` : '—'}</td>
        <td><span class="req-urgency ${r.urgency}">${r.urgency}</span></td>
        <td><span class="status-badge ${r.status}">${r.status}</span></td>
        <td>
          ${r.queue_count > 0
            ? `<button class="action-btn batch-btn" onclick="openBatchPanel(${r.id})"><i class="ph-bold ph-whatsapp-logo"></i> Batches</button>`
            : r.maps_link
              ? `<a href="${r.maps_link}" target="_blank" class="action-btn">Maps</a>`
              : '—'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:var(--red);text-align:center">Error: ${err.message}</td></tr>`;
  }
}

/* ================================================================
   ADMIN BATCH ALERT PANEL
   ================================================================ */
let activeBatchRequestId = null;

function closeBatchPanel() {
  document.getElementById('batchPanel').classList.add('hidden');
  activeBatchRequestId = null;
}

async function openBatchPanel(requestId) {
  activeBatchRequestId = requestId;
  const panel = document.getElementById('batchPanel');
  panel.classList.remove('hidden');
  document.getElementById('batchList').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading batches…</p></div>';

  try {
    const data = await api(`/admin/requests/${requestId}/batches`);
    const req = data.request;

    document.getElementById('batchPanelSubtitle').textContent =
      `${req.patient_name} — ${req.blood_group} — ${req.city}`;

    document.getElementById('batchRequestInfo').innerHTML = `
      <div class="batch-info-grid">
        <div><span>Urgency</span><strong class="req-urgency ${req.urgency}">${req.urgency}</strong></div>
        <div><span>Matched Donors</span><strong>${data.total_donors}</strong></div>
        <div><span>Total Batches</span><strong>${data.total_batches}</strong></div>
        <div><span>Status</span><strong>${req.status}</strong></div>
        ${req.maps_link ? `<a href="${req.maps_link}" target="_blank" class="btn-maps"><i class="ph-bold ph-map-trifold"></i> Request Location</a>` : ''}
      </div>
      <div id="aiOutreachContainer" style="margin-top: 12px;">
        <button class="btn-ai-sparkle" onclick="generateAIOutreach(${requestId}, this)">
          <i class="ph-bold ph-sparkle"></i> Generate AI Outreach WhatsApp Text
        </button>
      </div>
    `;

    if (data.batches.length === 0) {
      document.getElementById('batchList').innerHTML =
        '<p class="batch-empty">No donor batches for this request. Ensure location coordinates were provided.</p>';
      return;
    }

    // ── Send ALL button (step-by-step wizard) ──
    const allSent = data.batches.every(b => b.status === 'sent');
    const sendAllBanner = !allSent ? `
      <div style="margin-bottom:16px;padding:18px 20px;background:linear-gradient(135deg,#7c3aed,#6d28d9);border-radius:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <div>
          <div style="color:#fff;font-weight:800;font-size:1rem;">📲 Alert ${data.total_donors} Donors — One by One</div>
          <div style="color:#ddd6fe;font-size:.78rem;margin-top:4px;">Guided wizard — send 1 WhatsApp at a time, no popup block!</div>
        </div>
        <button id="sendAllBtn" onclick="sendAllBatches(${requestId}, ${data.total_donors})" style="background:#fff;color:#7c3aed;border:none;border-radius:10px;padding:12px 20px;font-weight:800;font-size:.88rem;cursor:pointer;white-space:nowrap;flex-shrink:0">
          🚀 Start Alerting
        </button>
      </div>
    ` : '<p style="text-align:center;color:#16a34a;font-weight:700;padding:10px 0;">✅ All donors have already been alerted!</p>';

    document.getElementById('batchList').innerHTML = sendAllBanner + data.batches.map(batch => `
      <div class="batch-card ${batch.status}">
        <div class="batch-card-header">
          <h4>Batch ${batch.batch_number} <span class="batch-count">(${batch.donors.length} donors)</span></h4>
          <span class="batch-status-badge ${batch.status}">${batch.status}</span>
        </div>
        <div class="batch-donors">
          ${batch.donors.map(d => `
            <div class="batch-donor-row">
              <div class="batch-donor-info">
                <strong>${d.name}</strong>
                <span>${d.blood_group} · ${d.city} · ★${d.trust_score.toFixed(1)}</span>
              </div>
              <div class="batch-donor-actions">
                ${d.whatsapp_link ? `<a href="${d.whatsapp_link}" target="_blank" class="btn-whatsapp btn-sm"><i class="ph-bold ph-whatsapp-logo"></i></a>` : ''}
                ${d.maps_link ? `<a href="${d.maps_link}" target="_blank" class="btn-maps btn-sm"><i class="ph-bold ph-map-trifold"></i></a>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${batch.status !== 'sent'
          ? `<button class="btn-primary btn-full batch-send-btn" onclick="sendBatch(${requestId}, ${batch.batch_number})">
               <i class="ph-bold ph-paper-plane-tilt"></i> Send Batch ${batch.batch_number}
             </button>`
          : `<p class="batch-sent-msg"><i class="ph-bold ph-check-circle"></i> Batch ${batch.batch_number} already sent</p>`}
      </div>
    `).join('');

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    document.getElementById('batchList').innerHTML = `<p class="batch-empty" style="color:var(--red)">Error: ${err.message}</p>`;
  }
}

// ── ALERT WIZARD STATE ──────────────────────────────────────────
let wizardDonors = [];
let wizardIndex  = 0;
let wizardReqId  = null;

async function sendAllBatches(requestId, totalDonors) {
  // Fetch all donor links first
  try {
    const btn = document.getElementById('sendAllBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

    const data = await api(`/admin/requests/${requestId}/batches/send-all`, { method: 'POST' });
    startAlertWizard(requestId, data.links);

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    const btn = document.getElementById('sendAllBtn');
    if (btn) { btn.disabled = false; btn.textContent = '📲 Start Alerting Donors'; }
  }
}

async function sendBatch(requestId, batchNum) {
  try {
    const data = await api(`/admin/requests/${requestId}/batches/${batchNum}/send`, { method: 'POST' });
    startAlertWizard(requestId, data.links);
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

function startAlertWizard(requestId, donors) {
  wizardDonors = donors;
  wizardIndex  = 0;
  wizardReqId  = requestId;

  if (wizardDonors.length === 0) {
    showToast('No donors found in this batch!', 'error');
    return;
  }

  // Create wizard overlay
  let overlay = document.getElementById('alertWizardOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'alertWizardOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:9999;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = 'flex';
  renderWizardStep();
}

function renderWizardStep() {
  const overlay = document.getElementById('alertWizardOverlay');
  if (!overlay) return;

  const total   = wizardDonors.length;
  const current = wizardDonors[wizardIndex];
  const progress = Math.round(((wizardIndex) / total) * 100);
  const isLast  = wizardIndex === total - 1;

  if (wizardIndex >= total) {
    // All done!
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:40px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.3)">
        <div style="font-size:3.5rem;margin-bottom:12px">✅</div>
        <h2 style="font-family:var(--font-display);font-size:1.6rem;color:#16a34a;margin-bottom:8px">All Done!</h2>
        <p style="color:#6b7280;margin-bottom:24px">All <strong>${total}</strong> donors have been processed!</p>
        <button onclick="closeAlertWizard()" style="background:linear-gradient(135deg,var(--red),var(--rose));color:#fff;border:none;border-radius:10px;padding:14px 32px;font-size:1rem;font-weight:700;cursor:pointer;width:100%">Close</button>
      </div>`;
    openBatchPanel(wizardReqId);
    loadAdminRequests();
    return;
  }

  const hasPhone = !!current.whatsapp_link;

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:32px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
      
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="font-family:var(--font-display);font-weight:800;font-size:1.1rem;color:var(--gray-800)">🩸 Alert Wizard</div>
        <div style="font-size:.82rem;color:var(--gray-400);background:var(--gray-50);padding:4px 10px;border-radius:20px">${wizardIndex + 1} of ${total}</div>
      </div>

      <!-- Progress Bar -->
      <div style="height:6px;background:#f3f4f6;border-radius:99px;margin-bottom:24px;overflow:hidden">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,var(--red),var(--rose));border-radius:99px;transition:width .4s ease"></div>
      </div>

      <!-- Donor Card -->
      <div style="background:linear-gradient(135deg,#fff5f5,#fff);border:2px solid #fee2e2;border-radius:14px;padding:20px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
          <div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,var(--red),var(--rose));color:#fff;font-family:var(--font-display);font-size:1.2rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${current.name ? current.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?'}
          </div>
          <div>
            <div style="font-family:var(--font-display);font-weight:800;font-size:1.1rem;color:var(--gray-900)">${current.name || 'Unknown'}</div>
            <div style="font-size:.82rem;color:var(--gray-500);margin-top:2px">
              <strong style="color:var(--red)">${current.blood_group}</strong> · ${current.city} · ★ ${(current.trust_score || 0).toFixed(1)}
            </div>
          </div>
        </div>
        <div style="background:#fff;border-radius:8px;padding:10px 14px;font-size:.85rem;color:var(--gray-600)">
          📱 <strong>${current.phone || '<span style="color:red">No phone number registered</span>'}</strong>
        </div>
      </div>

      ${hasPhone ? `
        <!-- Action Message Preview -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px 14px;font-size:.78rem;color:#166534;margin-bottom:20px">
          <strong>💬 Message will contain:</strong> ${ document.getElementById('aiOutreachText') ? 'Custom AI message generated from the button.' : 'Patient name, blood group, urgency level, hospital location + Google Maps link' }
        </div>
        
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <button 
            onclick="wizardSendAndNext()"
            style="flex:2;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:12px;padding:16px;font-size:1rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px"
          >
            <i class="ph-bold ph-whatsapp-logo" style="font-size:1.2rem"></i>
            ${isLast ? 'Send & Finish' : 'Send & Next →'}
          </button>
          
          <button 
            id="autoSendBtn"
            onclick="toggleAutoSend()"
            style="flex:1;background:var(--gray-800);color:#fff;border:none;border-radius:12px;padding:16px;font-size:.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px"
            title="Automatically opens a tab every 2 seconds. Ensure popups are allowed!"
          >
            <i class="ph-bold ph-play"></i> Auto-Send
          </button>
        </div>
      ` : `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 14px;font-size:.8rem;color:#b91c1c;margin-bottom:20px;text-align:center">
          ⚠️ Cannot send WhatsApp message because this donor has no phone number.
        </div>
        <button 
          onclick="wizardSkip()"
          style="width:100%;background:var(--red);color:#fff;border:none;border-radius:12px;padding:16px;font-size:1rem;font-weight:700;cursor:pointer;margin-bottom:10px"
        >
          ${isLast ? 'Skip & Finish' : 'Skip & Next Donor →'}
        </button>
      `}

      <button 
        onclick="wizardSkip()"
        style="width:100%;background:var(--gray-100);color:var(--gray-600);border:none;border-radius:10px;padding:12px;font-size:.88rem;font-weight:600;cursor:pointer"
      >
        Skip This Donor
      </button>

      <button 
        onclick="closeAlertWizard()"
        style="width:100%;background:transparent;color:var(--gray-400);border:none;padding:10px;font-size:.82rem;cursor:pointer;margin-top:4px"
      >
        ✕ Cancel
      </button>
    </div>`;
}

function wizardSendAndNext() {
  const donor = wizardDonors[wizardIndex];
  if (donor && donor.phone) {
    let link = donor.whatsapp_link;
    // DYNAMICALLY OVERRIDE WITH AI MESSAGE IF IT EXISTS
    const aiTextArea = document.getElementById('aiOutreachText');
    if (aiTextArea && aiTextArea.value.trim()) {
      const cleanPhone = donor.phone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(aiTextArea.value.trim());
      link = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    }
    
    const popup = window.open(link, '_blank');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      showToast("Popup blocked! Please allow popups for Auto-Send to work.", "error");
      if (autoSendTimer) toggleAutoSend(); // Pause if blocked
    }
  }
  wizardIndex++;
  renderWizardStep();
}

function wizardSkip() {
  wizardIndex++;
  renderWizardStep();
}

let autoSendTimer = null;
function toggleAutoSend() {
  const btn = document.getElementById('autoSendBtn');
  if (!btn) return;
  
  if (autoSendTimer) {
    clearInterval(autoSendTimer);
    autoSendTimer = null;
    btn.innerHTML = '<i class="ph-bold ph-play"></i> Auto-Send';
    btn.style.background = 'var(--gray-800)';
  } else {
    btn.innerHTML = '<i class="ph-bold ph-pause"></i> Pause';
    btn.style.background = 'var(--red)';
    autoSendTimer = setInterval(() => {
      if (wizardIndex >= wizardDonors.length) {
        toggleAutoSend(); // Stop when done
        return;
      }
      wizardSendAndNext();
    }, 2000); // 2 seconds between tabs to avoid aggressive blocking
  }
}

function closeAlertWizard() {
  if (autoSendTimer) toggleAutoSend(); // Clear interval if running
  const overlay = document.getElementById('alertWizardOverlay');
  if (overlay) overlay.style.display = 'none';
  wizardDonors = [];
  wizardIndex  = 0;
  wizardReqId  = null;
}

async function adminToggleUser(id, currentStatus) {
  if (!confirm(`Are you sure you want to ${currentStatus ? 'suspend' : 'activate'} this user?`)) return;
  try {
    const data = await api(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !currentStatus })
    });
    showToast(data.message, 'success');
    loadAdminUsers();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

async function adminDeleteUser(id, name) {
  if (!confirm(`DELETE user "${name}"? This action cannot be undone.`)) return;
  try {
    const data = await api(`/admin/users/${id}`, { method: 'DELETE' });
    showToast(data.message, 'success');
    loadAdminUsers();
    loadAdminStats();
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
  }
}

/* ================================================================
   CONTACT ACTIONS
   ================================================================ */
function emailDonor(email) {
  window.location.href = `mailto:${email}?subject=Blood%20Donation%20Request&body=Hello%2C%20I%20need%20your%20help%20for%20blood%20donation.`;
  showToast(`📧 Opening email to ${email}`, 'info');
}

function whatsappDonor(phone) {
  const clean = phone.replace(/\D/g, '');
  window.open(`https://wa.me/${clean}?text=Hello!%20I%20need%20your%20help%20for%20blood%20donation.%20Please%20contact%20me.`, '_blank');
}

/* ================================================================
   MODAL
   ================================================================ */
function showModal(html) {
  document.getElementById('modalBox').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalSelectedRating = 0;
}

/* ================================================================
   TOAST
   ================================================================ */
let toastTimeout;
function showToast(message, type = '') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3800);
}

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hrs   = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hrs < 24)  return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/* ================================================================
   NAVBAR SCROLL EFFECT
   ================================================================ */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').style.boxShadow =
    window.scrollY > 10 ? '0 4px 24px rgba(217,43,58,.15)' : '0 2px 16px rgba(217,43,58,.08)';
});

/* ================================================================
   INIT ON LOAD
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Restore session from localStorage
  const savedUser  = localStorage.getItem('bc_user');
  const savedToken = localStorage.getItem('bc_token');
  if (savedUser && savedToken) {
    currentUser = JSON.parse(savedUser);
    authToken   = savedToken;
    updateAuthUI();
    loadNotifications();
  }

  initHome();
});

/* ================================================================
   AI CHATBOT CLIENT & OUTREACH GENERATOR
   ================================================================ */
let aiChatHistory = [];

function toggleAIChat() {
  const windowEl = document.getElementById('aiChatWindow');
  windowEl.classList.toggle('open');
  if (windowEl.classList.contains('open')) {
    document.getElementById('aiChatInput').focus();
  }
}

function handleAIChatKey(e) {
  if (e.key === 'Enter') {
    sendAIChatMessage();
  }
}

async function sendAIChatMessage() {
  const inputEl = document.getElementById('aiChatInput');
  const query = inputEl.value.trim();
  if (!query) return;

  inputEl.value = '';
  const messagesContainer = document.getElementById('aiChatMessages');

  // Render User Message
  const userMsgEl = document.createElement('div');
  userMsgEl.className = 'ai-msg user';
  userMsgEl.innerHTML = `<p>${escapeHtml(query)}</p>`;
  messagesContainer.appendChild(userMsgEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Render Typing Indicator
  const typingEl = document.createElement('div');
  typingEl.className = 'ai-typing-indicator';
  typingEl.id = 'aiTyping';
  typingEl.innerHTML = `
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
  `;
  messagesContainer.appendChild(typingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  try {
    const data = await api('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message: query, history: aiChatHistory })
    });

    // Add to history
    aiChatHistory.push({ role: 'user', text: query });
    aiChatHistory.push({ role: 'model', text: data.response });

    // Remove Typing Indicator
    const typing = document.getElementById('aiTyping');
    if (typing) typing.remove();

    // Render Bot Message
    const botMsgEl = document.createElement('div');
    botMsgEl.className = 'ai-msg bot';
    const formatted = formatMarkdown(data.response);
    
    botMsgEl.innerHTML = `
      ${formatted}
      <div class="ai-feedback-container">
        <button class="ai-feedback-btn" onclick="sendAIVote(${data.logId}, 1, this)" title="Helpful"><i class="ph-bold ph-thumbs-up"></i></button>
        <button class="ai-feedback-btn" onclick="sendAIVote(${data.logId}, -1, this)" title="Unhelpful"><i class="ph-bold ph-thumbs-down"></i></button>
      </div>
    `;
    messagesContainer.appendChild(botMsgEl);
  } catch (err) {
    const typing = document.getElementById('aiTyping');
    if (typing) typing.remove();
    const errorEl = document.createElement('div');
    errorEl.className = 'ai-msg bot';
    errorEl.style.color = 'var(--red)';
    errorEl.innerHTML = `<p>Error: ${err.message}</p>`;
    messagesContainer.appendChild(errorEl);
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendAIVote(logId, vote, btn) {
  try {
    await api('/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ logId, feedback: vote })
    });
    showToast('Feedback logged! Thank you.', 'success');
    
    const container = btn.parentElement;
    container.querySelectorAll('.ai-feedback-btn').forEach(b => {
      b.classList.remove('active-up', 'active-down');
    });
    if (vote === 1) btn.classList.add('active-up');
    if (vote === -1) btn.classList.add('active-down');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function generateAIOutreach(requestId, btn) {
  const container = document.getElementById('aiOutreachContainer');
  btn.disabled = true;
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i class="ph-bold ph-circle-notch spinner-slow"></i> Generating…';

  try {
    const data = await api('/ai/generate-outreach', {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });

    container.innerHTML = `
      <div class="ai-outreach-container">
        <div class="ai-outreach-header">
          <span>✨ AI Generated WhatsApp Message</span>
          <button class="btn-outline btn-sm" onclick="copyAIOutreachText()" style="padding:2px 8px;font-size:0.75rem"><i class="ph-bold ph-copy"></i> Copy</button>
        </div>
        <textarea class="ai-outreach-text" id="aiOutreachText">${data.outreachText}</textarea>
        <div style="font-size:0.7rem;color:var(--gray-400);margin-top:6px;text-align:right">You can edit the message above before copying.</div>
      </div>
    `;
  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function copyAIOutreachText() {
  const textarea = document.getElementById('aiOutreachText');
  if (!textarea) return;
  textarea.select();
  document.execCommand('copy');
  showToast('📋 Message copied to clipboard!', 'success');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
  // Bold: **text** -> <strong>text</strong>
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format list items and paragraphs
  formatted = formatted.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const items = trimmed.split('\n').map(li => {
        const cleaned = li.trim().replace(/^[-*]\s*/, '');
        return `<li>${cleaned}</li>`;
      }).join('');
      return `<ul>${items}</ul>`;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  
  return formatted;
}