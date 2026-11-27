/** Playwright globalSetup / globalTeardown for the AI controls sweep: reset the persisted rows, then build the report once. */
import { finalizeReport, resetRows } from './aiSweepRun';

export default async function globalSetup() { if (!process.env.AI_SWEEP_ONLY) resetRows(); }
export async function teardown() { if (!process.env.AI_SWEEP_ONLY) finalizeReport(); }
