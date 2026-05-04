/**
 * Client for the Python/FastAPI Backend.
 * Uses VITE_API_URL from environment variables, defaulting to localhost for local dev.
 */

const getApiUrl = () => {
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';
};

export const backendApi = {
  // --- Scoring APIs ---
  runGlobalScoring: async () => {
    const res = await fetch(`${getApiUrl()}/api/scoring/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run global scoring');
    return res.json();
  },
  
  scoreSingleLead: async (leadId: string) => {
    const res = await fetch(`${getApiUrl()}/api/scoring/lead/${leadId}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to score lead');
    return res.json();
  },

  // --- SLA APIs ---
  getSlaBreaches: async () => {
    const res = await fetch(`${getApiUrl()}/api/sla/breaches`);
    if (!res.ok) throw new Error('Failed to fetch SLA breaches');
    return res.json();
  },

  getAgentSla: async () => {
    const res = await fetch(`${getApiUrl()}/api/sla/agents`);
    if (!res.ok) throw new Error('Failed to fetch Agent SLA');
    return res.json();
  },

  // --- Assignment APIs ---
  autoAssignLead: async (leadId: string) => {
    const res = await fetch(`${getApiUrl()}/api/assignment/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId })
    });
    if (!res.ok) throw new Error('Failed to auto-assign lead');
    return res.json();
  },

  getWorkloadDistribution: async () => {
    const res = await fetch(`${getApiUrl()}/api/assignment/workload`);
    if (!res.ok) throw new Error('Failed to fetch workload distribution');
    return res.json();
  },

  // --- Analytics APIs ---
  getPipelineAnalytics: async () => {
    const res = await fetch(`${getApiUrl()}/api/analytics/pipeline`);
    if (!res.ok) throw new Error('Failed to fetch pipeline analytics');
    return res.json();
  },

  getAgentPerformance: async () => {
    const res = await fetch(`${getApiUrl()}/api/analytics/agents`);
    if (!res.ok) throw new Error('Failed to fetch agent performance');
    return res.json();
  }
};
