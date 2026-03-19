/**
 * Scheduled Jobs
 * 
 * Contains scheduled job implementations for:
 * - Sequence step due checks
 * - Autopilot tick checks
 */

import { supabase } from '../core/supabaseClient';
import { logger } from '../core/logger';
import { eventBus } from './eventBus';
import { EventType } from './types';
import { cronRunner } from './cronRunner';
import type { CronInterval } from './cronRunner';

// ============================================================================
// Sequence Step Due Check Job
// ============================================================================

/**
 * Check for sequence steps that are due to be sent
 * Runs every minute to find sequence steps scheduled for delivery
 */
export async function checkSequenceStepsDue(): Promise<void> {
  logger.debug('Checking for due sequence steps');
  
  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute ago
    const windowEnd = new Date(now.getTime() + 60000);   // 1 minute from now

    // Find sequence steps that are due
    const { data: dueSteps, error } = await supabase
      .from('sequence_steps')
      .select(`
        id,
        sequence_id,
        contact_id,
        scheduled_for,
        status,
        message_id
      `)
      .eq('status', 'pending')
      .gte('scheduled_for', windowStart.toISOString())
      .lte('scheduled_for', windowEnd.toISOString());

    if (error) {
      logger.error('Failed to fetch due sequence steps', { error });
      return;
    }

    if (!dueSteps || dueSteps.length === 0) {
      logger.debug('No due sequence steps found');
      return;
    }

    logger.info('Found due sequence steps', { count: dueSteps.length });

    // Emit events for each due step
    for (const step of dueSteps) {
      try {
        await eventBus.emit(
          EventType.SEQUENCE_STEP_DUE as any,
          {
            sequenceId: step.sequence_id,
            sequenceStepId: step.id,
            contactId: step.contact_id,
            scheduledFor: new Date(step.scheduled_for),
            messageId: step.message_id
          },
          `sequence_step_${step.id}`,
          {
            source: 'cron.sequence_due_check'
          }
        );

        logger.debug('Emitted SEQUENCE_STEP_DUE event', {
          sequenceStepId: step.id,
          contactId: step.contact_id
        });
      } catch (error) {
        logger.error('Failed to emit sequence step event', {
          error,
          stepId: step.id
        });
      }
    }
  } catch (error) {
    logger.error('Error in checkSequenceStepsDue', { error });
  }
}

/**
 * Find steps that should have been sent but weren't (missed due to system downtime)
 */
async function findMissedSequenceStepsInternal(): Promise<void> {
  logger.debug('Checking for missed sequence steps');
  
  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago

    const { data: missedSteps, error } = await supabase
      .from('sequence_steps')
      .select('id')
      .eq('status', 'pending')
      .lt('scheduled_for', cutoff.toISOString());

    if (error) {
      logger.error('Failed to fetch missed sequence steps', { error });
      return;
    }

    const count = missedSteps?.length || 0;
    
    if (count > 0) {
      logger.warn('Found missed sequence steps', { count });
    }
  } catch (error) {
    logger.error('Error in findMissedSequenceSteps', { error });
  }
}

// ============================================================================
// Autopilot Tick Check Job
// ============================================================================

/**
 * Check for autopilots that need to run their tick
 * Runs every minute to trigger autopilot processing
 */
export async function checkAutopilotsTick(): Promise<void> {
  logger.debug('Checking for autopilots to tick');
  
  try {
    const now = new Date();
    
    // Find active autopilots that should tick
    const { data: autopilots, error } = await supabase
      .from('autopilots')
      .select(`
        id,
        name,
        user_id,
        status,
        tick_interval,
        last_tick,
        tick_count,
        config
      `)
      .eq('status', 'running')
      .lte('next_tick', now.toISOString());

    if (error) {
      logger.error('Failed to fetch autopilots to tick', { error });
      return;
    }

    if (!autopilots || autopilots.length === 0) {
      logger.debug('No autopilots need to tick');
      return;
    }

    logger.info('Found autopilots to tick', { count: autopilots.length });

    // Emit AUTOPILOT_TICK events
    for (const autopilot of autopilots) {
      try {
        await eventBus.emit(
          EventType.AUTOPILOT_TICK as any,
          {
            autopilotId: autopilot.id,
            autopilotName: autopilot.name,
            tickNumber: (autopilot.tick_count || 0) + 1,
            tickInterval: autopilot.tick_interval,
            lastTick: autopilot.last_tick ? new Date(autopilot.last_tick) : null,
            triggeredAt: now,
            userId: autopilot.user_id
          },
          `autopilot_tick_${autopilot.id}_${autopilot.tick_count}`,
          {
            source: 'cron.autopilot_tick_check',
            metadata: {
              config: autopilot.config
            }
          }
        );

        // Update next tick time
        const tickIntervalMs = (autopilot.tick_interval || 1) * 60 * 1000;
        const nextTick = new Date(now.getTime() + tickIntervalMs);
        
        await supabase
          .from('autopilots')
          .update({
            last_tick: now.toISOString(),
            next_tick: nextTick.toISOString(),
            tick_count: (autopilot.tick_count || 0) + 1
          })
          .eq('id', autopilot.id);

        logger.debug('Emitted AUTOPILOT_TICK event', {
          autopilotId: autopilot.id,
          tickNumber: autopilot.tick_count + 1
        });
      } catch (error) {
        logger.error('Failed to emit autopilot tick event', {
          error,
          autopilotId: autopilot.id
        });
      }
    }
  } catch (error) {
    logger.error('Error in checkAutopilotsTick', { error });
  }
}

/**
 * Check for autopilots that have stalled
 */
async function checkStalledAutopilotsInternal(): Promise<void> {
  logger.debug('Checking for stalled autopilots');
  
  try {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    const { data: stalledAutopilots, error } = await supabase
      .from('autopilots')
      .select('id, name, status')
      .eq('status', 'running')
      .lt('last_tick', cutoff.toISOString());

    if (error) {
      logger.error('Failed to fetch stalled autopilots', { error });
      return;
    }

    const count = stalledAutopilots?.length || 0;
    
    if (count > 0) {
      logger.warn('Found stalled autopilots', { count });
      
      // Emit error events for stalled autopilots
      for (const autopilot of stalledAutopilots || []) {
        await eventBus.emit(
          EventType.AUTOPILOT_ERROR as any,
          {
            autopilotId: autopilot.id,
            autopilotName: autopilot.name,
            error: 'Autopilot has stalled - no tick received in expected time',
            occurredAt: new Date(),
            recoverable: true
          },
          `autopilot_stalled_${autopilot.id}`,
          { source: 'cron.stalled_check' }
        );
      }
    }
  } catch (error) {
    logger.error('Error in checkStalledAutopilots', { error });
  }
}

// ============================================================================
// Job Registration
// ============================================================================

/**
 * Register all scheduled jobs with the cron runner
 */
export function registerScheduledJobs(): void {
  // Sequence step due check - every 1 minute
  cronRunner.registerJob(
    'sequence_steps_due',
    checkSequenceStepsDue,
    1 as CronInterval
  );

  // Find missed sequence steps - every 2 minutes
  cronRunner.registerJob(
    'find_missed_sequence_steps',
    findMissedSequenceStepsInternal,
    2 as CronInterval
  );

  // Autopilot tick check - every 1 minute
  cronRunner.registerJob(
    'autopilot_tick_check',
    checkAutopilotsTick,
    1 as CronInterval
  );

  // Check for stalled autopilots - every 5 minutes
  cronRunner.registerJob(
    'autopilot_stalled_check',
    checkStalledAutopilotsInternal,
    5 as CronInterval
  );

  logger.info('Scheduled jobs registered');
}

/**
 * Start all scheduled jobs
 */
export function startScheduledJobs(): void {
  registerScheduledJobs();
  cronRunner.start();
  logger.info('Scheduled jobs started');
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  cronRunner.stop();
  logger.info('Scheduled jobs stopped');
}
