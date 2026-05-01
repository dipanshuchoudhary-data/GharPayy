/**
 * Dashboard Service — Supabase
 */
import { supabase } from "@/lib/supabase";

export interface DashboardKPIs {
  totalLeads: number;
  activeLeads: number;
  wonThisMonth: number;
  lostThisMonth: number;
  conversionRate: number;
  visitsThisWeek: number;
  leadsByStage: Array<{ slug: string; label: string; color: string; count: number }>;
}

export async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now.getTime() - now.getDay() * 86400_000).toISOString();

  const { data: stages } = await supabase.from("pipeline_stages").select("id, slug");
  const stagesList = (stages ?? []) as Array<{ id: string; slug: string }>;
  const wonStageId = stagesList.find((s) => s.slug === "won")?.id ?? "";
  const lostStageId = stagesList.find((s) => s.slug === "lost")?.id ?? "";

  const [totalRes, activeRes, stagesRes, wonRes, lostRes, visitsRes] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("leads").select("stage_id, pipeline_stages!inner(slug, label, color)").eq("status", "ACTIVE"),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", wonStageId).gte("updated_at", startOfMonth),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", lostStageId).gte("updated_at", startOfMonth),
    supabase.from("visits").select("id", { count: "exact", head: true }).gte("scheduled_at", startOfWeek),
  ]);

  const stageCounts = new Map<string, { slug: string; label: string; color: string; count: number }>();
  for (const row of (stagesRes.data ?? []) as any[]) {
    const existing = stageCounts.get(row.stage_id);
    if (existing) existing.count++;
    else stageCounts.set(row.stage_id, { slug: row.pipeline_stages.slug, label: row.pipeline_stages.label, color: row.pipeline_stages.color, count: 1 });
  }

  const wonCount = wonRes.count ?? 0;
  const lostCount = lostRes.count ?? 0;
  const totalClosed = wonCount + lostCount;

  return {
    totalLeads: totalRes.count ?? 0,
    activeLeads: activeRes.count ?? 0,
    wonThisMonth: wonCount,
    lostThisMonth: lostCount,
    conversionRate: totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0,
    visitsThisWeek: visitsRes.count ?? 0,
    leadsByStage: Array.from(stageCounts.values()),
  };
}

export async function fetchAgentStats() {
  const { data: agents, error } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("role", "agent").eq("is_active", true);
  if (error) throw error;
  return Promise.all(
    ((agents ?? []) as any[]).map(async (agent: any) => {
      const [totalRes, activeRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", agent.id),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("owner_id", agent.id).eq("status", "ACTIVE"),
      ]);
      return { ...agent, total_leads: totalRes.count ?? 0, active_leads: activeRes.count ?? 0 };
    }),
  );
}
