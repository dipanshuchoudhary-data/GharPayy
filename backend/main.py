"""
Gharpayy CRM — FastAPI Backend
================================
Provides server-side APIs for:
- Lead scoring engine
- SLA monitoring & alerts
- Round-robin lead assignment
- Pipeline & agent analytics
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from config import get_settings
from scoring import score_all_leads, score_single_lead
from sla import check_sla_breaches, get_agent_sla_summary
from analytics import pipeline_analytics, source_analytics, daily_activity_stats, agent_performance
from assignment import assign_lead_round_robin, get_workload_distribution


# ── Lifespan ──────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Gharpayy CRM backend started")
    yield
    print("Shutting down")


# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Gharpayy CRM Backend",
    description="Lead scoring, SLA monitoring, analytics, and auto-assignment APIs",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origin
s = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=s.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "service": "gharpayy-crm-backend"}


# ── Scoring ───────────────────────────────────────────────────
@app.post("/api/scoring/run", tags=["Scoring"])
async def run_scoring():
    """Re-score all active leads using the scoring engine."""
    try:
        results = await score_all_leads()
        return {"scored": len(results), "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/scoring/lead/{lead_id}", tags=["Scoring"])
async def run_scoring_single(lead_id: str):
    """Score a specific lead."""
    try:
        result = await score_single_lead(lead_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── SLA ───────────────────────────────────────────────────────
@app.get("/api/sla/breaches", tags=["SLA"])
async def sla_breaches():
    """Check all leads for SLA breaches (24h warn, 48h critical)."""
    try:
        return await check_sla_breaches()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/sla/agents", tags=["SLA"])
async def sla_by_agent():
    """Get SLA compliance per agent."""
    try:
        return await get_agent_sla_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Assignment ────────────────────────────────────────────────
class AssignRequest(BaseModel):
    lead_id: str


@app.post("/api/assignment/auto", tags=["Assignment"])
async def auto_assign(req: AssignRequest):
    """Auto-assign a lead to the next agent via round-robin."""
    try:
        result = await assign_lead_round_robin(req.lead_id)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/assignment/workload", tags=["Assignment"])
async def workload():
    """Get current lead distribution across agents."""
    try:
        return await get_workload_distribution()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Analytics ─────────────────────────────────────────────────
@app.get("/api/analytics/pipeline", tags=["Analytics"])
async def analytics_pipeline():
    """Pipeline funnel with conversion rates."""
    try:
        return await pipeline_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/sources", tags=["Analytics"])
async def analytics_sources():
    """Lead source breakdown."""
    try:
        return await source_analytics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/activity", tags=["Analytics"])
async def analytics_activity(days: int = Query(default=7, ge=1, le=90)):
    """Daily activity stats for the last N days."""
    try:
        return await daily_activity_stats(days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/analytics/agents", tags=["Analytics"])
async def analytics_agents():
    """Agent performance metrics (leads, wins, visits)."""
    try:
        return await agent_performance()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
