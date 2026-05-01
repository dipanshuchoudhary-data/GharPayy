/**
 * Supabase-backed CRM Dashboard
 * Replaces the mock-data dashboard with real queries.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useDashboardKPIs, useLeads, useAgents } from "@/hooks/use-crm-queries";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Target, TrendingUp, Calendar, Plus, ArrowRight,
  BarChart3, Columns3, Phone,
} from "lucide-react";

export const Route = createFileRoute("/")(({
  head: () => ({
    meta: [
      { title: "Dashboard — Gharpayy CRM" },
      { name: "description", content: "Lead management dashboard with real-time KPIs." },
    ],
  }),
  component: DashboardPage,
}));

function DashboardPage() {
  const { profile } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: recentLeads, isLoading: leadsLoading } = useLeads({ limit: 5 });

  return (
    <AppShell>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here's what's happening with your leads today.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/pipeline"><Columns3 className="h-4 w-4 mr-1.5" />Pipeline</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/leads-add"><Plus className="h-4 w-4 mr-1.5" />Add lead</Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {kpisLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4"><Skeleton className="h-16 w-full" /></Card>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={Target} label="Total Leads" value={kpis.totalLeads} />
            <KpiCard icon={Users} label="Active" value={kpis.activeLeads} />
            <KpiCard icon={TrendingUp} label="Won this month" value={kpis.wonThisMonth} accent="success" />
            <KpiCard icon={BarChart3} label="Conversion" value={`${kpis.conversionRate}%`} />
          </div>
        ) : null}

        {/* Pipeline Snapshot */}
        {kpis && kpis.leadsByStage.length > 0 && (
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Pipeline Snapshot</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pipeline">View Kanban <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {kpis.leadsByStage.map((s) => (
                <div
                  key={s.slug}
                  className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm"
                >
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.label}</span>
                  <Badge variant="secondary" className="text-xs">{s.count}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recent Leads */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent Leads</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/leads">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          {leadsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentLeads && recentLeads.length > 0 ? (
            <div className="divide-y divide-border">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <div className="text-sm font-medium">{lead.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>}
                      {lead.source && <span>via {lead.source}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.pipeline_stages && (
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: lead.pipeline_stages.color }}>
                        {lead.pipeline_stages.label}
                      </Badge>
                    )}
                    {lead.budget && (
                      <span className="text-xs text-muted-foreground">₹{(Number(lead.budget)/1000).toFixed(0)}k</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No leads yet. <Link to="/leads-add" className="text-accent hover:underline">Add your first lead</Link>
            </div>
          )}
        </Card>

        {/* Quick Stats */}
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Lost this month</div>
              <div className="text-2xl font-display font-bold mt-1 text-destructive">{kpis.lostThisMonth}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />Visits this week</div>
              <div className="text-2xl font-display font-bold mt-1">{kpis.visitsThisWeek}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Active pipeline</div>
              <div className="text-2xl font-display font-bold mt-1 text-accent">{kpis.activeLeads}</div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function KpiCard({ icon: Icon, label, value, accent }: {
  icon: typeof Target;
  label: string;
  value: number | string;
  accent?: "success" | "danger";
}) {
  const tone = accent === "success"
    ? "border-success/30 bg-success/5"
    : accent === "danger"
      ? "border-destructive/30 bg-destructive/5"
      : "border-border bg-card";
  return (
    <Card className={`p-4 ${tone}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
    </Card>
  );
}
