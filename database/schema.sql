-- ============================================================
--  Stipendly — MySQL Schema
--  Run this script to create the database and all tables.
-- ============================================================

CREATE DATABASE IF NOT EXISTS stipendly
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE stipendly;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id            VARCHAR(36)  PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(200) NOT NULL DEFAULT '',
  role          ENUM('student','provider','admin') NOT NULL DEFAULT 'student',
  is_admin      TINYINT(1)   NOT NULL DEFAULT 0,
  is_banned     TINYINT(1)   NOT NULL DEFAULT 0,
  avatar_url    TEXT,
  bio           TEXT,
  company_name  VARCHAR(200),
  website       VARCHAR(255),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- flag_glossary ----------
CREATE TABLE IF NOT EXISTS flag_glossary (
  id          VARCHAR(36)  PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  label       VARCHAR(200) NOT NULL,
  severity    ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  points      INT          NOT NULL DEFAULT 10,
  description TEXT,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------- internships ----------
CREATE TABLE IF NOT EXISTS internships (
  id                VARCHAR(36)  PRIMARY KEY,
  provider_id       VARCHAR(36)  NOT NULL,
  title             VARCHAR(200) NOT NULL,
  company_name      VARCHAR(200) NOT NULL DEFAULT '',
  domain            VARCHAR(255),
  domain_verified   TINYINT(1)   NOT NULL DEFAULT 0,
  domain_verified_at TIMESTAMP NULL,
  location          VARCHAR(200),
  is_remote         TINYINT(1)   NOT NULL DEFAULT 0,
  duration_weeks    INT,
  stipend_min       INT,
  stipend_max       INT,
  description       TEXT NOT NULL,
  requirements      TEXT NOT NULL,
  skills            JSON,
  category          VARCHAR(100),
  status            ENUM('pending','active','dismissed','banned','closed') NOT NULL DEFAULT 'pending',
  dismiss_reason    TEXT,
  honour_score      INT          NOT NULL DEFAULT 100,
  risk_assessment   JSON,
  risk_assessed_at  TIMESTAMP NULL,
  application_count INT          NOT NULL DEFAULT 0,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_internships_provider FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ---------- honour_events ----------
CREATE TABLE IF NOT EXISTS honour_events (
  id            VARCHAR(36)  PRIMARY KEY,
  internship_id VARCHAR(36)  NOT NULL,
  delta         INT          NOT NULL,
  reason        VARCHAR(500) NOT NULL,
  severity      ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  source        ENUM('report','ai','admin','domain') NOT NULL DEFAULT 'report',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_honour_internship FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE
);

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id            VARCHAR(36)  PRIMARY KEY,
  internship_id VARCHAR(36)  NOT NULL,
  reporter_id   VARCHAR(36)  NOT NULL,
  flag_code     VARCHAR(50)  NOT NULL,
  details       TEXT NOT NULL,
  ai_analysis   JSON,
  status        ENUM('open','reviewing','resolved','dismissed') NOT NULL DEFAULT 'open',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_internship FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reporter   FOREIGN KEY (reporter_id)   REFERENCES profiles(id) ON DELETE CASCADE
);

-- ---------- applications ----------
CREATE TABLE IF NOT EXISTS applications (
  id            VARCHAR(36)  PRIMARY KEY,
  internship_id VARCHAR(36)  NOT NULL,
  student_id    VARCHAR(36)  NOT NULL,
  cover_letter  TEXT NOT NULL,
  resume_text   TEXT NOT NULL,
  status        ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apps_internship FOREIGN KEY (internship_id) REFERENCES internships(id) ON DELETE CASCADE,
  CONSTRAINT fk_apps_student    FOREIGN KEY (student_id)   REFERENCES profiles(id) ON DELETE CASCADE
);

-- ---------- resume_drafts ----------
CREATE TABLE IF NOT EXISTS resume_drafts (
  id                   VARCHAR(36)  PRIMARY KEY,
  student_id           VARCHAR(36)  NOT NULL,
  title                VARCHAR(200) NOT NULL DEFAULT 'Untitled resume',
  content              TEXT NOT NULL,
  target_internship_id VARCHAR(36)  NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_resume_student FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- ---------- indexes ----------
CREATE INDEX idx_internships_status   ON internships(status);
CREATE INDEX idx_internships_provider ON internships(provider_id);
CREATE INDEX idx_honour_internship    ON honour_events(internship_id);
CREATE INDEX idx_reports_internship   ON reports(internship_id);
CREATE INDEX idx_apps_internship      ON applications(internship_id);
CREATE INDEX idx_apps_student         ON applications(student_id);

-- ---------- seed flag glossary ----------
INSERT INTO flag_glossary (id, code, label, severity, points, description) VALUES
  (UUID(), 'unrealistic_pay','Unrealistically high pay for the role','high',25,'Listing promises compensation far above market norms.'),
  (UUID(), 'upfront_fee','Asks for upfront payment / deposit','critical',40,'Provider requests money from the applicant.'),
  (UUID(), 'no_company_info','No verifiable company identity','medium',12,'Missing or vague company name, website, or address.'),
  (UUID(), 'generic_email','Uses a free personal email (not a company domain)','low',8,'Contact via gmail/yahoo instead of a business domain.'),
  (UUID(), 'copy_paste','Description appears copied from another listing','low',6,'Duplicate or near-duplicate job text.'),
  (UUID(), 'asks_pii','Requests sensitive personal data upfront','high',22,'SSN, bank details, ID scans requested before hiring.'),
  (UUID(), 'vague_role','Role responsibilities are vague or undefined','low',6,'No clear tasks, deliverables, or learning outcomes.'),
  (UUID(), 'unprofessional_lang','Unprofessional or suspicious language','medium',12,'Grammatically erratic, coercive, or scam-like tone.'),
  (UUID(), 'impossible_location','Location mismatch or impossible logistics','medium',10,'Remote role requiring relocation, contradictory locations.'),
  (UUID(), 'no_mentorship','No mention of mentorship or supervision','low',5,'Internship offers no guidance or supervisor.')
ON DUPLICATE KEY UPDATE code = VALUES(code);
