# 🩸 BloodConnect: AI-Driven Emergency Blood Donation Platform

**BloodConnect** is a full-stack, real-time emergency blood donation network designed to bridge the gap between patients in urgent need and compatible local donors. By combining a powerful Geolocation-based matching engine (Haversine formula), a Trust Score system, and cutting-edge Generative AI features, BloodConnect ensures safe, fast, and reliable blood donation management.

This document serves as the complete technical architecture, feature breakdown, and AI implementation guide for BloodConnect.

---

## 📌 1. Project Overview & Objectives

Blood donation centers and requesters face severe delays in identifying compatible donors and determining donor eligibility. BloodConnect solves this by providing:
- **Instant Access:** Locate nearby blood donors instantly.
- **Emergency Handling:** Priority processing and WhatsApp batch alerting for urgent requests.
- **Reliability:** Trust-based rating system to eliminate spam and fake donors.
- **AI-Powered Assistance:** Intelligent Retrieval-Augmented Generation (RAG) assistant for eligibility queries.

---

## 🛠️ 2. Tech Stack & Architecture

BloodConnect is built using a robust and scalable architecture:
- **Frontend:** HTML5, CSS3 (Glassmorphism UI, Custom Design System), Vanilla JavaScript (SPA architecture).
- **Maps & Geolocation:** Leaflet.js with OpenStreetMap for GPS pin-dropping and distance visualization.
- **Backend:** Node.js, Express.js.
- **Database:** MySQL (using `mysql2/promise` pool).
- **Authentication:** Secure JSON Web Tokens (JWT) stored in localStorage, passwords hashed via `bcryptjs`.
- **Generative AI:** Google Gemini 1.5/2.0 Flash via Cloud HTTP Endpoint.

---

## ⚙️ 3. Core Features & System Flow

### A. Intelligent Matching Engine
When an emergency request is created, the system filters donors based on:
1. **Medical Compatibility:** Standard blood type rules (e.g., O- can donate to anyone).
2. **Availability:** Excludes donors marked as unavailable.
3. **Trust Score:** Filters out low-trust or spam profiles.
4. **Geolocation:** Uses the Haversine Formula to calculate physical distance (km) and skips donors outside the max radius.
5. **Ranking:** Sorts by nearest distance, then by highest trust score.

### B. Automated WhatsApp Batching (Admin Dashboard)
- Matched donors are queued in batches (default: 15).
- Admins can trigger automated WhatsApp Web messages pre-filled with patient details and a Google Maps link to the emergency location.

### C. Emergency Request & Notification System
- Users can create normal or urgent requests specifying blood group, location, and contact details.
- In-app notifications alert relevant users of new emergency requests.
- One-to-one communication available via direct calls, emails, or WhatsApp redirect links.

### D. Donor Rating & Trust System
- Requesters can rate donors (1-5 stars) and leave feedback post-interaction.
- Average ratings are displayed on donor profiles.
- Highly rated users earn a "Trusted Donor" badge, improving their ranking in future emergency searches.

---

## 🤖 4. Generative AI Integrations

This project heavily leverages Generative AI, aligning with advanced AI-Driven Software Development standards.

### 🧠 Problem Framing & Model Selection
- **Model:** Google Gemini 1.5 Flash / 2.0 Flash.
- **Justification:** Flash provides low-latency (<1.5s) responses critical for emergencies, large context windows for medical guidelines, and zero-cost integration for open-source deployment.

### 📝 Prompt Engineering & RAG Implementation
- **RAG Knowledge Base:** Official Red Cross and WHO guidelines (tattoos, vaccines, age/weight limits) are stored in `blood_guidelines.txt`.
- **Context Retrieval:** On each chat request, the backend automatically feeds these guidelines into Gemini's context window.
- **System Prompt:** Features strict safety guardrails. The AI acts as a professional assistant, refuses non-blood-related queries, includes mandatory medical disclaimers, and forbids medical diagnoses.
- **AI WhatsApp Outreach Writer:** An integrated AI generator that drafts customized, high-conversion WhatsApp texts using recipient names, urgency levels, and map links.

### 💻 AI UX & Evaluation
- **UI Element:** A responsive, glassmorphic floating chat widget with typing animations.
- **Feedback Loop:** Users can rate AI responses (👍/👎), which syncs directly to the database.
- **Automated Testing:** An automated framework (`eval.js`) tests the AI for Correctness, Safety Compliance, Topic Adherence, and Latency.

### 📊 LLMOps & Fine-Tuning
- **Monitoring:** All LLM prompts, responses, latencies, and user feedback are logged in the `llm_logs` MySQL table.
- **Fine-Tuning Data Generation:** A dedicated utility (`prepare_finetuning.js`) scans positive-feedback logs and exports a `finetune_dataset.jsonl` file, ready for model fine-tuning.

---

## 💾 5. Database Schema Overview

The `bloodconnect` MySQL database comprises the following core tables:
- **`users`**: Stores admins, donors, and requesters (role, blood_group, coordinates, trust_score, availability).
- **`blood_requests`**: Stores emergency requests (patient details, coordinates, status).
- **`request_queue`**: Core table for WhatsApp batching, linking requests to specific donors.
- **`donor_ratings`**: Stores post-donation reviews and feedback.
- **`notifications`**: In-app notification system tracking.
- **`llm_logs`**: Logs all interactions with the Gemini AI for monitoring and fine-tuning.

---

## 🚀 6. Setup & Deployment Instructions

### Prerequisites
- Node.js installed
- MySQL database running

### Environment Variables (`.env`)
Create a `.env` file in the `backend` directory:
```env
DB_HOST=your_mysql_host
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=bloodconnect
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

### Installation Steps
1. **Clone & Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```
2. **Initialize Database:**
   ```bash
   node scripts/init_llm_db.js
   ```
3. **Run the Development Server:**
   ```bash
   npm run dev
   ```
4. **Access the Application:** Open `frontend/index.html` in your browser (or serve it via a local static server).

### Utility Scripts
- **Run AI Evaluation:** `node eval/eval.js`
- **Export Fine-Tuning Data:** `node scripts/prepare_finetuning.js`

---
*BloodConnect - Saving lives through Technology, Community, and Artificial Intelligence.*
