/**
 * Activities Service — Supabase
 */
import { supabase } from "@/lib/supabase";
import type { Activity, ActivityInsert, ActivityType } from "@/lib/database.types";

export interface ActivityWithActor extends Activity {
  profiles: { full_name: string; avatar_url: string | null } | null;
}

export async function fetchActivities(leadId: string, limit = 50): Promise<ActivityWithActor[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("*, profiles(full_name, avatar_url)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ActivityWithActor[];
}

export async function logActivity(leadId: string, type: ActivityType, title: string, body?: string, metadata?: Record<string, unknown>): Promise<Activity> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase.from("activities").insert({
    lead_id: leadId, type, actor_id: user.id, title, body: body ?? null, metadata: metadata ?? null,
  } as any).select().single();
  if (error) throw error;
  return data as Activity;
}

export const logNote = (leadId: string, text: string) => logActivity(leadId, "NOTE", "Note added", text);
export const logCall = (leadId: string, notes?: string) => logActivity(leadId, "CALL", "Call logged", notes);
export const logEmail = (leadId: string, subject: string) => logActivity(leadId, "EMAIL", "Email sent", subject);
