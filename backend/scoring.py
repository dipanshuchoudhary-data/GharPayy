"""
Lead Scoring Engine
-------------------
Calculates a 0–100 score for each lead based on:
- Budget (higher = better)
- Recency (newer leads score higher)
- Engagement (activity count)
"""
from datetime import datetime, timezone
from db import get_supabase
from config import get_settings


def calculate_lead_score(lead: dict, activity_count: int) -> int:
    """Score a single lead on a 0–100 scale."""
    s = get_settings()

    # Budget score (0–100): normalize against 50k ceiling
    budget = float(lead.get("budget") or 0)
    budget_score = min(budget / 50000, 1.0) * 100

    # Recency score (0–100): full marks if created today, decays over 30 days
    created = datetime.fromisoformat(lead["created_at"].replace("Z", "+00:00"))
    age_days = (datetime.now(timezone.utc) - created).days
    recency_score = max(0, (30 - age_days) / 30) * 100

    # Engagement score (0–100): based on activity count, caps at 10
    engagement_score = min(activity_count / 10, 1.0) * 100

    weighted = (
        budget_score * s.scoring_weight_budget
        + recency_score * s.scoring_weight_recency
        + engagement_score * s.scoring_weight_engagement
    )
    return round(min(max(weighted, 0), 100))


async def score_all_leads() -> list[dict]:
    """Re-score all active leads and update their scores in the DB."""
    sb = get_supabase()
    leads_res = sb.table("leads").select("*").eq("status", "ACTIVE").execute()
    leads = leads_res.data or []

    results = []
    for lead in leads:
        # Count activities for this lead
        act_res = (
            sb.table("activities")
            .select("id", count="exact")
            .eq("lead_id", lead["id"])
            .execute()
        )
        activity_count = act_res.count or 0
        new_score = calculate_lead_score(lead, activity_count)

        # Update if score changed
        if new_score != lead.get("score", 0):
            sb.table("leads").update({"score": new_score}).eq("id", lead["id"]).execute()

        results.append({
            "lead_id": lead["id"],
            "name": lead["name"],
            "old_score": lead.get("score", 0),
            "new_score": new_score,
        })

    return results


async def score_single_lead(lead_id: str) -> dict:
    """Score a single lead and return the result."""
    sb = get_supabase()
    lead_res = sb.table("leads").select("*").eq("id", lead_id).single().execute()
    lead = lead_res.data

    act_res = (
        sb.table("activities")
        .select("id", count="exact")
        .eq("lead_id", lead_id)
        .execute()
    )
    activity_count = act_res.count or 0
    new_score = calculate_lead_score(lead, activity_count)

    sb.table("leads").update({"score": new_score}).eq("id", lead_id).execute()

    return {
        "lead_id": lead_id,
        "name": lead["name"],
        "old_score": lead.get("score", 0),
        "new_score": new_score,
    }
