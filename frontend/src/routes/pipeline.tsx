/**
 * Pipeline Page — Kanban Board
 */
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PipelineKanban } from "@/components/pipeline/PipelineKanban";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/pipeline")(({
  head: () => ({
    meta: [
      { title: "Pipeline — Gharpayy CRM" },
      { name: "description", content: "Visual Kanban board for your lead pipeline." },
    ],
  }),
  component: PipelinePage,
}));

function PipelinePage() {
  return (
    <AppShell>
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              Drag leads across stages. State machine rules are enforced.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/leads-add">
              <Plus className="h-4 w-4 mr-1.5" />
              Add lead
            </Link>
          </Button>
        </div>
        <PipelineKanban />
      </div>
    </AppShell>
  );
}
