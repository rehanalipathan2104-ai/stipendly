/*
# Internship Platform — Core Schema

## Purpose
A marketplace for internships with a fake-provider detection system.
Every provider earns an "honour score" that decays when red flags are filed
against them; when the score drops below a threshold the provider is auto-banned
to protect students before any loss occurs. An LLM analyses internship listings
and student reports for nuanced fraud signals and generates polished job
descriptions / resumes.

## Tables
1. `profiles` — extends `auth.users`. Holds role (student/provider/admin),
   display name, and a frozen boolean `is_admin` mirror used by RLS.
2. `internships` — listings posted by providers. Stores the current
   `honour_score`, `status`, LLM `risk_assessment`, and domain validation state.
3. `honour_events` — append-only ledger of every honour-score change with a
   reason and severity. Drives the score via a trigger.
4. `reports` — red-flag reports filed by students against an internship.
5. `applications` — a student's application to an internship.
6. `resume_drafts` — AI-assisted resume drafts saved by students.
7. `flag_glossary` — admin-configurable dictionary of flag reasons, their
   severity, and honour-point penalty.

## Security (RLS)
- `profiles`: owner read/update; admins read all.
- `internships`: anyone authenticated may browse approved listings; providers
  manage their own; admins manage all.
- `honour_events`: provider sees events on their own internships; admins see all.
- `reports`: reporters see their own; admins see all; providers see reports
  filed against their own internships (read-only).
- `applications`: student sees/updates own; provider sees applications to their
  internships; admins see all.
- `resume_drafts`: owner-only.
- `flag_glossary`: anyone authenticated can read; admins can write.

## Notes
1. The first user to sign up is automatically promoted to admin (trigger).
2. A trigger recalculates `internships.honour_score` from the ledger on insert.
3. A trigger auto-bans a provider when any of their internships' honour drops
   below the configured threshold.
4. `profiles.is_admin` is a mirror of `role = 'admin'` so RLS can test it
   without sub-selecting profiles repeatedly.
*/

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student','provider','admin')),
  is_admin boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  avatar_url text,
  bio text,
  company_name text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------- flag_glossary ----------
CREATE TABLE IF NOT EXISTS flag_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  points int NOT NULL DEFAULT 10,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE flag_glossary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "glossary_read" ON flag_glossary;
CREATE POLICY "glossary_read" ON flag_glossary FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "glossary_admin_write" ON flag_glossary;
CREATE POLICY "glossary_admin_write" ON flag_glossary FOR INSERT
  TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "glossary_admin_update" ON flag_glossary;
CREATE POLICY "glossary_admin_update" ON flag_glossary FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "glossary_admin_delete" ON flag_glossary;
CREATE POLICY "glossary_admin_delete" ON flag_glossary
  FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- ---------- internships ----------
CREATE TABLE IF NOT EXISTS internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  company_name text NOT NULL DEFAULT '',
  domain text,
  domain_verified boolean NOT NULL DEFAULT false,
  domain_verified_at timestamptz,
  location text,
  is_remote boolean NOT NULL DEFAULT false,
  duration_weeks int,
  stipend_min int,
  stipend_max int,
  description text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  skills text[] NOT NULL DEFAULT '{}',
  category text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','dismissed','banned','closed')),
  dismiss_reason text,
  honour_score int NOT NULL DEFAULT 100,
  risk_assessment jsonb,
  risk_assessed_at timestamptz,
  application_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internships_browse" ON internships;
CREATE POLICY "internships_browse" ON internships FOR SELECT
  TO authenticated USING (status = 'active' OR provider_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "internships_provider_insert" ON internships;
CREATE POLICY "internships_provider_insert" ON internships FOR INSERT
  TO authenticated WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "internships_owner_update" ON internships;
CREATE POLICY "internships_owner_update" ON internships FOR UPDATE
  TO authenticated USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

DROP POLICY IF EXISTS "internships_owner_delete" ON internships;
CREATE POLICY "internships_owner_delete" ON internships
  FOR DELETE TO authenticated USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- ---------- honour_events ----------
CREATE TABLE IF NOT EXISTS honour_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  delta int NOT NULL,
  reason text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  source text NOT NULL DEFAULT 'report' CHECK (source IN ('report','ai','admin','domain')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE honour_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "honour_events_read" ON honour_events;
CREATE POLICY "honour_events_read" ON honour_events FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM internships i WHERE i.id = honour_events.internship_id AND i.provider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

DROP POLICY IF EXISTS "honour_events_insert" ON honour_events;
CREATE POLICY "honour_events_insert" ON honour_events FOR INSERT
  TO authenticated WITH CHECK (true);

-- ---------- reports ----------
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_code text NOT NULL,
  details text NOT NULL DEFAULT '',
  ai_analysis jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_read" ON reports;
CREATE POLICY "reports_read" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
    OR EXISTS (SELECT 1 FROM internships i WHERE i.id = reports.internship_id AND i.provider_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "reports_admin_update" ON reports;
CREATE POLICY "reports_admin_update" ON reports FOR UPDATE
  TO authenticated USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- ---------- applications ----------
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter text NOT NULL DEFAULT '',
  resume_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_read" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM internships i WHERE i.id = applications.internship_id AND i.provider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
  );

DROP POLICY IF EXISTS "applications_insert" ON applications;
CREATE POLICY "applications_insert" ON applications FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "applications_update" ON applications;
CREATE POLICY "applications_update" ON applications FOR UPDATE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM internships i WHERE i.id = applications.internship_id AND i.provider_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "applications_delete" ON applications;
CREATE POLICY "applications_delete" ON applications
  FOR DELETE TO authenticated USING (student_id = auth.uid());

-- ---------- resume_drafts ----------
CREATE TABLE IF NOT EXISTS resume_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled resume',
  content text NOT NULL DEFAULT '',
  target_internship_id uuid REFERENCES internships(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE resume_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resume_owner_select" ON resume_drafts;
CREATE POLICY "resume_owner_select" ON resume_drafts FOR SELECT
  TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_owner_insert" ON resume_drafts;
CREATE POLICY "resume_owner_insert" ON resume_drafts FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_owner_update" ON resume_drafts;
CREATE POLICY "resume_owner_update" ON resume_drafts FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "resume_owner_delete" ON resume_drafts;
CREATE POLICY "resume_owner_delete" ON resume_drafts
  FOR DELETE TO authenticated USING (student_id = auth.uid());

-- ---------- indexes ----------
CREATE INDEX IF NOT EXISTS idx_internships_status ON internships(status);
CREATE INDEX IF NOT EXISTS idx_internships_provider ON internships(provider_id);
CREATE INDEX IF NOT EXISTS idx_honour_events_internship ON honour_events(internship_id);
CREATE INDEX IF NOT EXISTS idx_reports_internship ON reports(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_id);
CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_id);

-- ---------- functions ----------
-- Recalculate honour_score from the ledger whenever an event is added.
CREATE OR REPLACE FUNCTION recalc_honour_score()
RETURNS trigger AS $$
DECLARE
  base int := 100;
  total int;
BEGIN
  SELECT COALESCE(SUM(delta), 0) INTO total
  FROM honour_events WHERE internship_id = NEW.internship_id;
  UPDATE internships
    SET honour_score = GREATEST(base + total, 0),
        updated_at = now()
    WHERE id = NEW.internship_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_recalc_honour ON honour_events;
CREATE TRIGGER trg_recalc_honour
  AFTER INSERT ON honour_events
  FOR EACH ROW EXECUTE FUNCTION recalc_honour_score();

-- Auto-ban a provider when any of their internships' honour drops below threshold.
CREATE OR REPLACE FUNCTION auto_ban_low_honour()
RETURNS trigger AS $$
DECLARE
  threshold int := 40;
  pid uuid;
BEGIN
  SELECT provider_id INTO pid FROM internships WHERE id = NEW.id;
  IF NEW.honour_score < threshold THEN
    UPDATE internships SET status = 'banned', updated_at = now() WHERE id = NEW.id AND status NOT IN ('banned','closed');
    UPDATE profiles SET is_banned = true WHERE id = pid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS trg_auto_ban ON internships;
CREATE TRIGGER trg_auto_ban
  AFTER UPDATE OF honour_score ON internships
  FOR EACH ROW
  WHEN (NEW.honour_score IS DISTINCT FROM OLD.honour_score)
  EXECUTE FUNCTION auto_ban_low_honour();

-- First registered user becomes admin automatically.
CREATE OR REPLACE FUNCTION promote_first_user()
RETURNS trigger AS $$
DECLARE
  user_count int;
  admin_count int;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  SELECT count(*) INTO admin_count FROM profiles WHERE is_admin = true;
  IF user_count <= 1 AND admin_count = 0 THEN
    INSERT INTO profiles (id, email, full_name, role, is_admin)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name','Administrator'), 'admin', true);
  ELSE
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_promote_first_user ON auth.users;
CREATE TRIGGER trg_promote_first_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION promote_first_user();

-- Mirror role/is_admin into raw_app_meta_data so policies can read them via auth.jwt() if needed.
CREATE OR REPLACE FUNCTION sync_profile_meta()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', NEW.role, 'is_admin', NEW.is_admin)
    WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_profile_meta ON profiles;
CREATE TRIGGER trg_sync_profile_meta
  AFTER INSERT OR UPDATE OF role, is_admin ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_meta();

-- ---------- seed flag glossary ----------
INSERT INTO flag_glossary (code, label, severity, points, description) VALUES
  ('unrealistic_pay','Unrealistically high pay for the role','high',25,'Listing promises compensation far above market norms.'),
  ('upfront_fee','Asks for upfront payment / deposit','critical',40,'Provider requests money from the applicant.'),
  ('no_company_info','No verifiable company identity','medium',12,'Missing or vague company name, website, or address.'),
  ('generic_email','Uses a free personal email (not a company domain)','low',8,'Contact via gmail/yahoo instead of a business domain.'),
  ('copy_paste','Description appears copied from another listing','low',6,'Duplicate or near-duplicate job text.'),
  ('asks_pii','Requests sensitive personal data upfront','high',22,'SSN, bank details, ID scans requested before hiring.'),
  ('vague_role','Role responsibilities are vague or undefined','low',6,'No clear tasks, deliverables, or learning outcomes.'),
  ('unprofessional_lang','Unprofessional or suspicious language','medium',12,'Grammatically erratic, coercive, or scam-like tone.'),
  ('impossible_location','Location mismatch or impossible logistics','medium',10,'Remote role requiring relocation, contradictory locations.'),
  ('no_mentorship','No mention of mentorship or supervision','low',5,'Internship offers no guidance or supervisor.')
ON CONFLICT (code) DO NOTHING;
