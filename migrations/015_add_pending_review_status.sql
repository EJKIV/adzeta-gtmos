-- Add 'pending_review' to command_status enum
-- Required by the autonomy approval flow in oracle/command route
ALTER TYPE command_status ADD VALUE IF NOT EXISTS 'pending_review';
