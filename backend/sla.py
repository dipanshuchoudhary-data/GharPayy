"""
SLA Monitor
-----------
Checks leads for SLA breaches:
- Warn: lead idle > 24h without activity
- Critical: lead idle > 48h without activity
"""
from datetime import datetime, timezone, timedelta
from db import get_supabase
from config import get_settings


async def check_sla_breaches() -> dict:
    """Check all active leads for SLA violations."""
    sb = get_supabase()
    s = get_settings()

    now = datetime.now(timezone.utc)
    warn_cutoff = (now - timedelta(hours=s.sla_warn_hours)).isoformat()
    critical_cutoff = (now - timedelta(hours=s.sla_critical_hours)).isoformat()

    # Get active leads that haven't been updated recently
    leads_res = sb.table("leads").select("id, name, owner_id, updated_at, stage_id").eq("status", "ACTIVE").execute()
    leads = leads_res.data or []

    warnings = []
    critical = []

    for lead in leads:
        updated = datetime.fromisoformat(lead["updated_at"].replace("Z", "+00:00"))
        idle_hours = (now - updated).total_seconds() / 3600

        # Get last activity time
        act_res = (
            sb.table("activities")
            .select("created_at")
            .eq("lead_id", lead["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        last_activity = None
        if act_res.data:
            last_activity = act_res.data[0]["created_at"]

        entry = {
            "lead_id": lead["id"],
            "name": lead["name"],
            "owner_id": lead["owner_id"],
            "idle_hours": round(idle_hours, 1),
            "last_activity": last_activity,
        }

        if idle_hours >= s.sla_critical_hours:
            critical.append(entry)
        elif idle_hours >= s.sla_warn_hours:
            warnings.append(entry)

    return {
        "checked_at": now.isoformat(),
        "total_leads": len(leads),
        "warnings": warnings,
        "critical": critical,
        "healthy": len(leads) - len(warnings) - len(critical),
    }


async def get_agent_sla_summary() -> list[dict]:
    """Get SLA compliance per agent."""
    sb = get_supabase()
    s = get_settings()
    now = datetime.now(timezone.utc)
    warn_cutoff = now - timedelta(hours=s.sla_warn_hours)

    agents_res = sb.table("profiles").select("id, full_name").eq("role", "agent").eq("is_active", True).execute()
    agents = agents_res.data or []

    result = []
    for agent in agents:
        leads_res = (
            sb.table("leads")
            .select("id, updated_at")
            .eq("owner_id", agent["id"])
            .eq("status", "ACTIVE")
            .execute()
        )
        leads = leads_res.data or []

        breached = sum(
            1 for l in leads
            if datetime.fromisoformat(l["updated_at"].replace("Z", "+00:00")) < warn_cutoff
        )
        total = len(leads)

        result.append({
            "agent_id": agent["id"],
            "agent_name": agent["full_name"],
            "total_leads": total,
            "sla_breached": breached,
            "compliance_pct": round(((total - breached) / total * 100) if total > 0 else 100, 1),
        })

    return result
