/**
 * SUPERSEDED by declined-looked.ts --commit: a forced throw here is not committed, and most are pulled down at the
 * plant re-check (pullDown) so the play goes on to another throw; its outcomes describe the rest of the play, and its
 * alternatives are reads he was not looking at. Kept for the record (docs/reviews/2026-11-12-int-belief.md).
 * What his interception belief costs him on the other side (Integration's request): on the forced-concept panel, at
 * the tick he decides to throw, every other read that is ready and that he priced at intRisk > 2% is a throw he
 * declined. Each is re-run: the same play (deterministic setup) with that throw started at that tick instead
 * (his own evaluation of it, his own release). Records his P and intRisk for it and what happened (completion, INT,
 * yards), beside the throw he actually made. Passive except for the forced re-runs.
 *   node --import tsx scripts/diag/read-plan/declined-risky.ts [--seeds 1,2] > out/read-plan/declined.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2').split(',').map(Number);
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const P: any = QBPass.prototype, st = P.startThrow;
let mode: { kind: 'natural' } | { kind: 'force'; t: number; slot: string } = { kind: 'natural' };
let decision: any = null, forced = false;
P.startThrow = function (a: any, sim: any, ev: any) {
  if (mode.kind === 'natural' && !decision) {
    const alts = [];
    for (const r of this.reads) {
      if (r === ev.target || !this.ready(r, sim)) continue;
      const e = this.evaluate(a, sim, r, 0);
      if (e && e.intRisk > 0.02) alts.push({ slot: r.slot, P: +e.P.toFixed(3), intRisk: +e.intRisk.toFixed(3), path: +(e.parts?.intPath ?? 0).toFixed(4), jump: +(e.parts?.intJump ?? 0).toFixed(4), contest: +(e.parts?.intContest ?? 0).toFixed(4), depth: +e.depth.toFixed(1) });
    }
    decision = { t: sim.t, slot: ev.target.slot, P: +ev.P.toFixed(3), intRisk: +ev.intRisk.toFixed(3), alts };
  }
  return st.call(this, a, sim, ev);
};
const play = (setup: any, force: { t: number; slot: string } | null) => {
  const sim: any = new PlaySim(nativeTraceSetup(setup));
  forced = false;
  if (force) {
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const qb = sim.qb.behavior;
      if (!forced && qb?.kind === 'qb-pass' && Math.abs(sim.t - force.t) < 1e-6 && sim.throwAt < 0) {
        const r = sim.offense.find((o: any) => o.slot === force.slot), ev = r && qb.evaluate(sim.qb, sim, r, 0);
        if (ev) { forced = true; qb.startThrow(sim.qb, sim, ev); }
      }
      tick();
    };
  }
  const res = sim.run(), s = sim.stats;
  return { cmp: !!s.completed, int: res.events.some((e: any) => e.type === 'interception'), yards: +res.yards.toFixed(2), sack: !!s.sacked, forced };
};
for (const c of concepts) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) {
  const setup = { coverage, concept: c.id, seed, roster: seed, formation, flip: false };
  mode = { kind: 'natural' }; decision = null;
  const nat = play(setup, null);
  if (!decision || !decision.alts.length) continue;
  const D = decision;
  for (const alt of D.alts) {
    mode = { kind: 'force', t: D.t, slot: alt.slot };
    const out = play(setup, { t: D.t, slot: alt.slot });
    if (!out.forced) continue;
    process.stdout.write(JSON.stringify({ concept: c.id, formation, coverage, seed, t: D.t, thrown: { slot: D.slot, P: D.P, intRisk: D.intRisk, ...nat },
      declined: { ...alt, cmp: out.cmp, int: out.int, yards: out.yards } }) + '\n');
  }
}
