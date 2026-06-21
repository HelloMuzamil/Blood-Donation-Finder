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
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  trust_score FLOAT DEFAULT 0.0,
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
  status      ENUM('pending','processing','completed','expired') DEFAULT 'pending',
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  assigned_batches JSON,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP NULL DEFAULT NULL,
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
-- REQUEST QUEUE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS request_queue (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  request_id   INT NOT NULL,
  donor_id     INT NOT NULL,
  batch_number INT NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- ADMIN ACCOUNT ONLY (password: "password123")
-- All other users must sign up through the app
-- ============================================================
INSERT IGNORE INTO users (first_name, last_name, email, password, role, phone, city, blood_group, availability, trust_score)
VALUES ('Admin', 'User', 'admin@bloodconnect.com', '$2a$10$01XeQljJm9YINO7Zvk5SR.jPP0PgiFymeaBR3k.mD8.1s2Fi9Q8oC', 'admin', '+92-300-0000000', 'Islamabad', 'O+', 1, 0.0);