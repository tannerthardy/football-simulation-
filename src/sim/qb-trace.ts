/** The passer's per-stage command trace hook (Tools, 2026-11-24; docs/reviews/2026-11-24-qb-decision-plan.md section 4: "a per-stage command trace for the new cycle so dither-core covers it").
 *
 * A passive contract between a passer controller and the dither audit (scripts/diag/effective-mass/dither-core.ts). It records nothing itself, draws no RNG and installs no command: it forwards
 * to `sim.responsibility`, which exists only when a recorder is installed (dither-core's stub, or the command trace's ledger), and is a no-op otherwise. A controller that is rebuilt as stages calls it once per
 * tick per stage with the velocity (and facing) that stage asks for, in the order the stages run, and once per change of the read he is on:
 *
 *   qbStage(sim, 'qb-pressure', agent, { vel })   - this stage's output, whether or not it is the one finally used (dither-core charges a re-aim of the final request to the FIRST stage, in QB_STAGES order,
 *                                                  whose output turned or stopped);
 *   qbRead(sim, agent, { read: 2, target: 'H', stage: 'qb-cycle' })  - the read he is on this tick (index and target slot) and the stage that decided it. dither-core counts a change as the read being left,
 *                                                  and a return to the read he just left within 0.3 s as a reversal ("a read is left once", CLAUDE.md, commit to a decision), by stage.
 *
 * QB_STAGES is the order of the plan's cycle (module E); a stage the new controller does not have is simply never reported. Names are the QB lane's to keep in step with the plan; adding one means adding it here. */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export const QB_STAGES = ['qb-plan', 'qb-look', 'qb-judgment', 'qb-cycle', 'qb-pressure', 'qb-pocket'] as const;
export type QbStage = (typeof QB_STAGES)[number];
export interface QbRead { read: number; target: string | null; stage: QbStage }

type Recorder = { stage?: (st: string, a: Agent, c: { vel?: { x: number; y: number }; facing?: number }) => void; read?: (a: Agent, r: QbRead) => void };

/** One stage's requested command this tick (a no-op unless a recorder is installed). */
export function qbStage(sim: PlaySim, stage: QbStage, a: Agent, cmd: { vel?: { x: number; y: number }; facing?: number }): void {
  (sim.responsibility as unknown as Recorder | undefined)?.stage?.(stage, a, cmd);
}
/** The read he is on this tick and the stage that chose it (a no-op unless a recorder is installed). */
export function qbRead(sim: PlaySim, a: Agent, r: QbRead): void {
  (sim.responsibility as unknown as Recorder | undefined)?.read?.(a, r);
}
