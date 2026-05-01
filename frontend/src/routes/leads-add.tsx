/**
 * Add Lead Page — wired to Supabase
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useCreateLead, usePipelineStages, useAgents } from "@/hooks/use-crm-queries";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/leads-add")(({
  head: () => ({
    meta: [
      { title: "Add Lead — Gharpayy CRM" },
      { name: "description", content: "Add a new lead to your pipeline." },
    ],
  }),
  component: AddLeadPage,
}));

function AddLeadPage() {
  const navigate = useNavigate();
  const createLead = useCreateLead();
  const { data: stages } = usePipelineStages();
  const { data: agents } = useAgents();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "organic",
    budget: "",
    preferred_area: "",
    move_in_date: "",
    notes: "",
    owner_id: "",
  });

  const newStageId = stages?.find((s) => s.slug === "new")?.id ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!newStageId) {
      toast.error("Pipeline stages not loaded yet");
      return;
    }

    createLead.mutate(
      {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        source: form.source || null,
        budget: form.budget ? Number(form.budget) : null,
        preferred_area: form.preferred_area || null,
        move_in_date: form.move_in_date || null,
        notes: form.notes || null,
        owner_id: form.owner_id || null,
        stage_id: newStageId,
        priority: 3,
        score: 0,
      },
      {
        onSuccess: () => {
          toast.success("Lead created!");
          navigate({ to: "/leads" });
        },
        onError: (err) => {
          toast.error("Failed to create lead", { description: (err as Error).message });
        },
      },
    );
  };

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        <h1 className="font-display text-2xl font-bold tracking-tight">Add a lead</h1>

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91 98765 43210" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select value={form.source} onValueChange={(v) => update("source", v)}>
                  <SelectTrigger id="source"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["organic", "referral", "ad", "whatsapp", "call", "walk-in"].map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (₹/month)</Label>
                <Input id="budget" type="number" value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="12000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Preferred area</Label>
                <Input id="area" value={form.preferred_area} onChange={(e) => update("preferred_area", e.target.value)} placeholder="Koramangala" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="move_in">Move-in date</Label>
                <Input id="move_in" type="date" value={form.move_in_date} onChange={(e) => update("move_in_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner">Assign to</Label>
                <Select value={form.owner_id || "auto"} onValueChange={(v) => update("owner_id", v === "auto" ? "" : v)}>
                  <SelectTrigger id="owner"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-assign</SelectItem>
                    {agents?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Any additional details..." rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-1.5" />
                Create lead
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate({ to: "/leads" })}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
