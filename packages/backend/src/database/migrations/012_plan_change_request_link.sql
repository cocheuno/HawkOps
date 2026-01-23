-- Migration 012: Link implementation plans to change requests
-- Allows creating change requests from approved implementation plans

-- Add column to track which change request was created from a plan
ALTER TABLE implementation_plans
ADD COLUMN IF NOT EXISTS related_change_request_id UUID REFERENCES change_requests(id) ON DELETE SET NULL;

-- Add column to track which plan a change request was created from
ALTER TABLE change_requests
ADD COLUMN IF NOT EXISTS related_plan_id UUID REFERENCES implementation_plans(id) ON DELETE SET NULL;

-- Add new status for plans that have been converted to change requests
-- Update the status check constraint to include 'change_requested'
ALTER TABLE implementation_plans DROP CONSTRAINT IF EXISTS implementation_plans_status_check;
ALTER TABLE implementation_plans ADD CONSTRAINT implementation_plans_status_check
CHECK (status IN ('draft', 'submitted', 'ai_reviewing', 'ai_approved', 'ai_needs_revision', 'ai_rejected', 'implementing', 'completed', 'cancelled', 'change_requested'));

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_implementation_plans_related_cr ON implementation_plans(related_change_request_id) WHERE related_change_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_change_requests_related_plan ON change_requests(related_plan_id) WHERE related_plan_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN implementation_plans.related_change_request_id IS 'The change request created from this implementation plan';
COMMENT ON COLUMN change_requests.related_plan_id IS 'The implementation plan this change request was created from';
