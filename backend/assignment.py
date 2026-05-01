"""
Round-Robin Lead Assignment
---------------------------
Auto-assigns leads to available agents in rotation.
"""
from db import get_supabase


async def assign_lead_round_robin(lead_id: str) -> dict:
    """Assign a lead to the next agent in round-robin rotation."""
    sb = get_supabase()

    # Get active agents
    agents_res = (
        sb.table("profiles")
        .select("id, full_name")
        .eq("role", "agent")
        .eq("is_active", True)
        .order("full_name")
        .execute()
    )
    agents = agents_res.data or []
    if not agents:
        return {"error": "No active agents available"}

    # Get current counter
    counter_res = sb.table("assignment_counter").select("*").limit(1).execute()
    counter = counter_res.data[0] if counter_res.data else None
    if not counter:
        return {"error": "Assignment counter not initialized"}

    # Calculate next index
    last_index = counter["last_assigned_index"]
    next_index = (last_index + 1) % len(agents)
    assigned_agent = agents[next_index]

    # Update lead owner
    sb.table("leads").update({"owner_id": assigned_agent["id"]}).eq("id", lead_id).execute()

    # Update counter
    sb.table("assignment_counter").update({"last_assigned_index": next_index}).eq("id", counter["id"]).execute()

    # Log activity
    sb.table("activities").insert({
        "lead_id": lead_id,
        "type": "ASSIGNMENT",
        "actor_id": assigned_agent["id"],
        "title": f"Auto-assigned to {assigned_agent['full_name']}",
        "body": "Round-robin assignment via backend",
    }).execute()

    return {
        "lead_id": lead_id,
        "assigned_to": assigned_agent["full_name"],
        "agent_id": assigned_agent["id"],
        "rotation_index": next_index,
    }


async def get_workload_distribution() -> list[dict]:
    """Get current lead count per agent to visualize workload."""
    sb = get_supabase()
    agents_res = (
        sb.table("profiles")
        .select("id, full_name")
        .eq("role", "agent")
        .eq("is_active", True)
        .execute()
    )
    agents = agents_res.data or []

    result = []
    for agent in agents:
        count_res = (
            sb.table("leads")
            .select("id", count="exact")
            .eq("owner_id", agent["id"])
            .eq("status", "ACTIVE")
            .execute()
        )
        result.append({
            "agent_id": agent["id"],
            "agent_name": agent["full_name"],
            "active_leads": count_res.count or 0,
        })

    return sorted(result, key=lambda x: x["active_leads"])
