/** Read-only 10 Hz trace of one run play, shared by run-film-trace.ts (whole games) and matched-restage.ts (restaged snaps).
 * Wraps sim.tick; the wrapper reads state only and draws no random numbers. */
import type { Agent } from '../../src/sim/agent.js';
import type { PlaySim } from '../../src/sim/playsim.js';

const r2 = (x: number) => Math.round(x * 100) / 100;

export interface RunTraceRec { setup: Record<string, unknown>; frames: unknown[]; events: unknown[] }
export function watchRunPlay(sim: PlaySim): () => RunTraceRec {
  const s = sim as unknown as { offCall: any; defCall: any; los: number; ballY: number; events: any[] };
  const plan = (a: Agent) => (a.behavior as unknown as { plan?: { kind?: string; pullRole?: string; target?: Agent | null; climbTo?: Agent | null } }).plan;
  const setup = {
    concept: s.offCall.run?.id, scheme: s.offCall.run?.scheme, formation: s.offCall.formation.id, flip: s.offCall.flip,
    front: s.defCall.front?.id, coverage: s.defCall.coverage?.id, pressure: s.defCall.pressure?.id ?? null, los: s.los, ballY: s.ballY,
    agents: sim.agents.map((a) => ({ i: a.idx, team: a.team, slot: a.slot, pos: a.player.position, job: a.behavior.kind,
      plan: plan(a)?.kind ?? null, role: plan(a)?.pullRole ?? null, tgt: plan(a)?.target?.slot ?? null, climb: plan(a)?.climbTo?.slot ?? null })),
  };
  const frames: unknown[] = [];
  const tick = sim.tick.bind(sim);
  // Frames at t = 0, 0.1, 0.2, ... (the snap, then every second 20 Hz tick),
  // so frame k is at 0.1k s, the same clock as the 10 Hz NFL tracking.
  let n = 0;
  const record = () => {
    const c = sim.carrier;
    frames.push({ t: r2(sim.t), c: c ? c.idx : -1, ph: sim.phase,
      a: sim.agents.map((a) => {
        const e = a.engagement;
        const beh = a.behavior as unknown as { target?: Agent | null };
        let tg = -1;
        if (a.team === 'O') { try { tg = beh.target?.idx ?? -1; } catch { tg = -1; } }
        return [r2(a.body.pos.x), r2(a.body.pos.y), r2(a.body.vel.x), r2(a.body.vel.y), r2(a.body.facing),
          e ? (e.blocker === a || e.helpers.includes(a) ? e.defender.idx : e.blocker.idx) : -1, tg, a.isDown(sim.t) ? 1 : 0,
          a.team === 'O' ? (plan(a)?.kind ?? a.behavior.kind) : a.behavior.kind];
      }) });
  };
  sim.tick = () => {
    if (n === 0) record();
    tick();
    if (++n % 2 === 0) record();
  };
  return () => ({ setup, frames, events: s.events.map((e) => ({ t: r2(e.t), type: e.type, a: e.a ?? null, b: e.b ?? null, note: e.note ?? null })) });
}
