/**
 * Pipeline Stages Service — Supabase
 *
 * Fetches pipeline stage definitions. These rarely change
 * so they're cached aggressively via TanStack Query.
 */
import { supabase } from "@/lib/supabase";
import type { PipelineStage, PipelineStageSlug } from "@/lib/database.types";

/** Fetch all pipeline stages ordered by display_order */
export async function fetchPipelineStages(): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data;
}

/** Get a stage ID by its slug */
export async function getStageIdBySlug(slug: PipelineStageSlug): Promise<string> {
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("slug", slug)
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * State machine: allowed transitions.
 * Key = from stage slug, Value = array of allowed target slugs.
 */
export const ALLOWED_TRANSITIONS: Record<PipelineStageSlug, PipelineStageSlug[]> = {
  new: ["contacted", "lost"],
  contacted: ["qualified", "lost"],
  qualified: ["visit_scheduled", "lost"],
  visit_scheduled: ["negotiation", "lost"],
  negotiation: ["won", "visit_scheduled", "lost"],
  won: [], // terminal
  lost: ["new"], // can revive
};

/** Check if a stage transition is valid */
export function isValidTransition(
  fromSlug: PipelineStageSlug,
  toSlug: PipelineStageSlug,
): boolean {
  return ALLOWED_TRANSITIONS[fromSlug]?.includes(toSlug) ?? false;
}
