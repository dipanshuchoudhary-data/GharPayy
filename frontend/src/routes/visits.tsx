/**
 * Visits Page — schedule and manage property visits
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useVisits, useScheduleVisit, useCompleteVisit, useCancelVisit, useLeads, useAgents } from "@/hooks/use-crm-queries";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Clock, Plus, Check, X, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/visits")(({
  head: () => ({ meta: [{ title: "Visits — Gharpayy CRM" }] }),
  component: VisitsPage,
}));

function VisitsPage() {
  const { user } = useAuth();
  const { data: visits, isLoading } = useVisits();
  const { data: leads } = useLeads();
  const completeVisit = useCompleteVisit();
  const cancelVisit = useCancelVisit();
  const scheduleVisit = useScheduleVisit();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lead_id: "", scheduled_at: "", location: "", duration: "60" });

  const handleSchedule = () => {
    if (!form.lead_id || !form.scheduled_at) { toast.error("Select a lead and date"); return; }
    scheduleVisit.mutate({
      lead_id: form.lead_id,
      agent_id: user!.id,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: parseInt(form.duration) || 60,
      location: form.location || null,
    }, {
      onSuccess: (res) => {
        toast.success("Visit scheduled");
        if (res.conflicts.length > 0) toast.warning(`${res.conflicts.length} scheduling conflict(s) detected`);
        setShowForm(false);
        setForm({ lead_id: "", scheduled_at: "", location: "", duration: "60" });
      },
      onError: (e) => toast.error((e as Error).message),
    });
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Visits</h1>
            <p className="text-sm text-muted-foreground">{visits?.length ?? 0} visits</p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1.5" />{showForm ? "Cancel" : "Schedule visit"}
          </Button>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm">New Visit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Lead *</Label>
                <Select value={form.lead_id} onValueChange={(v) => setForm(f => ({ ...f, lead_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select lead" /></SelectTrigger>
                  <SelectContent>
                    {leads?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date & Time *</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Address or property name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={handleSchedule} disabled={scheduleVisit.isPending}>
              {scheduleVisit.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Schedule
            </Button>
          </Card>
        )}

        {/* Visits List */}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : visits && visits.length > 0 ? (
          <div className="space-y-2">
            {visits.map((v) => (
              <Card key={v.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{v.leads?.name ?? "Unknown"}</span>
                      <Badge variant={v.status === "COMPLETED" ? "default" : v.status === "CANCELLED" ? "destructive" : "secondary"} className="text-[10px]">
                        {v.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" />{format(new Date(v.scheduled_at), "MMM d, h:mm a")}</span>
                      {v.location && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{v.location}</span>}
                      <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{v.duration_minutes}min</span>
                    </div>
                  </div>
                  {v.status === "SCHEDULED" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        disabled={completeVisit.isPending}
                        onClick={() => completeVisit.mutate({ id: v.id }, { onSuccess: () => toast.success("Marked complete") })}>
                        <Check className="h-3 w-3 mr-1" />Done
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        disabled={cancelVisit.isPending}
                        onClick={() => cancelVisit.mutate({ id: v.id, reason: "Cancelled by agent" }, { onSuccess: () => toast.success("Cancelled") })}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">No visits scheduled yet.</Card>
        )}
      </div>
    </AppShell>
  );
}
