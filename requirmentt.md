# 🩸 Blood Donation Finder - Advanced Project Requirements

## 📌 Project Overview
Blood Donation Finder is a full-stack MERN application designed to help users quickly locate blood donors during emergencies. The system includes real-time features, location-based search, emergency alerts, and a trust-based donor rating system.

---

## 🎯 Objectives
- Provide instant access to nearby blood donors
- Enable emergency blood requests with priority handling
- Ensure donor reliability via rating and verification
- Improve communication between donors and recipients

---

## 👥 User Roles

### 1. Guest User
- Search donors by blood group and city
- View limited donor info

### 2. Registered User (Donor/Requester)
- Create and manage profile
- Set availability status
- Send/receive blood requests
- Rate donors after interaction

### 3. Admin
- Monitor system activity
- Manage users and requests
- Handle reports and fake accounts

---

## ⚙️ Functional Requirements

---

### 🧠 1. Emergency Request System
- Users can create emergency blood requests
- Required fields:
  - Blood group
  - Location (city)
  - Urgency level (Normal / Urgent)
  - Contact details
- Each request has:
  - Timestamp
  - Expiry time (e.g., 3 hours)
- Requests are visible to all donors in dashboard

---

### 📍 2. Location-Based Search
- Users can search donors based on:
  - Blood group
  - City
- (Optional Advanced)
  - Show nearest donors using coordinates
  - Display distance from user

---

### 🔔 3. Notification System
- In-app notifications for:
  - New emergency requests
  - Contact requests
- Notification panel (bell icon)
- Mark notifications as read/unread

---

### 🟢 5. Availability Toggle
- Donors can switch status:
  - Available
  - Not Available
- Only available donors appear in search results (optional filter)

---

### 🧾 6. Request History
- Users can view:
  - Past requests
  - Status (Pending / Completed / Expired)
- Each request stores:
  - Date
  - Blood group
  - Contacted donors

---

### 💬 7. Basic Chat System (Optional Advanced)
- One-to-one chat between donor and requester
- Messages stored in database
- Simple UI (no need real-time socket)

---

### 🛡️ 8. Admin Panel (Advanced)
- Dashboard stats:
  - Total users
  - Total donors
  - Active requests
- Admin actions:
  - Delete users
  - Remove fake donors
  - View reports

---

### 📞 11. Contact System (Improved)
- Donor profile includes:
  - Phone number
  - Email
- Buttons:
  - Call Now
  - Email
- (Optional)
  - WhatsApp redirect link

---

### ⭐ Donor Rating System
- After interaction, users can:
  - Rate donor (1–5 stars)
  - Leave optional feedback
- Average rating shown on donor profile
- Highly rated donors get “Trusted Donor” badge

---

## 💾 Database Requirements (Extended)

### Users
- id
- name
- email
- password
- role

### Donors
- id
- user_id
- blood_group
- city
- phone
- availability
- rating (average)

### Requests
- id
- user_id
- blood_group
- city
- urgency
- status
- created_at
- expires_at

### Ratings
- id
- donor_id
- user_id
- rating
- feedback

### Notifications
- id
- user_id
- message
- status (read/unread)
- created_at

---

## 🔄 System Flow (Advanced)
1. User registers/logs in
2. Donor sets availability
3. User creates emergency request
4. System shows matching donors
5. Notifications sent
6. User contacts donor
7. After completion → rating given

---

## 💾 Non-Functional Requirements
- Responsive UI (mobile-first)
- Fast API response
- Secure authentication (JWT)
- Clean UI/UX

---

## 🚀 Future Enhancements
- Real-time chat (Socket.io)
- SMS alerts
- Google Maps integration