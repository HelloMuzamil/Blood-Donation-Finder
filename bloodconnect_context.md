# BloodConnect v2.0 - Complete AI Context Document

**Purpose of this document:** Provide this document to any AI agent. It contains the complete architectural context, database schema, and technical workflows of the "BloodConnect" Full-Stack web application. By reading this, an AI will instantly understand the entire codebase without needing you to paste individual files.

---

## 1. Project Overview
**BloodConnect** is a full-stack, real-time emergency blood donation network. It connects blood requesters with nearby compatible donors using an intelligent Geolocation-based matching engine (Haversine formula) and a Trust Score system to prevent spam. 

It features an Admin Dashboard where the admin can trigger automated, batched WhatsApp alerts to queued donors via pre-filled `wa.me` links.

---

## 2. Tech Stack
*   **Frontend:** Vanilla HTML5, CSS3 (Custom Design System, Glassmorphism), Vanilla JavaScript (`script.js`).
*   **Map Integration:** Leaflet.js (OpenStreetMap) for GPS pin-dropping and distance visualization.
*   **Backend:** Node.js, Express.js.
*   **Database:** MySQL (using `mysql2/promise` pool).
*   **Authentication:** JWT (JSON Web Tokens) stored in localStorage. Passwords hashed using `bcryptjs`.

---

## 3. Directory Structure
```text
bloodconnect/
├── frontend/
│   ├── index.html        # Single-Page Application (SPA) layout
│   ├── style.css         # All UI styling, custom CSS variables, dark-mode ready
│   └── script.js         # Frontend logic, API calls, DOM manipulation, Leaflet maps
│
├── backend/
│   ├── server.js         # Express app entry point & middleware setup
│   ├── config/
│   │   └── db.js         # MySQL connection pool
│   ├── controllers/
│   │   ├── authController.js     # Signup, login, JWT generation
│   │   ├── donorController.js    # Fetch donors, update availability, user profiles
│   │   ├── requestController.js  # Emergency request creation + AI Matching Engine
│   │   ├── adminController.js    # Fetch queue batches, user management
│   │   └── ratingController.js   # Submit donor ratings/reviews
│   ├── routes/           # Express router definitions for the controllers
│   ├── services/
│   │   └── whatsappBatchService.js # Haversine distance math, compatibility, batch logic
│   └── .env              # DB credentials, JWT_SECRET, PORT
│
└── database/
    └── schema.sql        # Complete MySQL tables and seed data
```

---

## 4. Database Schema Overview
The MySQL database is named `bloodconnect`.

1.  **`users` table:**
    *   Stores admins, donors, and requesters.
    *   Columns: `id`, `first_name`, `last_name`, `email`, `password` (bcrypt), `role` (admin/donor/requester/both), `blood_group`, `latitude`, `longitude`.
    *   *Anti-Spam/Ranking:* `availability` (boolean), `avg_rating`, `trust_score` (calculated metric), `is_trusted` (boolean).
2.  **`blood_requests` table:**
    *   Stores emergency requests.
    *   Columns: `id`, `patient_name`, `blood_group`, `latitude`, `longitude`, `status` (pending/processing/completed/expired).
3.  **`request_queue` table:**
    *   The core table for the WhatsApp batching system. Links a `request_id` to a `donor_id`.
    *   Columns: `id`, `request_id`, `donor_id`, `batch_number`, `status`.
4.  **`donor_ratings` table:**
    *   Stores reviews given to donors by requesters after a donation.
5.  **`notifications` table:**
    *   In-app notification system.

---

## 5. Core AI & Algorithmic Workflows

### A. The Matching Engine (`whatsappBatchService.js`)
When an emergency request is created (`requestController.js`), the system does **not** notify everyone. It runs an intelligent filter:
1.  **Blood Compatibility:** Checks standard medical compatibility (e.g., `O-` can give to anyone, `A+` can receive from `O+, O-, A+, A-`).
2.  **Availability:** Skips donors who have toggled `availability = 0`.
3.  **Trust Score Filtering:** Skips donors whose `trust_score` is lower than `MIN_TRUST_SCORE`. *(Note: For testing, MIN_TRUST_SCORE is sometimes set to 0 to allow new users to match).*
4.  **Geolocation (Haversine Formula):** Uses math to calculate the physical distance (in kilometers) between the Request's GPS coordinates and the Donor's GPS coordinates. Skips donors further than `MAX_RADIUS_KM`.
5.  **Ranking:** Sorts matched donors first by nearest distance, then by highest trust score.

### B. WhatsApp Batching System
1.  Once donors are matched, `prepareBatchQueue` groups them into batches (default size: 15).
2.  These matches are inserted into the `request_queue` table in MySQL.
3.  The Admin logs into the dashboard, views the Emergency Request, and clicks the **"Batches"** button.
4.  The Frontend opens multiple WhatsApp Web tabs sequentially. The messages are pre-filled with the patient's details and a Google Maps link to the emergency location.

### C. Frontend Architecture (`script.js`)
*   **Single Page App (SPA):** Uses a custom `showPage('pageId')` function to hide/show sections of `index.html` without reloading the page.
*   **API Wrapper:** Uses a centralized `api(endpoint, options)` wrapper function that automatically attaches the JWT token from `localStorage` to all `fetch()` requests.
*   **Leaflet Maps:** Integrates `Leaflet.js` to render maps. Requesters can click "Use My GPS" (browser geolocation API) or drag the red marker to set coordinates manually.

---

## 6. How to Instruct the Next AI
If you need to add a new feature or fix a bug, simply start a new conversation with the AI and say:

> *"Here is my complete project context document for BloodConnect:* 
> **[Paste this entire document]** 
> *Based on this architecture, I want you to help me add [Feature Name] in the [backend/frontend]. Please provide the exact code changes needed."*
