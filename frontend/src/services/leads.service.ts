/**
 * Leads Service — Supabase
 */
import { supabase } from "@/lib/supabase";
import type { Lead, LeadInsert, LeadUpdate, PipelineStageSlug } from "@/lib/database.types";

export interface LeadWithStage extends Lead {
  pipeline_stages: { slug: string; label: string; color: string } | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export interface LeadFilters {
  stageSlug?: PipelineStageSlug;
  ownerId?: string;
  status?: "ACTIVE" | "ARCHIVED";
  search?: string;
  limit?: number;
  offset?: number;
}

export async function fetchLeads(filters: LeadFilters = {}): Promise<LeadWithStage[]> {
  let query = supabase
    .from("leads")
    .select("*, pipeline_stages!inner(slug, label, color), profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  else query = query.eq("status", "ACTIVE");

  if (filters.stageSlug) query = query.eq("pipeline_stages.slug", filters.stageSlug);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as LeadWithStage[];
}

export async function fetchLeadById(id: string): Promise<LeadWithStage> {
  const { data, error } = await supabase
    .from("leads")
    .select("*, pipeline_stages(slug, label, color), profiles(full_name, avatar_url)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as LeadWithStage;
}

export async function fetchLeadCountsByStage() {
  const { data, error } = await supabase
    .from("leads")
    .select("stage_id, pipeline_stages!inner(slug)")
    .eq("status", "ACTIVE");
  if (error) throw error;
  const counts = new Map<string, { stage_id: string; slug: string; count: number }>();
  for (const row of (data ?? []) as any[]) {
    const key = row.stage_id;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { stage_id: row.stage_id, slug: row.pipeline_stages.slug, count: 1 });
  }
  return Array.from(counts.values());
}

export async function createLead(lead: LeadInsert): Promise<Lead> {
  const { data, error } = await supabase.from("leads").insert(lead as any).select().single();
  if (error) throw error;
  const d = data as any;
  const user = (await supabase.auth.getUser()).data.user;
  if (user) {
    await supabase.from("activities").insert({ lead_id: d.id, type: "NOTE", actor_id: user.id, title: "Lead created", body: `${d.name} added to pipeline` } as any);
    await supabase.from("lead_stage_history").insert({ lead_id: d.id, to_stage_id: d.stage_id, changed_by: user.id, reason: "Initial creation" } as any);
  }
  return d as Lead;
}

export async function updateLead(id: string, updates: LeadUpdate): Promise<Lead> {
  const { data, error } = await supabase.from("leads").update(updates as any).eq("id", id).select().single();
  if (error) throw error;
  return data as Lead;
}

export async function moveLeadToStage(leadId: string, fromStageId: string, toStageId: string, reason?: string): Promise<Lead> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("leads").update({ stage_id: toStageId } as any).eq("id", leadId).select().single();
  if (error) throw error;
  await supabase.from("lead_stage_history").insert({ lead_id: leadId, from_stage_id: fromStageId, to_stage_id: toStageId, changed_by: user.id, reason } as any);
  await supabase.from("activities").insert({ lead_id: leadId, type: "STAGE_CHANGE", actor_id: user.id, title: "Stage changed", body: reason ?? "Pipeline stage updated", metadata: { from_stage_id: fromStageId, to_stage_id: toStageId } } as any);
  return data as Lead;
}

export async function assignLead(leadId: string, agentId: string): Promise<Lead> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("leads").update({ owner_id: agentId } as any).eq("id", leadId).select().single();
  if (error) throw error;
  await supabase.from("activities").insert({ lead_id: leadId, type: "ASSIGNMENT", actor_id: user.id, title: "Lead assigned", body: "Lead assigned to agent", metadata: { assigned_to: agentId } } as any);
  return data as Lead;
}

export async function autoAssignLead(leadId: string): Promise<Lead> {
  const { data: agents, error: agentsError } = await supabase.from("profiles").select("id").eq("role", "agent").eq("is_active", true).order("full_name");
  if (agentsError) throw agentsError;
  if (!agents || agents.length === 0) throw new Error("No active agents available");
  const { data: counter, error: counterError } = await supabase.from("assignment_counter").select("*").limit(1).single();
  if (counterError) throw counterError;
  const c = counter as any;
  const nextIndex = (c.last_assigned_index + 1) % agents.length;
  await supabase.from("assignment_counter").update({ last_assigned_index: nextIndex } as any).eq("id", c.id);
  return assignLead(leadId, (agents[nextIndex] as any).id);
}

export async function archiveLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").update({ status: "ARCHIVED" } as any).eq("id", id);
  if (error) throw error;
}
