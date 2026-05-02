-- Chunao Saathi — PostgreSQL Schema
-- Run on Supabase or any PostgreSQL instance

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Voters table
CREATE TABLE voters (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  phone         VARCHAR(15) UNIQUE NOT NULL,
  email         VARCHAR(200),
  state         VARCHAR(100),
  district      VARCHAR(100),
  qr_code       VARCHAR(500) UNIQUE,
  qr_url        TEXT,
  credit_score  INTEGER DEFAULT 100,
  role          VARCHAR(20) DEFAULT 'voter',
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Election Events / Awareness Campaigns
CREATE TABLE election_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(300) NOT NULL,
  event_date      DATE NOT NULL,
  venue           VARCHAR(500),
  state           VARCHAR(100),
  capacity        INTEGER DEFAULT 500,
  status          VARCHAR(20) DEFAULT 'upcoming',
  registration_open BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Polling Booths
CREATE TABLE polling_booths (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID REFERENCES election_events(id) ON DELETE CASCADE,
  booth_number  INTEGER NOT NULL,
  location      VARCHAR(500),
  capacity      INTEGER DEFAULT 100,
  current_count INTEGER DEFAULT 0,
  blo_name      VARCHAR(200),
  blo_phone     VARCHAR(15),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Booth Assignments
CREATE TABLE booth_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id    UUID REFERENCES voters(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES election_events(id) ON DELETE CASCADE,
  booth_id    UUID REFERENCES polling_booths(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(voter_id, event_id)
);

-- Attendance (QR-based)
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id    UUID REFERENCES voters(id) ON DELETE CASCADE,
  event_id    UUID REFERENCES election_events(id) ON DELETE CASCADE,
  marked_at   TIMESTAMP DEFAULT NOW(),
  gate        VARCHAR(10),
  UNIQUE(voter_id, event_id)
);

-- Credit Score History (CIBIL-like)
CREATE TABLE credit_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id      UUID REFERENCES voters(id) ON DELETE CASCADE,
  event_id      UUID REFERENCES election_events(id),
  change_amount INTEGER NOT NULL,
  reason        VARCHAR(300) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- EHSAAS — Anonymous Doubt System
CREATE TABLE ehsaas_questions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID REFERENCES election_events(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  category    VARCHAR(50) DEFAULT 'general',
  status      VARCHAR(20) DEFAULT 'pending',
  answer      TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Appeals
CREATE TABLE appeals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voter_id    UUID REFERENCES voters(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  status      VARCHAR(20) DEFAULT 'pending',
  admin_note  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voters_phone ON voters(phone);
CREATE INDEX idx_attendance_event ON attendance(event_id);
CREATE INDEX idx_credit_voter ON credit_history(voter_id);
CREATE INDEX idx_ehsaas_event ON ehsaas_questions(event_id);
CREATE INDEX idx_booths_event ON polling_booths(event_id);
