/*
  # Add unique index on autopilot_state(lead_id, agent_type)

  1. Changes
    - Adds a unique index on `autopilot_state` table for the combination of `lead_id` and `agent_type`
    - This prevents race conditions where concurrent requests could create duplicate autopilot states
      for the same lead and agent type
    - Uses `IF NOT EXISTS` guard for safety

  2. Why This Is Needed
    - The trigger-autopilot function performs a check-then-insert pattern on autopilot_state
    - Without a unique constraint, two concurrent requests could both see no existing state
      and both insert a new row, creating duplicates
    - This index ensures the database enforces uniqueness at the data layer
*/

CREATE UNIQUE INDEX IF NOT EXISTS idx_autopilot_state_lead_agent_unique
  ON autopilot_state (lead_id, agent_type);
