/**
 * Leads List Page — wired to Supabase
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useLeads, usePipelineStages } from "@/hooks/use-crm-queries";
import type { PipelineStageSlug } from "@/lib/database.types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Phone, MapPin, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/leads")(({
  head: () => ({
    meta: [
      { title: "Leads — Gharpayy CRM" },
      { name: "description", content: "All your leads in one place." },
    ],
  }),
  component: LeadsPage,
}));

function LeadsPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const { data: stages } = usePipelineStages();

  const filters = {
    search: search || undefined,
    stageSlug: stageFilter !== "all" ? (stageFilter as PipelineStageSlug) : undefined,
  };

  const { data: leads, isLoading } = useLeads(filters);

  return (
    <AppShell>
      <div className="space-y-4 p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">{leads?.length ?? 0} leads</p>
          </div>
          <Button size="sm" asChild>
            <Link to="/leads-add"><Plus className="h-4 w-4 mr-1.5" />Add lead</Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {stages?.map((s) => (
                <SelectItem key={s.slug} value={s.slug}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leads List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : leads && leads.length > 0 ? (
          <div className="space-y-2">
            {leads.map((lead) => (
              <Link key={lead.id} to="/lead/$leadId" params={{ leadId: lead.id }} className="block">
              <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{lead.name}</span>
                      {lead.pipeline_stages && (
                        <Badge variant="outline" className="text-[10px] shrink-0" style={{ borderColor: lead.pipeline_stages.color }}>
                          {lead.pipeline_stages.label}
                        </Badge>
                      )}
                      {lead.score > 0 && (
                        <Badge variant="secondary" className="text-[10px]">Score: {lead.score}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>}
                      {lead.preferred_area && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{lead.preferred_area}</span>}
                      {lead.source && <span>via {lead.source}</span>}
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    {lead.budget && <span className="text-sm font-medium">₹{(Number(lead.budget)/1000).toFixed(0)}k</span>}
                    {lead.profiles?.full_name && (
                      <span className="text-xs text-muted-foreground">{lead.profiles.full_name.split(" ")[0]}</span>
                    )}
                  </div>
                </div>
              </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No leads found.</p>
            <Button size="sm" className="mt-3" asChild>
              <Link to="/leads-add"><Plus className="h-4 w-4 mr-1.5" />Add your first lead</Link>
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
