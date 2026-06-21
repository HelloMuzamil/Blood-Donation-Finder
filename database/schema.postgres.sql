-- ============================================================
-- BloodConnect — PostgreSQL Database Schema (v2.0)
-- Run this file once to set up the entire database in PostgreSQL
-- ============================================================

-- Create ENUM types if they do not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM('donor', 'requester', 'both', 'admin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blood_group_type') THEN
        CREATE TYPE blood_group_type AS ENUM('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_urgency') THEN
        CREATE TYPE request_urgency AS ENUM('normal', 'urgent', 'critical');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM('pending', 'processing', 'completed', 'expired');
    END IF;
END$$;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  first_name      VARCHAR(50)  NOT NULL,
  last_name       VARCHAR(50)  NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  password        VARCHAR(255) NOT NULL,
  role            user_role DEFAULT 'donor',
  phone           VARCHAR(20),
  city            VARCHAR(100),
  blood_group     blood_group_type,
  availability    BOOLEAN DEFAULT TRUE,
  total_donations INT DEFAULT 0,
  avg_rating      DECIMAL(3,2) DEFAULT 0.00,
  is_trusted      BOOLEAN DEFAULT FALSE,
  latitude        DECIMAL(10, 8),
  longitude       DECIMAL(11, 8),
  trust_score     REAL DEFAULT 0.0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to automatically update updated_at in PostgreSQL
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BLOOD REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_requests (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_name  VARCHAR(100) NOT NULL,
  blood_group   blood_group_type NOT NULL,
  units_needed  INT DEFAULT 1,
  hospital      VARCHAR(200),
  city          VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  urgency       request_urgency DEFAULT 'normal',
  notes         TEXT,
  status        request_status DEFAULT 'pending',
  latitude      DECIMAL(10, 8),
  longitude     DECIMAL(11, 8),
  assigned_batches JSONB,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '3 hours')
);

-- ============================================================
-- RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id          SERIAL PRIMARY KEY,
  donor_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rater_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback    TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_rating UNIQUE (donor_id, rater_id)
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- REQUEST QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS request_queue (
  id           SERIAL PRIMARY KEY,
  request_id   INT NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
  donor_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_number INT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA — Admin + Sample Donors
-- ============================================================
-- Password for all seed users: "password123" (bcrypt hash)
INSERT INTO users (first_name, last_name, email, password, role, phone, city, blood_group, availability, total_donations, avg_rating, is_trusted, latitude, longitude, trust_score) VALUES
('Admin',   'User',    'admin@bloodconnect.com', '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'admin',     '+92-300-0000000', 'Islamabad', 'O+',  TRUE,  0,  0.0, FALSE, 33.6844, 73.0479, 0.0),
('Ahmed',   'Khan',    'ahmed@email.com',        '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-300-1234567', 'Lahore',    'A+',  TRUE,  23, 4.9, TRUE,  31.5204, 74.3587, 4.9),
('Sara',    'Malik',   'sara@email.com',          '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-321-2345678', 'Karachi',   'O-',  TRUE,  15, 4.7, TRUE,  24.8607, 67.0011, 4.7),
('Bilal',   'Raza',    'bilal@email.com',         '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-333-3456789', 'Islamabad', 'B+',  FALSE, 9,  4.2, FALSE, 33.6844, 73.0479, 4.2),
('Ayesha',  'Noor',    'ayesha@email.com',        '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'both',      '+92-311-4567890', 'Lahore',    'AB+', TRUE,  34, 5.0, TRUE,  31.5204, 74.3587, 5.0),
('Usman',   'Tariq',   'usman@email.com',         '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-345-5678901', 'Faisalabad','O+',  TRUE,  11, 4.5, FALSE, 31.4504, 73.1350, 4.5),
('Zara',    'Ahmed',   'zara@email.com',           '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-303-6789012', 'Multan',    'A-',  FALSE, 5,  4.0, FALSE, 30.1575, 71.5249, 4.0),
('Hamza',   'Sheikh',  'hamza@email.com',          '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-315-7890123', 'Karachi',   'B-',  TRUE,  21, 4.8, TRUE,  24.8607, 67.0011, 4.8),
('Fatima',  'Zahra',   'fatima@email.com',         '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'both',      '+92-322-8901234', 'Islamabad', 'AB-', TRUE,  16, 4.6, TRUE,  33.6844, 73.0479, 4.6),
('Omar',    'Farooq',  'omar@email.com',           '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-344-9012345', 'Lahore',    'O+',  FALSE, 7,  3.8, FALSE, 31.5204, 74.3587, 3.8),
('Nadia',   'Hussain', 'nadia@email.com',          '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-300-0123456', 'Rawalpindi','A+',  TRUE,  10, 4.4, FALSE, 33.5651, 73.0169, 4.4),
('Kamran',  'Ali',     'kamran@email.com',         '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-312-1234560', 'Peshawar',  'B+',  TRUE,  18, 4.7, TRUE,  34.0151, 71.5249, 4.7),
('Hina',    'Baig',    'hina@email.com',            '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'donor',     '+92-330-2345671', 'Quetta',    'O-',  TRUE,  8,  4.3, FALSE, 30.1798, 66.9750, 4.3)
ON CONFLICT DO NOTHING;

-- Sample blood requests
INSERT INTO blood_requests (user_id, patient_name, blood_group, units_needed, hospital, city, phone, urgency, status, latitude, longitude, assigned_batches) VALUES
(1, 'Ali Hassan',    'O+',  2, 'Services Hospital',    'Lahore',    '+92-300-1111111', 'critical', 'pending', 31.5204, 74.3587, NULL),
(1, 'Maria Anwar',   'A-',  1, 'Aga Khan Hospital',    'Karachi',   '+92-321-2222222', 'urgent',   'completed', 24.8607, 67.0011, NULL),
(1, 'Raza Shah',     'B+',  3, 'PIMS Hospital',        'Islamabad', '+92-333-3333333', 'normal',   'expired', 33.6844, 73.0479, NULL),
(1, 'Nida Mehmood',  'AB+', 1, 'Hayatabad Hospital',   'Peshawar',  '+92-311-4444444', 'urgent',   'pending', 34.0151, 71.5249, NULL),
(1, 'Tariq Hussain', 'O-',  2, 'Civil Hospital',       'Quetta',    '+92-345-5555555', 'critical', 'pending', 30.1798, 66.9750, NULL)
ON CONFLICT DO NOTHING;

-- Sample notifications
INSERT INTO notifications (user_id, message, is_read) VALUES
(2, 'New emergency request: O+ blood needed in Lahore', FALSE),
(2, 'You received a 5-star rating from Sara Malik!', FALSE),
(2, 'Your profile has been verified as Trusted Donor', TRUE)
ON CONFLICT DO NOTHING;
