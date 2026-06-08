-- ============================================================
-- BloodConnect — MySQL Database Schema
-- Run this file once to set up the entire database
-- ============================================================

CREATE DATABASE IF NOT EXISTS bloodconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bloodconnect;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  first_name  VARCHAR(50)  NOT NULL,
  last_name   VARCHAR(50)  NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('donor','requester','both','admin') DEFAULT 'donor',
  phone       VARCHAR(20),
  city        VARCHAR(100),
  blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-'),
  availability TINYINT(1) DEFAULT 1,
  total_donations INT DEFAULT 0,
  avg_rating  DECIMAL(3,2) DEFAULT 0.00,
  is_trusted  TINYINT(1) DEFAULT 0,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- BLOOD REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_requests (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  patient_name VARCHAR(100) NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-') NOT NULL,
  units_needed INT DEFAULT 1,
  hospital    VARCHAR(200),
  city        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20) NOT NULL,
  urgency     ENUM('normal','urgent','critical') DEFAULT 'normal',
  notes       TEXT,
  status      ENUM('pending','fulfilled','expired') DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 3 HOUR),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- RATINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  donor_id    INT NOT NULL,
  rater_id    INT NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback    TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (donor_id, rater_id),
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  message     TEXT NOT NULL,
  is_read     TINYINT(1) DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- SEED DATA — Admin + Sample Donors
-- ============================================================
-- Password for all seed users: "password123" (bcrypt hash)
INSERT INTO users (first_name, last_name, email, password, role, phone, city, blood_group, availability, total_donations, avg_rating, is_trusted) VALUES
('Admin',   'User',    'admin@bloodconnect.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',     '+92-300-0000000', 'Islamabad', 'O+',  1, 0,  0.0, 0),
('Ahmed',   'Khan',    'ahmed@email.com',        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-300-1234567', 'Lahore',    'A+',  1, 23, 4.9, 1),
('Sara',    'Malik',   'sara@email.com',          '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-321-2345678', 'Karachi',   'O-',  1, 15, 4.7, 1),
('Bilal',   'Raza',    'bilal@email.com',         '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-333-3456789', 'Islamabad', 'B+',  0, 9,  4.2, 0),
('Ayesha',  'Noor',    'ayesha@email.com',        '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'both',      '+92-311-4567890', 'Lahore',    'AB+', 1, 34, 5.0, 1),
('Usman',   'Tariq',   'usman@email.com',         '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-345-5678901', 'Faisalabad','O+',  1, 11, 4.5, 0),
('Zara',    'Ahmed',   'zara@email.com',           '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-303-6789012', 'Multan',    'A-',  0, 5,  4.0, 0),
('Hamza',   'Sheikh',  'hamza@email.com',          '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-315-7890123', 'Karachi',   'B-',  1, 21, 4.8, 1),
('Fatima',  'Zahra',   'fatima@email.com',         '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'both',      '+92-322-8901234', 'Islamabad', 'AB-', 1, 16, 4.6, 1),
('Omar',    'Farooq',  'omar@email.com',           '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-344-9012345', 'Lahore',    'O+',  0, 7,  3.8, 0),
('Nadia',   'Hussain', 'nadia@email.com',          '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-300-0123456', 'Rawalpindi','A+',  1, 10, 4.4, 0),
('Kamran',  'Ali',     'kamran@email.com',         '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-312-1234560', 'Peshawar',  'B+',  1, 18, 4.7, 1),
('Hina',    'Baig',    'hina@email.com',            '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'donor',     '+92-330-2345671', 'Quetta',    'O-',  1, 8,  4.3, 0);

-- Sample blood requests
INSERT INTO blood_requests (user_id, patient_name, blood_group, units_needed, hospital, city, phone, urgency, status) VALUES
(1, 'Ali Hassan',    'O+',  2, 'Services Hospital',    'Lahore',    '+92-300-1111111', 'critical', 'pending'),
(1, 'Maria Anwar',   'A-',  1, 'Aga Khan Hospital',    'Karachi',   '+92-321-2222222', 'urgent',   'fulfilled'),
(1, 'Raza Shah',     'B+',  3, 'PIMS Hospital',        'Islamabad', '+92-333-3333333', 'normal',   'expired'),
(1, 'Nida Mehmood',  'AB+', 1, 'Hayatabad Hospital',   'Peshawar',  '+92-311-4444444', 'urgent',   'pending'),
(1, 'Tariq Hussain', 'O-',  2, 'Civil Hospital',       'Quetta',    '+92-345-5555555', 'critical', 'pending');

-- Sample notifications
INSERT INTO notifications (user_id, message, is_read) VALUES
(2, 'New emergency request: O+ blood needed in Lahore', 0),
(2, 'You received a 5-star rating from Sara Malik!', 0),
(2, 'Your profile has been verified as Trusted Donor', 1);