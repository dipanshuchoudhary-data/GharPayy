/**
 * Supabase Database Types
 *
 * These types mirror the database schema and provide type safety
 * for all Supabase queries throughout the application.
 */

export type UserRole = "admin" | "manager" | "agent";
export type LeadStatus = "ACTIVE" | "ARCHIVED";
export type LeadPriority = 1 | 2 | 3 | 4 | 5;
export type PipelineStageSlug =
  | "new"
  | "contacted"
  | "qualified"
  | "visit_scheduled"
  | "negotiation"
  | "won"
  | "lost";
export type ActivityType =
  | "NOTE"
  | "CALL"
  | "EMAIL"
  | "STAGE_CHANGE"
  | "ASSIGNMENT"
  | "VISIT_CREATED"
  | "VISIT_COMPLETED"
  | "VISIT_CANCELLED";
export type VisitStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

// ─── Row / Insert / Update shapes ──────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  slug: PipelineStageSlug;
  label: string;
  display_order: number;
  color: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  budget: number | null;
  priority: LeadPriority;
  score: number;
  stage_id: string;
  owner_id: string | null;
  status: LeadStatus;
  move_in_date: string | null;
  preferred_area: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert {
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  budget?: number | null;
  priority?: number;
  score?: number;
  stage_id: string;
  owner_id?: string | null;
  status?: LeadStatus;
  move_in_date?: string | null;
  preferred_area?: string | null;
  notes?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export interface LeadUpdate {
  name?: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  budget?: number | null;
  priority?: number;
  score?: number;
  stage_id?: string;
  owner_id?: string | null;
  status?: LeadStatus;
  move_in_date?: string | null;
  preferred_area?: string | null;
  notes?: string | null;
  custom_fields?: Record<string, unknown> | null;
}

export interface LeadStageHistory {
  id: string;
  lead_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  type: ActivityType;
  actor_id: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityInsert {
  lead_id: string;
  type: ActivityType;
  actor_id: string;
  title: string;
  body?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface Visit {
  id: string;
  lead_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: VisitStatus;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitInsert {
  lead_id: string;
  agent_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  status?: VisitStatus;
  location?: string | null;
  notes?: string | null;
}

export interface VisitUpdate {
  scheduled_at?: string;
  duration_minutes?: number;
  status?: VisitStatus;
  location?: string | null;
  notes?: string | null;
}

export interface AssignmentCounter {
  id: string;
  last_assigned_index: number;
  updated_at: string;
}
