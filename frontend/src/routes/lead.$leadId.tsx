/**
 * Lead Detail Page — view/edit a single lead
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useLead, useUpdateLead, useActivities, useLogNote, usePipelineStages, useMoveLeadStage, useVisitsByLead } from "@/hooks/use-crm-queries";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/services/pipeline.service";
import type { PipelineStageSlug } from "@/lib/database.types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, User, Clock, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";

export const Route = createFileRoute("/lead/$leadId")(({
  component: LeadDetailPage,
}));

function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(leadId);
  const { data: activities } = useActivities(leadId);
  const { data: visits } = useVisitsByLead(leadId);
  const { data: stages } = usePipelineStages();
  const moveStage = useMoveLeadStage();
  const addNote = useLogNote();
  const [noteText, setNoteText] = useState("");

  if (isLoading) {
    return <AppShell><div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div></AppShell>;
  }

  if (!lead) {
    return <AppShell><div className="p-6"><p>Lead not found.</p></div></AppShell>;
  }

  const currentSlug = lead.pipeline_stages?.slug as PipelineStageSlug;
  const allowedNext = ALLOWED_TRANSITIONS[currentSlug] ?? [];

  const handleMoveStage = (toSlug: PipelineStageSlug) => {
    const toStage = stages?.find((s) => s.slug === toSlug);
    if (!toStage) return;
    moveStage.mutate(
      { leadId, fromStageId: lead.stage_id, toStageId: toStage.id, reason: `Moved to ${toSlug}` },
      { onSuccess: () => toast.success(`Moved to ${toStage.label}`) },
    );
  };

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote.mutate({ leadId, text: noteText }, {
      onSuccess: () => { setNoteText(""); toast.success("Note added"); },
    });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/leads" })}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <h1 className="font-display text-xl font-bold">{lead.name}</h1>
          {lead.pipeline_stages && (
            <Badge style={{ borderColor: lead.pipeline_stages.color, color: lead.pipeline_stages.color }} variant="outline">
              {lead.pipeline_stages.label}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left: Lead Info */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-sm">Contact Info</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {lead.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{lead.phone}</div>}
                {lead.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{lead.email}</div>}
                {lead.preferred_area && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{lead.preferred_area}</div>}
                {lead.budget && <div className="flex items-center gap-2">₹{(Number(lead.budget)/1000).toFixed(0)}k/mo</div>}
                {lead.source && <div className="flex items-center gap-2">Source: {lead.source}</div>}
                {lead.profiles?.full_name && <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />Owner: {lead.profiles.full_name}</div>}
              </div>
              {lead.notes && <p className="text-sm text-muted-foreground border-t pt-2">{lead.notes}</p>}
            </Card>

            {/* Stage Actions */}
            {allowedNext.length > 0 && (
              <Card className="p-4 space-y-2">
                <h2 className="font-semibold text-sm">Move to Stage</h2>
                <div className="flex gap-2 flex-wrap">
                  {allowedNext.map((slug) => {
                    const s = stages?.find((st) => st.slug === slug);
                    return (
                      <Button key={slug} size="sm" variant="outline" disabled={moveStage.isPending}
                        onClick={() => handleMoveStage(slug)}
                        style={{ borderColor: s?.color }}
                      >
                        {s?.label ?? slug}
                      </Button>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Add Note */}
            <Card className="p-4 space-y-2">
              <h2 className="font-semibold text-sm">Add Note</h2>
              <div className="flex gap-2">
                <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note..." rows={2} className="flex-1" />
                <Button size="sm" onClick={handleAddNote} disabled={addNote.isPending || !noteText.trim()}>
                  {addNote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </Card>

            {/* Activity Timeline */}
            <Card className="p-4 space-y-3">
              <h2 className="font-semibold text-sm">Activity Timeline</h2>
              {activities && activities.length > 0 ? (
                <div className="space-y-2">
                  {activities.map((a) => (
                    <div key={a.id} className="flex gap-3 text-sm border-l-2 border-border pl-3 py-1">
                      <div className="flex-1">
                        <div className="font-medium">{a.title}</div>
                        {a.body && <div className="text-muted-foreground text-xs">{a.body}</div>}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {a.profiles?.full_name ?? "System"} · {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[9px] h-5 self-start">{a.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </Card>
          </div>

          {/* Right: Visits */}
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Visits</h2>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/visits">Schedule</Link>
                </Button>
              </div>
              {visits && visits.length > 0 ? (
                <div className="space-y-2">
                  {visits.map((v) => (
                    <div key={v.id} className="text-sm border rounded-md p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(v.scheduled_at), "MMM d, h:mm a")}</span>
                        <Badge variant={v.status === "COMPLETED" ? "default" : v.status === "CANCELLED" ? "destructive" : "secondary"} className="text-[9px]">
                          {v.status}
                        </Badge>
                      </div>
                      {v.location && <div className="text-xs text-muted-foreground">{v.location}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No visits scheduled.</p>
              )}
            </Card>

            <Card className="p-4 space-y-2">
              <h2 className="font-semibold text-sm">Details</h2>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>Created: {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}</div>
                <div>Updated: {formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true })}</div>
                <div>Priority: {lead.priority}/5</div>
                <div>Score: {lead.score}</div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
