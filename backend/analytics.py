"""
Analytics Service
-----------------
Server-side analytics aggregations for manager/admin dashboards.
"""
from datetime import datetime, timezone, timedelta
from db import get_supabase


async def pipeline_analytics() -> dict:
    """Pipeline funnel analytics with conversion rates between stages."""
    sb = get_supabase()

    stages_res = sb.table("pipeline_stages").select("*").order("display_order").execute()
    stages = stages_res.data or []

    funnel = []
    for stage in stages:
        count_res = (
            sb.table("leads")
            .select("id", count="exact")
            .eq("stage_id", stage["id"])
            .eq("status", "ACTIVE")
            .execute()
        )
        funnel.append({
            "slug": stage["slug"],
            "label": stage["label"],
            "color": stage["color"],
            "count": count_res.count or 0,
        })

    # Calculate conversion rates between consecutive stages
    for i in range(1, len(funnel)):
        prev_count = funnel[i - 1]["count"]
        curr_count = funnel[i]["count"]
        funnel[i]["conversion_from_prev"] = (
            round(curr_count / prev_count * 100, 1) if prev_count > 0 else 0
        )

    return {"stages": funnel}


async def source_analytics() -> dict:
    """Lead source breakdown with counts."""
    sb = get_supabase()
    leads_res = sb.table("leads").select("source").eq("status", "ACTIVE").execute()
    leads = leads_res.data or []

    sources: dict[str, int] = {}
    for lead in leads:
        src = lead.get("source") or "unknown"
        sources[src] = sources.get(src, 0) + 1

    return {
        "sources": [
            {"source": k, "count": v}
            for k, v in sorted(sources.items(), key=lambda x: -x[1])
        ]
    }


async def daily_activity_stats(days: int = 7) -> dict:
    """Activity counts per day for the last N days."""
    sb = get_supabase()
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days)).isoformat()

    acts_res = (
        sb.table("activities")
        .select("created_at, type")
        .gte("created_at", start)
        .execute()
    )
    activities = acts_res.data or []

    daily: dict[str, dict[str, int]] = {}
    for act in activities:
        day = act["created_at"][:10]  # YYYY-MM-DD
        if day not in daily:
            daily[day] = {"total": 0}
        daily[day]["total"] += 1
        t = act["type"]
        daily[day][t] = daily[day].get(t, 0) + 1

    return {
        "period_days": days,
        "daily": [{"date": k, **v} for k, v in sorted(daily.items())],
    }


async def agent_performance() -> list[dict]:
    """Performance metrics per agent."""
    sb = get_supabase()

    agents_res = (
        sb.table("profiles")
        .select("id, full_name")
        .eq("role", "agent")
        .eq("is_active", True)
        .execute()
    )
    agents = agents_res.data or []

    stages_res = sb.table("pipeline_stages").select("id, slug").execute()
    stages = {s["id"]: s["slug"] for s in (stages_res.data or [])}

    result = []
    for agent in agents:
        leads_res = (
            sb.table("leads")
            .select("id, stage_id, status")
            .eq("owner_id", agent["id"])
            .execute()
        )
        leads = leads_res.data or []
        total = len(leads)
        active = sum(1 for l in leads if l["status"] == "ACTIVE")
        won = sum(1 for l in leads if stages.get(l["stage_id"]) == "won")
        lost = sum(1 for l in leads if stages.get(l["stage_id"]) == "lost")

        visits_res = (
            sb.table("visits")
            .select("id, status")
            .eq("agent_id", agent["id"])
            .execute()
        )
        visits = visits_res.data or []
        visits_done = sum(1 for v in visits if v["status"] == "COMPLETED")

        result.append({
            "agent_id": agent["id"],
            "agent_name": agent["full_name"],
            "total_leads": total,
            "active_leads": active,
            "won": won,
            "lost": lost,
            "win_rate": round(won / (won + lost) * 100, 1) if (won + lost) > 0 else 0,
            "visits_completed": visits_done,
        })

    return result
