/**
 * Visits Service — Supabase
 */
import { supabase } from "@/lib/supabase";
import type { Visit, VisitInsert, VisitUpdate, VisitStatus } from "@/lib/database.types";

export interface VisitWithDetails extends Visit {
  leads: { name: string; phone: string | null } | null;
  profiles: { full_name: string } | null;
}

export async function fetchVisits(filters?: { agentId?: string; status?: VisitStatus; from?: string; to?: string }): Promise<VisitWithDetails[]> {
  let query = supabase.from("visits").select("*, leads(name, phone), profiles(full_name)").order("scheduled_at", { ascending: true });
  if (filters?.agentId) query = query.eq("agent_id", filters.agentId);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.from) query = query.gte("scheduled_at", filters.from);
  if (filters?.to) query = query.lte("scheduled_at", filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VisitWithDetails[];
}

export async function fetchVisitsByLead(leadId: string): Promise<VisitWithDetails[]> {
  const { data, error } = await supabase.from("visits").select("*, leads(name, phone), profiles(full_name)").eq("lead_id", leadId).order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as VisitWithDetails[];
}

export async function checkConflicts(agentId: string, scheduledAt: string, durationMinutes: number, excludeVisitId?: string): Promise<VisitWithDetails[]> {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  let query = supabase.from("visits").select("*, leads(name, phone), profiles(full_name)").eq("agent_id", agentId).eq("status", "SCHEDULED").lt("scheduled_at", end.toISOString());
  if (excludeVisitId) query = query.neq("id", excludeVisitId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as VisitWithDetails[]).filter((v) => {
    const vEnd = new Date(new Date(v.scheduled_at).getTime() + v.duration_minutes * 60 * 1000);
    return vEnd > start;
  });
}

export async function scheduleVisit(visit: VisitInsert): Promise<{ visit: Visit; conflicts: VisitWithDetails[] }> {
  const conflicts = await checkConflicts(visit.agent_id, visit.scheduled_at, visit.duration_minutes ?? 60);
  const { data, error } = await supabase.from("visits").insert(visit as any).select().single();
  if (error) throw error;
  const d = data as Visit;
  const user = (await supabase.auth.getUser()).data.user;
  if (user) {
    await supabase.from("activities").insert({ lead_id: visit.lead_id, type: "VISIT_CREATED", actor_id: user.id, title: "Visit scheduled", body: `Visit at ${visit.location ?? "TBD"} on ${new Date(visit.scheduled_at).toLocaleDateString()}` } as any);
  }
  return { visit: d, conflicts };
}

export async function updateVisit(id: string, updates: VisitUpdate): Promise<Visit> {
  const { data, error } = await supabase.from("visits").update(updates as any).eq("id", id).select().single();
  if (error) throw error;
  return data as Visit;
}

export async function completeVisit(id: string, notes?: string): Promise<Visit> {
  const visit = await updateVisit(id, { status: "COMPLETED", notes: notes ?? undefined });
  const user = (await supabase.auth.getUser()).data.user;
  if (user) {
    await supabase.from("activities").insert({ lead_id: (visit as any).lead_id, type: "VISIT_COMPLETED", actor_id: user.id, title: "Visit completed", body: notes } as any);
  }
  return visit;
}

export async function cancelVisit(id: string, reason?: string): Promise<Visit> {
  const visit = await updateVisit(id, { status: "CANCELLED" });
  const user = (await supabase.auth.getUser()).data.user;
  if (user) {
    await supabase.from("activities").insert({ lead_id: (visit as any).lead_id, type: "VISIT_CANCELLED", actor_id: user.id, title: "Visit cancelled", body: reason } as any);
  }
  return visit;
}
