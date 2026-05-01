-- ============================================================
-- GHARPAYY CRM — Supabase Schema
-- Run this in Supabase SQL Editor → https://supabase.com/dashboard/project/ympejrkvfxxopgmlxcee/sql/new
-- ============================================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'agent');
CREATE TYPE lead_status AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE activity_type AS ENUM ('NOTE', 'CALL', 'EMAIL', 'STAGE_CHANGE', 'ASSIGNMENT', 'VISIT_CREATED', 'VISIT_COMPLETED', 'VISIT_CANCELLED');
CREATE TYPE visit_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE pipeline_stage_slug AS ENUM ('new', 'contacted', 'qualified', 'visit_scheduled', 'negotiation', 'won', 'lost');

-- 2. PROFILES (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'agent',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PIPELINE_STAGES
CREATE TABLE pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug pipeline_stage_slug NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. LEADS
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  source TEXT,
  budget NUMERIC,
  priority INT NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  score INT NOT NULL DEFAULT 0,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  owner_id UUID REFERENCES profiles(id),
  status lead_status NOT NULL DEFAULT 'ACTIVE',
  move_in_date DATE,
  preferred_area TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. LEAD_STAGE_HISTORY
CREATE TABLE lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ACTIVITIES
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. VISITS
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  status visit_status NOT NULL DEFAULT 'SCHEDULED',
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. ASSIGNMENT_COUNTER (single row for round-robin)
CREATE TABLE assignment_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_assigned_index INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert the single row for round-robin
INSERT INTO assignment_counter (last_assigned_index) VALUES (0);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_leads_stage ON leads(stage_id);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_activities_lead ON activities(lead_id, created_at DESC);
CREATE INDEX idx_visits_agent ON visits(agent_id, scheduled_at);
CREATE INDEX idx_visits_lead ON visits(lead_id);
CREATE INDEX idx_stage_history_lead ON lead_stage_history(lead_id, created_at DESC);

-- ============================================================
-- SEED PIPELINE STAGES
-- ============================================================
INSERT INTO pipeline_stages (slug, label, display_order, color) VALUES
  ('new',             'New',              1, '#6366f1'),
  ('contacted',       'Contacted',        2, '#3b82f6'),
  ('qualified',       'Qualified',        3, '#8b5cf6'),
  ('visit_scheduled', 'Visit Scheduled',  4, '#f59e0b'),
  ('negotiation',     'Negotiation',      5, '#ef4444'),
  ('won',             'Won',              6, '#22c55e'),
  ('lost',            'Lost',             7, '#64748b');

-- ============================================================
-- TRIGGER: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'agent')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER visits_updated_at BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_counter ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES: everyone auth'd can read, users can update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- PIPELINE_STAGES: everyone auth'd can read
CREATE POLICY "stages_select" ON pipeline_stages FOR SELECT TO authenticated USING (true);

-- LEADS: agents see own, managers/admins see all
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR auth_role() IN ('manager', 'admin'));
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR auth_role() IN ('manager', 'admin'));
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated
  USING (auth_role() IN ('manager', 'admin'));

-- LEAD_STAGE_HISTORY: same visibility as leads
CREATE POLICY "history_select" ON lead_stage_history FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads WHERE leads.id = lead_stage_history.lead_id
        AND (leads.owner_id = auth.uid() OR auth_role() IN ('manager', 'admin'))
    )
  );
CREATE POLICY "history_insert" ON lead_stage_history FOR INSERT TO authenticated
  WITH CHECK (true);

-- ACTIVITIES: same visibility as leads
CREATE POLICY "activities_select" ON activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads WHERE leads.id = activities.lead_id
        AND (leads.owner_id = auth.uid() OR auth_role() IN ('manager', 'admin'))
    )
  );
CREATE POLICY "activities_insert" ON activities FOR INSERT TO authenticated
  WITH CHECK (true);

-- VISITS: agents see own, managers/admins see all
CREATE POLICY "visits_select" ON visits FOR SELECT TO authenticated
  USING (agent_id = auth.uid() OR auth_role() IN ('manager', 'admin'));
CREATE POLICY "visits_insert" ON visits FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "visits_update" ON visits FOR UPDATE TO authenticated
  USING (agent_id = auth.uid() OR auth_role() IN ('manager', 'admin'));

-- ASSIGNMENT_COUNTER: authenticated can read and update
CREATE POLICY "counter_select" ON assignment_counter FOR SELECT TO authenticated USING (true);
CREATE POLICY "counter_update" ON assignment_counter FOR UPDATE TO authenticated USING (true);
