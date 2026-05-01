/**
 * Profiles Service — Supabase
 */
import { supabase } from "@/lib/supabase";
import type { Profile, UserRole } from "@/lib/database.types";

export async function fetchProfiles(role?: UserRole): Promise<Profile[]> {
  let query = supabase.from("profiles").select("*").eq("is_active", true).order("full_name");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchAgents(): Promise<Profile[]> {
  return fetchProfiles("agent");
}

export async function fetchProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(id: string, updates: { full_name?: string; avatar_url?: string | null }): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").update(updates as any).eq("id", id).select().single();
  if (error) throw error;
  return data as Profile;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").update({ role } as any).eq("id", userId).select().single();
  if (error) throw error;
  return data as Profile;
}
