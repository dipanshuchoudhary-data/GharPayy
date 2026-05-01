/**
 * TanStack Query Hooks — CRM
 *
 * Central hook library wrapping all Supabase services
 * with caching, invalidation, and optimistic updates.
 */
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { fetchPipelineStages } from "@/services/pipeline.service";
import {
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLead,
  moveLeadToStage,
  assignLead,
  autoAssignLead,
  archiveLead,
  type LeadFilters,
} from "@/services/leads.service";
import {
  fetchActivities,
  logNote,
  logCall,
  logEmail,
} from "@/services/activities.service";
import {
  fetchVisits,
  fetchVisitsByLead,
  scheduleVisit,
  completeVisit,
  cancelVisit,
} from "@/services/visits.service";
import {
  fetchDashboardKPIs,
  fetchAgentStats,
} from "@/services/dashboard.service";
import {
  fetchProfiles,
  fetchAgents,
} from "@/services/profiles.service";
import type {
  LeadInsert,
  LeadUpdate,
  VisitInsert,
  VisitStatus,
} from "@/lib/database.types";

// ─── Query Keys ────────────────────────────────────────────────
export const queryKeys = {
  stages: ["pipeline-stages"] as const,
  leads: (filters?: LeadFilters) => ["leads", filters] as const,
  lead: (id: string) => ["lead", id] as const,
  activities: (leadId: string) => ["activities", leadId] as const,
  visits: (filters?: Record<string, unknown>) => ["visits", filters] as const,
  visitsByLead: (leadId: string) => ["visits-lead", leadId] as const,
  dashboard: ["dashboard"] as const,
  agentStats: ["agent-stats"] as const,
  profiles: ["profiles"] as const,
  agents: ["agents"] as const,
};

// ─── Pipeline Stages ───────────────────────────────────────────
export function usePipelineStages() {
  return useQuery({
    queryKey: queryKeys.stages,
    queryFn: fetchPipelineStages,
    staleTime: Infinity, // stages rarely change
  });
}

// ─── Leads ─────────────────────────────────────────────────────
export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: queryKeys.leads(filters),
    queryFn: () => fetchLeads(filters),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => fetchLeadById(id),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lead: LeadInsert) => createLead(lead),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LeadUpdate }) =>
      updateLead(id, updates),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: queryKeys.lead(id) });
    },
  });
}

export function useMoveLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leadId,
      fromStageId,
      toStageId,
      reason,
    }: {
      leadId: string;
      fromStageId: string;
      toStageId: string;
      reason?: string;
    }) => moveLeadToStage(leadId, fromStageId, toStageId, reason),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, agentId }: { leadId: string; agentId: string }) =>
      assignLead(leadId, agentId),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
    },
  });
}

export function useAutoAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => autoAssignLead(leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useArchiveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ─── Activities ────────────────────────────────────────────────
export function useActivities(leadId: string) {
  return useQuery({
    queryKey: queryKeys.activities(leadId),
    queryFn: () => fetchActivities(leadId),
    enabled: !!leadId,
  });
}

export function useLogNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, text }: { leadId: string; text: string }) =>
      logNote(leadId, text),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities(leadId) });
    },
  });
}

export function useLogCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, notes }: { leadId: string; notes?: string }) =>
      logCall(leadId, notes),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities(leadId) });
    },
  });
}

export function useLogEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, subject }: { leadId: string; subject: string }) =>
      logEmail(leadId, subject),
    onSuccess: (_data, { leadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities(leadId) });
    },
  });
}

// ─── Visits ────────────────────────────────────────────────────
export function useVisits(filters?: {
  agentId?: string;
  status?: VisitStatus;
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: queryKeys.visits(filters as Record<string, unknown>),
    queryFn: () => fetchVisits(filters),
  });
}

export function useVisitsByLead(leadId: string) {
  return useQuery({
    queryKey: queryKeys.visitsByLead(leadId),
    queryFn: () => fetchVisitsByLead(leadId),
    enabled: !!leadId,
  });
}

export function useScheduleVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visit: VisitInsert) => scheduleVisit(visit),
    onSuccess: (_data, visit) => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: queryKeys.visitsByLead(visit.lead_id) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCompleteVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      completeVisit(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useCancelVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelVisit(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

// ─── Dashboard ─────────────────────────────────────────────────
export function useDashboardKPIs() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardKPIs,
    staleTime: 60_000, // refresh every minute
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: queryKeys.agentStats,
    queryFn: fetchAgentStats,
    staleTime: 60_000,
  });
}

// ─── Profiles ──────────────────────────────────────────────────
export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: () => fetchProfiles(),
    staleTime: 300_000, // 5 min
  });
}

export function useAgents() {
  return useQuery({
    queryKey: queryKeys.agents,
    queryFn: fetchAgents,
    staleTime: 300_000,
  });
}
