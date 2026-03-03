/**
 * Gate Check for Actions
 * 
 * This module handles approval gates at the POINT OF ACTION,
 * not at intake. When agent is about to:
 * - Send an email
 * - Publish content  
 * - Make a call
 * - Execute any outbound action
 * 
 * ...that's when we check if approval is needed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GateCheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  gateStatus?: {
    gateId: string;
    gateName: string;
    currentStatus: string;
    locked: boolean;
    requiredRuns: number;
    currentRuns: number;
    requiredSuccessRate: number;
    currentSuccessRate: number;
  };
  alternatives?: {
    label: string;
    description: string;
    action: string;
  }[];
}

// Action types and their corresponding gates
const ACTION_GATES: Record<string, { gateId: string; gateName: string; description: string }> = {
  'send_email': {
    gateId: 'gate_4_actions',
    gateName: 'Direct Actions',
    description: 'Sending emails to prospects',
  },
  'publish_content': {
    gateId: 'gate_4_actions',
    gateName: 'Direct Actions',
    description: 'Publishing public content',
  },
  'make_call': {
    gateId: 'gate_4_actions',
    gateName: 'Direct Actions',
    description: 'Making phone calls',
  },
  'update_database': {
    gateId: 'gate_4_actions',
    gateName: 'Direct Actions',
    description: 'Bulk database updates',
  },
  'create_sequence': {
    gateId: 'gate_3_recommendations',
    gateName: 'Action Recommendations',
    description: 'Creating outreach sequences',
  },
  'launch_campaign': {
    gateId: 'gate_3_recommendations',
    gateName: 'Action Recommendations',
    description: 'Launching campaigns',
  },
};

/**
 * Check if an action requires approval at the point of execution
 */
export async function checkActionGate(
  supabase: SupabaseClient,
  action: string,
  userId?: string,
  context?: {
    confidence?: number;
    riskLevel?: string;
    prospectCount?: number;
  }
): Promise<GateCheckResult> {
  // Find the gate for this action
  const gateInfo = ACTION_GATES[action];
  
  if (!gateInfo) {
    // Unknown action - allow but warn
    return {
      allowed: true,
      reason: 'Unknown action type - proceeding with caution',
      requiresApproval: false,
    };
  }
  
  // Fetch gate status
  const { data: gate, error } = await supabase
    .from('adzeta_autonomy_gates')
    .select('*')
    .eq('gate_id', gateInfo.gateId)
    .single();
  
  if (error || !gate) {
    // Gate not found - default to requiring approval
    return {
      allowed: true,
      reason: `${gateInfo.description} - approval recommended but gate not found`,
      requiresApproval: true,
      alternatives: [
        {
          label: 'Proceed with approval',
          description: 'Add to work queue for review',
          action: 'queue_for_approval',
        },
        {
          label: 'Preview first',
          description: 'Show me what will be sent',
          action: 'preview_action',
        },
      ],
    };
  }
  
  // Check if gate is unlocked
  const isUnlocked = gate.current_status === 'unlocked' || gate.manually_unlocked;
  const isLocked = gate.manually_locked;
  
  // If manually locked, always require approval
  if (isLocked) {
    return {
      allowed: false,
      reason: `${gateInfo.gateName} is manually locked`,
      requiresApproval: true,
      gateStatus: {
        gateId: gate.gate_id,
        gateName: gate.gate_name,
        currentStatus: gate.current_status,
        locked: true,
        requiredRuns: gate.min_historical_runs,
        currentRuns: gate.runs_count,
        requiredSuccessRate: gate.min_success_rate,
        currentSuccessRate: gate.success_count / Math.max(1, gate.runs_count),
      },
      alternatives: [
        {
          label: 'Request unlock',
          description: `Gate needs ${gate.min_historical_runs - gate.runs_count} more successful runs`,
          action: 'request_gate_unlock',
        },
        {
          label: 'Add to queue',
          description: 'Manual approval required',
          action: 'queue_for_approval',
        },
      ],
    };
  }
  
  // Check additional safety thresholds for high-risk actions
  const prospectCount = context?.prospectCount || 0;
  const riskLevel = context?.riskLevel || 'low';
  const confidence = context?.confidence || 0;
  
  // Always require approval for:
  // - High risk + many prospects
  // - Critical risk (regardless of count)
  // - Low confidence
  if (riskLevel === 'critical') {
    return {
      allowed: true,
      reason: 'Critical risk action - approval required',
      requiresApproval: true,
      gateStatus: {
        gateId: gate.gate_id,
        gateName: gate.gate_name,
        currentStatus: gate.current_status,
        locked: false,
        requiredRuns: gate.min_historical_runs,
        currentRuns: gate.runs_count,
        requiredSuccessRate: gate.min_success_rate,
        currentSuccessRate: gate.success_count / Math.max(1, gate.runs_count),
      },
      alternatives: [
        {
          label: 'Proceed with approval',
          description: 'This will be queued for manual review',
          action: 'queue_for_approval',
        },
        {
          label: 'Reduce scope',
          description: 'Send to 1-2 prospects as test',
          action: 'reduce_scope',
        },
      ],
    };
  }
  
  if (riskLevel === 'high' && prospectCount > 100) {
    return {
      allowed: true,
      reason: `High risk action with ${prospectCount} prospects - approval required`,
      requiresApproval: true,
      alternatives: [
        {
          label: `Send to ${Math.min(10, prospectCount)} first`,
          description: 'Test with small batch',
          action: 'send_test_batch',
        },
        {
          label: 'Full queue approval',
          description: 'Add all to work queue',
          action: 'queue_for_approval',
        },
      ],
    };
  }
  
  // Gate is unlocked and not high-risk - allow
  if (isUnlocked && confidence >= (gate.min_confidence || 0.7)) {
    return {
      allowed: true,
      reason: `${gateInfo.gateName} unlocked - auto-executing`,
      requiresApproval: false,
      gateStatus: {
        gateId: gate.gate_id,
        gateName: gate.gate_name,
        currentStatus: gate.current_status,
        locked: false,
        requiredRuns: gate.min_historical_runs,
        currentRuns: gate.runs_count,
        requiredSuccessRate: gate.min_success_rate,
        currentSuccessRate: gate.success_count / Math.max(1, gate.runs_count),
      },
    };
  }
  
  // Gate is locked - require approval
  return {
    allowed: true,
    reason: `${gateInfo.gateName} locked - approval required`,
    requiresApproval: true,
    gateStatus: {
      gateId: gate.gate_id,
      gateName: gate.gate_name,
      currentStatus: gate.current_status,
      locked: true,
      requiredRuns: gate.min_historical_runs,
      currentRuns: gate.runs_count,
      requiredSuccessRate: gate.min_success_rate,
      currentSuccessRate: gate.success_count / Math.max(1, gate.runs_count),
    },
    alternatives: [
      {
        label: 'Add to work queue',
        description: 'Manual approval required',
        action: 'queue_for_approval',
      },
      {
        label: 'Learn more',
        description: `Gate needs ${gate.min_historical_runs} runs at ${(gate.min_success_rate * 100).toFixed(0)}% success`,
        action: 'explain_gate',
      },
    ],
  };
}

/**
 * Create work queue entry for approval
 */
export async function createActionApprovalEntry(
  supabase: SupabaseClient,
  action: string,
  intent: Record<string, unknown>,
  userId: string
): Promise<{ taskId: string } | null> {
  try {
    const { data: task, error } = await supabase
      .from('adzeta_work_queue')
      .insert({
        task_type: 'action',
        title: `Approve: ${action}`,
        description: `${ACTION_GATES[action]?.description || action} requires approval`,
        raw_request: JSON.stringify(intent),
        approval_state: 'pending_review',
        suggested_action: action,
        suggested_action_payload: { ...intent, action },
        risk_level: 'high',
        priority: 7,
        user_id: userId,
      })
      .select('task_id')
      .single();
    
    if (error || !task) {
      console.error('[gate-check] Failed to create approval entry:', error);
      return null;
    }
    
    return { taskId: task.task_id };
    
  } catch (err) {
    console.error('[gate-check] Error creating approval entry:', err);
    return null;
  }
}

/**
 * Record action execution result for gate metrics
 */
export async function recordActionResult(
  supabase: SupabaseClient,
  action: string,
  success: boolean,
  userId: string
): Promise<void> {
  try {
    // Record in agent metrics
    await supabase.rpc('record_action_metric', {
      action_type: action,
      success,
      user_id: userId,
    });
    
    // Check if this unlocks any gates
    await supabase.rpc('evaluate_gates', { task_type: 'action' });
    
  } catch (err) {
    console.error('[gate-check] Failed to record action result:', err);
  }
}
