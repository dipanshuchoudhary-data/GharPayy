/**
 * Pipeline Kanban Board — Drag & Drop
 *
 * Displays leads as cards in stage columns.
 * Supports drag-and-drop with state machine validation.
 */
import { useState, useMemo, useCallback } from "react";
import {
  useLeads,
  usePipelineStages,
  useMoveLeadStage,
} from "@/hooks/use-crm-queries";
import { isValidTransition, ALLOWED_TRANSITIONS } from "@/services/pipeline.service";
import type { PipelineStageSlug } from "@/lib/database.types";
import type { LeadWithStage } from "@/services/leads.service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Phone,
  Calendar,
  GripVertical,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Kanban Board ──────────────────────────────────────────────

export function PipelineKanban() {
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();
  const { data: leads, isLoading: leadsLoading } = useLeads({ status: "ACTIVE" });
  const moveStage = useMoveLeadStage();

  const [draggedLead, setDraggedLead] = useState<LeadWithStage | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const map = new Map<string, LeadWithStage[]>();
    if (stages) {
      for (const stage of stages) {
        map.set(stage.id, []);
      }
    }
    if (leads) {
      for (const lead of leads) {
        const arr = map.get(lead.stage_id) ?? [];
        arr.push(lead);
        map.set(lead.stage_id, arr);
      }
    }
    return map;
  }, [stages, leads]);

  const handleDragStart = useCallback(
    (lead: LeadWithStage) => setDraggedLead(lead),
    [],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, stageId: string) => {
      e.preventDefault();
      if (!draggedLead) return;

      const fromSlug = draggedLead.pipeline_stages?.slug as PipelineStageSlug;
      const toStage = stages?.find((s) => s.id === stageId);
      if (!toStage) return;

      const valid = isValidTransition(fromSlug, toStage.slug as PipelineStageSlug);
      setDropTarget(valid ? stageId : null);
      e.dataTransfer.dropEffect = valid ? "move" : "none";
    },
    [draggedLead, stages],
  );

  const handleDrop = useCallback(
    (stageId: string) => {
      if (!draggedLead || stageId === draggedLead.stage_id) {
        setDraggedLead(null);
        setDropTarget(null);
        return;
      }

      const fromSlug = draggedLead.pipeline_stages?.slug as PipelineStageSlug;
      const toStage = stages?.find((s) => s.id === stageId);
      if (!toStage) return;

      if (!isValidTransition(fromSlug, toStage.slug as PipelineStageSlug)) {
        toast.error("Invalid transition", {
          description: `Cannot move from ${fromSlug} to ${toStage.slug}`,
        });
        setDraggedLead(null);
        setDropTarget(null);
        return;
      }

      moveStage.mutate(
        {
          leadId: draggedLead.id,
          fromStageId: draggedLead.stage_id,
          toStageId: stageId,
          reason: `Dragged from ${fromSlug} to ${toStage.slug}`,
        },
        {
          onSuccess: () => {
            toast.success(`${draggedLead.name} → ${toStage.label}`);
          },
          onError: (err) => {
            toast.error("Failed to move lead", {
              description: (err as Error).message,
            });
          },
        },
      );

      setDraggedLead(null);
      setDropTarget(null);
    },
    [draggedLead, stages, moveStage],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedLead(null);
    setDropTarget(null);
  }, []);

  if (stagesLoading || leadsLoading) {
    return <KanbanSkeleton />;
  }

  if (!stages) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
      {stages.map((stage) => {
        const stageLeads = leadsByStage.get(stage.id) ?? [];
        const isTarget = dropTarget === stage.id;
        const isDragging = !!draggedLead;
        const canDrop =
          isDragging &&
          draggedLead.stage_id !== stage.id &&
          isValidTransition(
            draggedLead.pipeline_stages?.slug as PipelineStageSlug,
            stage.slug as PipelineStageSlug,
          );

        return (
          <div
            key={stage.id}
            className={cn(
              "flex-shrink-0 w-[280px] flex flex-col rounded-xl border bg-card/50 transition-all duration-200",
              isTarget && "ring-2 ring-accent bg-accent/5",
              isDragging && canDrop && !isTarget && "border-dashed border-accent/40",
              isDragging && !canDrop && draggedLead.stage_id !== stage.id && "opacity-40",
            )}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={() => setDropTarget(null)}
            onDrop={() => handleDrop(stage.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm font-semibold">{stage.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 min-w-[20px] justify-center">
                {stageLeads.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
              {stageLeads.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  No leads
                </div>
              )}
              {stageLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isDragging={draggedLead?.id === lead.id}
                  onDragStart={() => handleDragStart(lead)}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lead Card ─────────────────────────────────────────────────

function LeadCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  lead: LeadWithStage;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const allowedNext = ALLOWED_TRANSITIONS[
    lead.pipeline_stages?.slug as PipelineStageSlug
  ] ?? [];

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "p-3 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md group",
        isDragging && "opacity-50 rotate-1 scale-95 shadow-lg",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-3.5 w-3.5 mt-0.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Name + score */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-medium truncate">{lead.name}</span>
            {lead.score > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] h-4 px-1.5 shrink-0",
                  lead.score >= 75 && "border-green-500/50 text-green-600",
                  lead.score >= 50 && lead.score < 75 && "border-amber-500/50 text-amber-600",
                  lead.score < 50 && "border-red-500/50 text-red-500",
                )}
              >
                {lead.score}
              </Badge>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {lead.profiles?.full_name && (
              <span className="flex items-center gap-0.5 truncate">
                <User className="h-2.5 w-2.5" />
                {lead.profiles.full_name.split(" ")[0]}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-0.5">
                <Phone className="h-2.5 w-2.5" />
              </span>
            )}
            {lead.budget && (
              <span>₹{(Number(lead.budget) / 1000).toFixed(0)}k</span>
            )}
          </div>

          {/* Source + time */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            {lead.source && (
              <Badge variant="secondary" className="text-[9px] h-4">
                {lead.source}
              </Badge>
            )}
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Allowed transitions hint */}
          {allowedNext.length > 0 && (
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground/60 pt-0.5">
              <ChevronRight className="h-2.5 w-2.5" />
              {allowedNext.map((s) => s.replace("_", " ")).join(" · ")}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[280px] rounded-xl border bg-card/50 p-3 space-y-3">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 3 - i % 3 }).map((_, j) => (
            <Skeleton key={j} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
