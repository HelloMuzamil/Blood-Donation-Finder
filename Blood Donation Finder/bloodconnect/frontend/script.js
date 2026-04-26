/**
 * BloodConnect — script.js
 * All interactivity: page routing, donor data, search, forms, UI components
 */

'use strict';

/* ================================================================
   DUMMY DATA — Donors
   ================================================================ */
const donors = [
  { id: 1, name: 'Ahmed Khan',      initials: 'AK', blood: 'A+',  city: 'Lahore',    phone: '+92-300-1234567', email: 'ahmed@email.com',   available: true,  rating: 4.9, reviews: 47, trusted: true,  donations: 23 },
  { id: 2, name: 'Sara Malik',      initials: 'SM', blood: 'O-',  city: 'Karachi',   phone: '+92-321-2345678', email: 'sara@email.com',    available: true,  rating: 4.7, reviews: 31, trusted: true,  donations: 15 },
  { id: 3, name: 'Bilal Raza',      initials: 'BR', blood: 'B+',  city: 'Islamabad', phone: '+92-333-3456789', email: 'bilal@email.com',   available: false, rating: 4.2, reviews: 18, trusted: false, donations: 9  },
  { id: 4, name: 'Ayesha Noor',     initials: 'AN', blood: 'AB+', city: 'Lahore',    phone: '+92-311-4567890', email: 'ayesha@email.com',  available: true,  rating: 5.0, reviews: 62, trusted: true,  donations: 34 },
  { id: 5, name: 'Usman Tariq',     initials: 'UT', blood: 'O+',  city: 'Faisalabad',phone: '+92-345-5678901', email: 'usman@email.com',   available: true,  rating: 4.5, reviews: 22, trusted: false, donations: 11 },
  { id: 6, name: 'Zara Ahmed',      initials: 'ZA', blood: 'A-',  city: 'Multan',    phone: '+92-303-6789012', email: 'zara@email.com',    available: false, rating: 4.0, reviews: 8,  trusted: false, donations: 5  },
  { id: 7, name: 'Hamza Sheikh',    initials: 'HS', blood: 'B-',  city: 'Karachi',   phone: '+92-315-7890123', email: 'hamza@email.com',   available: true,  rating: 4.8, reviews: 39, trusted: true,  donations: 21 },
  { id: 8, name: 'Fatima Zahra',    initials: 'FZ', blood: 'AB-', city: 'Islamabad', phone: '+92-322-8901234', email: 'fatima@email.com',  available: true,  rating: 4.6, reviews: 27, trusted: true,  donations: 16 },
  { id: 9, name: 'Omar Farooq',     initials: 'OF', blood: 'O+',  city: 'Lahore',    phone: '+92-344-9012345', email: 'omar@email.com',    available: false, rating: 3.8, reviews: 12, trusted: false, donations: 7  },
  { id:10, name: 'Nadia Hussain',   initials: 'NH', blood: 'A+',  city: 'Rawalpindi',phone: '+92-300-0123456', email: 'nadia@email.com',   available: true,  rating: 4.4, reviews: 19, trusted: false, donations: 10 },
  { id:11, name: 'Kamran Ali',      initials: 'KA', blood: 'B+',  city: 'Peshawar',  phone: '+92-312-1234560', email: 'kamran@email.com',  available: true,  rating: 4.7, reviews: 33, trusted: true,  donations: 18 },
  { id:12, name: 'Hina Baig',       initials: 'HB', blood: 'O-',  city: 'Quetta',    phone: '+92-330-2345671', email: 'hina@email.com',    available: true,  rating: 4.3, reviews: 14, trusted: false, donations: 8  },
];

/* ================================================================
   DUMMY DATA — Notifications
   ================================================================ */
const notifications = [
  { id: 1, msg: 'New emergency request: O+ blood needed in Lahore', time: '2 min ago', read: false },
  { id: 2, msg: 'Sara Malik rated you ★★★★★ — Excellent donor!', time: '1 hour ago', read: false },
  { id: 3, msg: 'Your donation request has been fulfilled.', time: '3 hours ago', read: false },
  { id: 4, msg: 'Reminder: You are eligible to donate again after Jan 2025.', time: '1 day ago', read: true },
  { id: 5, msg: 'New donor registered near you: B+ in Karachi.', time: '2 days ago', read: true },
];

/* ================================================================
   DUMMY DATA — Emergency Requests
   ================================================================ */
const activeRequests = [
  { patient: 'Ali Hassan',   blood: 'O+',  city: 'Lahore',    urgency: 'critical', timer: '01:23:10' },
  { patient: 'Maria Anwar',  blood: 'A-',  city: 'Karachi',   urgency: 'urgent',   timer: '02:45:33' },
  { patient: 'Tariq Mehmood',blood: 'B+',  city: 'Islamabad', urgency: 'normal',   timer: '05:12:00' },
];

/* ================================================================
   DUMMY DATA — Admin Users
   ================================================================ */
const adminUsers = [
  { name: 'Ahmed Khan',    role: 'donor',     city: 'Lahore',    status: 'active'   },
  { name: 'Sara Malik',    role: 'donor',     city: 'Karachi',   status: 'active'   },
  { name: 'John Admin',    role: 'admin',     city: 'Islamabad', status: 'active'   },
  { name: 'Bilal Raza',    role: 'requester', city: 'Faisalabad',status: 'inactive' },
  { name: 'Ayesha Noor',   role: 'donor',     city: 'Lahore',    status: 'active'   },
  { name: 'Omar Farooq',   role: 'requester', city: 'Multan',    status: 'active'   },
];

/* ================================================================
   DUMMY DATA — Admin Requests
   ================================================================ */
const adminRequests = [
  { patient: 'Ali Hassan',    blood: 'O+', city: 'Lahore',    urgency: 'critical', status: 'pending'   },
  { patient: 'Maria Anwar',   blood: 'A-', city: 'Karachi',   urgency: 'urgent',   status: 'fulfilled' },
  { patient: 'Raza Shah',     blood: 'B+', city: 'Islamabad', urgency: 'normal',   status: 'expired'   },
  { patient: 'Nida Mehmood',  blood: 'AB+',city: 'Peshawar',  urgency: 'urgent',   status: 'pending'   },
  { patient: 'Tariq Hussain', blood: 'O-', city: 'Quetta',    urgency: 'critical', status: 'pending'   },
];

/* ================================================================
   DUMMY DATA — Donation History (Profile page)
   ================================================================ */
const donationHistory = [
  { blood: 'A+', city: 'Lahore',    date: 'Jan 15, 2025', status: 'completed' },
  { blood: 'A+', city: 'Faisalabad',date: 'Aug 10, 2024', status: 'completed' },
  { blood: 'A+', city: 'Lahore',    date: 'Mar 05, 2024', status: 'completed' },
  { blood: 'A+', city: 'Karachi',   date: 'Nov 22, 2023', status: 'expired'   },
];

/* ================================================================
   PAGE ROUTER
   ================================================================ */
/**
 * Show the requested page and update the nav active state.
 * @param {string} pageId - The page identifier string
 */
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Show target
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');

  // Update nav active link
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === pageId);
  });

  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');

  // Scroll top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Page-specific init
  if (pageId === 'home')      initHome();
  if (pageId === 'search')    initSearch();
  if (pageId === 'admin')     initAdmin();
  if (pageId === 'profile')   initProfile();
  if (pageId === 'emergency') initEmergency();
}

/* ================================================================
   HAMBURGER TOGGLE
   ================================================================ */
document.getElementById('hamburger').addEventListener('click', function () {
  this.classList.toggle('open');
  document.getElementById('navLinks').classList.toggle('open');
});

/* ================================================================
   NOTIFICATION PANEL
   ================================================================ */
/**
 * Render notifications into the panel and toggle its visibility
 */
document.getElementById('notifBtn').addEventListener('click', function (e) {
  e.stopPropagation();
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('open');
  renderNotifications();
});

// Close panel when clicking elsewhere
document.addEventListener('click', () => {
  document.getElementById('notifPanel').classList.remove('open');
});

function renderNotifications() {
  const list = document.getElementById('notifList');
  list.innerHTML = notifications.map(n => `
    <li class="notif-item ${n.read ? '' : 'unread'}" onclick="readNotif(${n.id})">
      <div class="notif-dot" style="${n.read ? 'background:var(--gray-200)' : ''}"></div>
      <div>
        <div class="notif-text">${n.msg}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    </li>
  `).join('');
  updateBadge();
}

function readNotif(id) {
  const notif = notifications.find(n => n.id === id);
  if (notif) notif.read = true;
  renderNotifications();
}

function markAllRead() {
  notifications.forEach(n => n.read = true);
  renderNotifications();
}

function updateBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notifBadge');
  badge.textContent = unread;
  badge.classList.toggle('hidden', unread === 0);
}

/* ================================================================
   STAR RATING UTILITIES
   ================================================================ */
/**
 * Returns HTML string for a star display (filled + empty)
 * @param {number} rating - e.g. 4.7
 * @returns {string} HTML
 */
function buildStarsHTML(rating) {
  const full  = Math.floor(rating);
  const empty = 5 - full;
  return `
    ${'<i class="ph-fill ph-star star-filled"></i>'.repeat(full)}
    ${'<i class="ph-bold ph-star star-empty"></i>'.repeat(empty)}
    <span class="rating-val">${rating.toFixed(1)}</span>
  `;
}

/* ================================================================
   DONOR CARD BUILDER
   ================================================================ */
/**
 * Build and return a donor card element
 * @param {object} d - Donor data object
 * @returns {HTMLElement}
 */
function createDonorCard(d) {
  const card = document.createElement('div');
  card.className = 'donor-card';
  card.innerHTML = `
    <div class="donor-card-top">
      <div class="donor-avatar">${d.initials}</div>
      <div class="donor-info">
        <div class="donor-name">${d.name}</div>
        <div class="donor-city"><i class="ph-bold ph-map-pin"></i> ${d.city}</div>
      </div>
      <div class="blood-badge">${d.blood}</div>
    </div>
    <div class="donor-card-meta">
      <span class="avail-chip ${d.available ? 'available' : 'unavailable'}">
        ${d.available ? 'Available' : 'Not Available'}
      </span>
      ${d.trusted ? '<span class="trusted-chip"><i class="ph-bold ph-seal-check"></i> Trusted</span>' : ''}
    </div>
    <div class="stars">${buildStarsHTML(d.rating)}<span style="font-size:.75rem;color:var(--gray-400);margin-left:4px">(${d.reviews})</span></div>
    <div class="donor-card-actions">
      <button class="btn-call" onclick="callDonor('${d.name}')"><i class="ph-bold ph-phone-call"></i> Call</button>
      <button class="btn-email" onclick="emailDonor('${d.email}')"><i class="ph-bold ph-envelope"></i> Email</button>
      <button class="donor-detail-btn" onclick="showPage('profile')"><i class="ph-bold ph-arrow-right"></i></button>
    </div>
  `;
  return card;
}

/* ================================================================
   HOME PAGE INIT
   ================================================================ */
function initHome() {
  // Render first 6 donors in home grid
  const grid = document.getElementById('homeDonorGrid');
  grid.innerHTML = '';
  donors.slice(0, 6).forEach(d => grid.appendChild(createDonorCard(d)));

  // Animate counters
  animateCounter('counterDonors', 1240);
  animateCounter('counterCities', 98);
  animateCounter('counterLives', 4810);
}

/**
 * Animate a numeric counter element up to target value
 */
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

/* ================================================================
   QUICK SEARCH (Home hero bar)
   ================================================================ */
function quickSearch() {
  const blood = document.getElementById('heroBlood').value;
  const city  = document.getElementById('heroCity').value;
  // Pass values to search page
  document.getElementById('searchBlood').value = blood;
  document.getElementById('searchCity').value  = city;
  showPage('search');
  searchDonors();
}

/* ================================================================
   BLOOD GROUP FILTER (Home chips)
   ================================================================ */
function filterByBlood(group) {
  document.getElementById('searchBlood').value = group;
  document.getElementById('searchCity').value  = '';
  showPage('search');
  searchDonors();
  // Highlight selected chip
  document.querySelectorAll('.blood-chip').forEach(b => {
    b.classList.toggle('selected', b.textContent.trim().replace('−','-') === group.replace('-','-'));
  });
}

/* ================================================================
   SEARCH PAGE INIT & SEARCH LOGIC
   ================================================================ */
function initSearch() {
  searchDonors(); // Show all by default
}

function searchDonors() {
  const blood = document.getElementById('searchBlood').value.toLowerCase();
  const city  = document.getElementById('searchCity').value.toLowerCase().trim();
  const avail = document.getElementById('searchAvail').value;

  let results = donors.filter(d => {
    const matchBlood = !blood || d.blood.toLowerCase() === blood;
    const matchCity  = !city  || d.city.toLowerCase().includes(city);
    const matchAvail = !avail || (avail === 'available' ? d.available : !d.available);
    return matchBlood && matchCity && matchAvail;
  });

  const grid = document.getElementById('searchDonorGrid');
  const meta = document.getElementById('resultsMeta');
  grid.innerHTML = '';
  meta.textContent = `${results.length} donor${results.length !== 1 ? 's' : ''} found`;

  if (results.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--gray-400)">
        <i class="ph-bold ph-drop-slash" style="font-size:3rem;display:block;margin-bottom:12px"></i>
        No donors found for that search. Try different filters.
      </div>`;
    return;
  }

  results.forEach(d => grid.appendChild(createDonorCard(d)));
}

/* ================================================================
   EMERGENCY PAGE INIT
   ================================================================ */
function initEmergency() {
  const container = document.getElementById('activeRequests');
  container.innerHTML = activeRequests.map(r => `
    <div class="req-card ${r.urgency}">
      <div class="req-card-top">
        <div class="req-blood">${r.blood}</div>
        <span class="req-urgency ${r.urgency}">${r.urgency}</span>
      </div>
      <div class="req-city"><i class="ph-bold ph-map-pin"></i>${r.patient} • ${r.city}</div>
      <div class="req-timer"><i class="ph-bold ph-clock-countdown"></i>Expires in ${r.timer}</div>
    </div>
  `).join('');
}

/**
 * Handle emergency form submission
 * @param {Event} e
 */
function submitEmergency(e) {
  e.preventDefault();
  const blood   = document.getElementById('eBlood').value;
  const city    = document.getElementById('eCity').value;
  const urgency = document.querySelector('input[name="urgency"]:checked').value;
  const patient = document.getElementById('ePatient').value;
  const units   = document.getElementById('eUnits').value;

  // Add to active requests list (dummy)
  activeRequests.unshift({ patient, blood, city, urgency, timer: '02:59:59' });
  initEmergency();

  // Show success toast
  showToast(`🚨 Emergency request submitted for ${patient} (${blood} in ${city})`, 'success');

  // Add notification
  notifications.unshift({
    id: Date.now(),
    msg: `New emergency: ${blood} needed in ${city} — ${units} unit(s)`,
    time: 'Just now',
    read: false
  });
  updateBadge();

  // Reset form
  document.getElementById('emergencyForm').reset();
}

/* ================================================================
   PROFILE PAGE INIT
   ================================================================ */
function initProfile() {
  // Render profile stars (read-only display)
  const starsEl = document.getElementById('profileStars');
  starsEl.innerHTML = buildStarsHTML(4.9);

  // Render interactive stars for rating widget
  initInteractiveStars();

  // Render donation history
  const histEl = document.getElementById('historyList');
  histEl.innerHTML = donationHistory.map(h => `
    <div class="history-item">
      <div>
        <strong>${h.blood}</strong> — ${h.city}
        <div style="font-size:0.75rem;color:var(--gray-400);margin-top:2px">${h.date}</div>
      </div>
      <span class="history-status ${h.status}">${h.status}</span>
    </div>
  `).join('');
}

/* ================================================================
   AVAILABILITY TOGGLE
   ================================================================ */
function updateAvailStatus() {
  const checked = document.getElementById('availToggle').checked;
  const statusEl = document.getElementById('availStatus');
  statusEl.textContent = checked ? 'Available' : 'Not Available';
  statusEl.className = 'avail-status' + (checked ? '' : ' offline');
  showToast(
    checked ? '✅ You are now marked as Available' : '⛔ You are now marked as Unavailable',
    checked ? 'success' : 'info'
  );
}

/* ================================================================
   INTERACTIVE STAR RATING
   ================================================================ */
let selectedRating = 0;

function initInteractiveStars() {
  selectedRating = 0;
  const stars = document.querySelectorAll('.star-btn');
  stars.forEach(star => {
    star.classList.remove('active');
    // Hover: highlight up to hovered star
    star.addEventListener('mouseenter', function () {
      const val = parseInt(this.dataset.val);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
    });
    // Mouse leave: revert to selected
    star.addEventListener('mouseleave', function () {
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= selectedRating));
    });
    // Click: lock selection
    star.addEventListener('click', function () {
      selectedRating = parseInt(this.dataset.val);
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= selectedRating));
    });
  });
}

function submitRating() {
  if (selectedRating === 0) {
    showToast('Please select a star rating first.', 'error');
    return;
  }
  const feedback = document.getElementById('ratingFeedback').value;
  showToast(`⭐ Thank you! You rated Ahmed ${selectedRating}/5 star${selectedRating > 1 ? 's' : ''}.`, 'success');
  document.getElementById('ratingFeedback').value = '';
  selectedRating = 0;
  initInteractiveStars();
}

/* ================================================================
   CONTACT ACTIONS
   ================================================================ */
function callDonor(name) {
  showModal(`
    <h3 style="color:var(--red);margin-bottom:12px"><i class="ph-bold ph-phone-call"></i> Calling ${name}</h3>
    <p style="font-size:.9rem;color:var(--gray-600);margin-bottom:20px">Initiating call to <strong>${name}</strong>. In the full app this would use a real phone number.</p>
    <button class="btn-primary btn-full" onclick="closeModal()">Close</button>
  `);
}

function emailDonor(email) {
  window.location.href = `mailto:${email}?subject=Blood%20Donation%20Request`;
  showToast(`📧 Opening email to ${email}`, 'info');
}

function whatsappDonor(phone) {
  const url = `https://wa.me/${phone.replace(/\D/g,'')}?text=Hello!%20I%20need%20your%20help%20for%20blood%20donation.`;
  window.open(url, '_blank');
}

/* ================================================================
   ADMIN PAGE INIT
   ================================================================ */
function initAdmin() {
  // Set date
  const dateEl = document.getElementById('adminDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }

  // Render Users Table
  const usersBody = document.getElementById('adminUsersTable');
  usersBody.innerHTML = adminUsers.map(u => `
    <tr>
      <td>${u.name}</td>
      <td><span class="role-badge ${u.role}">${u.role}</span></td>
      <td>${u.city}</td>
      <td><span class="status-badge ${u.status}">${u.status}</span></td>
      <td><button class="action-btn" onclick="adminAction('${u.name}')">Manage</button></td>
    </tr>
  `).join('');

  // Render Requests Table
  const reqBody = document.getElementById('adminRequestsTable');
  reqBody.innerHTML = adminRequests.map(r => `
    <tr>
      <td>${r.patient}</td>
      <td><strong style="color:var(--red)">${r.blood}</strong></td>
      <td>${r.city}</td>
      <td><span class="req-urgency ${r.urgency}">${r.urgency}</span></td>
      <td><span class="status-badge ${r.status}">${r.status}</span></td>
    </tr>
  `).join('');
}

function adminAction(name) {
  showModal(`
    <h3 style="margin-bottom:16px">Manage User: ${name}</h3>
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="btn-outline" onclick="showToast('Profile viewed','info');closeModal()"><i class="ph-bold ph-eye"></i> View Profile</button>
      <button class="btn-outline" onclick="showToast('User suspended','info');closeModal()"><i class="ph-bold ph-pause"></i> Suspend Account</button>
      <button style="background:var(--red);color:white;padding:10px;border-radius:8px;font-weight:600" onclick="showToast('User deleted','success');closeModal()"><i class="ph-bold ph-trash"></i> Delete User</button>
    </div>
  `);
}

/* ================================================================
   LOGIN / REGISTER
   ================================================================ */
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
}

function handleLogin(e) {
  e.preventDefault();
  showToast('✅ Logged in successfully! Welcome back.', 'success');
  setTimeout(() => showPage('home'), 800);
}

function handleRegister(e) {
  e.preventDefault();
  showToast('🎉 Account created! You can now log in.', 'success');
  setTimeout(() => switchTab('login'), 1000);
}

/* Toggle password visibility */
function togglePass(inputId) {
  const input = document.getElementById(inputId);
  const eyeId = inputId === 'loginPass' ? 'loginEye' : 'regEye';
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
   TOAST NOTIFICATION
   ================================================================ */
let toastTimeout;
/**
 * Show a temporary toast message
 * @param {string} message
 * @param {'success'|'error'|'info'|''} type
 */
function showToast(message, type = '') {
  clearTimeout(toastTimeout);
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
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
}

/* ================================================================
   NAVBAR SCROLL EFFECT
   ================================================================ */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  navbar.style.boxShadow = window.scrollY > 10
    ? '0 4px 24px rgba(217,43,58,0.15)'
    : '0 2px 16px rgba(217,43,58,0.08)';
});

/* ================================================================
   INIT ON LOAD
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initHome();
  renderNotifications();
});