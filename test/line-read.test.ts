import { describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import * as runFits from '../src/sim/run-fits.js';

/** The line read (G2): a lineman reads the play from the line in front of him.
 * Each mechanism is checked on native snaps beside its opposing control: a
 * pass set or a route release is not a run step; a reach is not a down block;
 * a backside edge follows the line instead of replacing the spot. */
function play(concept: string, formation: string, seed: number, flip: boolean) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept, seed, roster: 7, formation, flip }));
  // The play side, from the offense's own plan: the way its pullers go (none on zone).
  const pullers = sim.offense.filter(a => (a.behavior as { plan?: { kind?: string } }).plan?.kind === 'pull');
  const home = new Map(pullers.map(a => [a, a.pos.y]));
  // When each edge first took each fit response (tags accumulate over the whole play), and what each edge's
  // own picture showed of every offensive man he looked at, by tick.
  const firstFit = new Map<string, number>();
  const fitFrame = new Map<string, { job: string | undefined; carrierPast: number | null; acquired?: Perceived }>();
  const sights: Array<{ t: number; slot: string; target: number; pos: { x: number; y: number }; vel: { x: number; y: number }; me: { x: number; y: number } }> = [];
  const see = sim.see.bind(sim);
  sim.see = (o, tg, scale) => {
    const r = see(o, tg, scale);
    if (o.slot.startsWith('DE') && tg.team === 'O') sights.push({ t: sim.t, slot: o.slot, target: tg.idx, pos: r.pos, vel: r.vel, me: { ...o.pos } });
    return r;
  };
  // Observe the actual fit call and its consumed picture. Sampling after tick()
  // mixes this decision with later contact/whistle: a legitimate box can occur
  // while the RB is held, then that same tick's tackle removes sim.carrier.
  const execute = runFits.executeRunFit;
  const fitObserver = vi.spyOn(runFits, 'executeRunFit').mockImplementation((a, current, gap, side, read) => {
    const command = execute(a, current, gap, side, read);
    if (current === sim) for (const tag of ['fit-replace', 'fit-box', 'fit-spill'])
      if (a.tags.has(tag) && !firstFit.has(`${a.slot}:${tag}`)) {
        firstFit.set(`${a.slot}:${tag}`, sim.t);
        fitFrame.set(`${a.slot}:${tag}`, { job: a.runFit?.kind,
          carrierPast: sim.carrier ? sim.carrier.pos.x - sim.los : null,
          acquired: read && 'possession' in read ? structuredClone(read.possession.cue) : undefined });
      }
    return command;
  });
  // How far inside the spot his gap's inside man left each free edge ever gets (+ = outside it).
  const inside = new Map<string, number>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const e of sim.defense) {
      const job = e.runFit;
      if (!e.slot.startsWith('DE') || e.engagement || job?.kind !== 'edge' || (job.gap !== 'C' && job.gap !== 'D')) continue;
      const mid = sim.offAlign.spots.C?.pos.y ?? sim.ballY;
      const out = sim.offense.filter(o => ['LT', 'LG', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
        .map(o => sim.offAlign.spots[o.slot]!.pos).filter(q => (q.y - mid) * job.side > 0).sort((p, q) => (p.y - q.y) * job.side);
      const inner = job.gap === 'D' ? out.at(-1) : out[1];
      if (inner) inside.set(e.slot, Math.min(inside.get(e.slot) ?? Infinity, (e.pos.y - inner.y - job.side * e.profile.radius) * job.side));
    }
  };
  try { sim.run(); } finally { fitObserver.mockRestore(); }
  const ballSide = Math.sign(pullers.reduce((s, a) => s + a.pos.y - home.get(a)!, 0));
  return { sim, ballSide, firstFit, fitFrame, sights, inside };
}
const dl = (sim: PlaySim) => sim.defense.filter(a => /^(DE|DT|NT)/.test(a.slot));
const interior = (sim: PlaySim) => dl(sim).filter(a => !a.slot.startsWith('DE'));
const edges = (sim: PlaySim) => dl(sim).filter(a => a.slot.startsWith('DE'));
const snaps = (concept: string, formation: string) =>
  [1, 2, 3].flatMap(seed => [false, true].map(flip => ({ seed, flip, ...play(concept, formation, seed, flip) })));
const tagged = (as: Agent[], tag: string) => as.filter(a => a.tags.has(tag)).length;

describe('a lineman reads the play from the line', () => {
  it('an interior lineman flat-steps on a zone step, and never on a pass set', () => {
    for (const s of snaps('oz_strong', 'ace_11')) expect(tagged(interior(s.sim), 'key-step')).toBe(interior(s.sim).length);
    for (const concept of ['curl_flat', 'four_verts', 'mesh'])
      for (const s of snaps(concept, 'gun_doubles_11')) expect(tagged(dl(s.sim), 'key-step')).toBe(0);
  });

  it('an edge squeezes a down block, not a route released inside past him', () => {
    // Inside zone's end man blocks down: one edge squeezes on every snap.
    for (const s of snaps('iz_strong', 'ace_11')) expect(tagged(edges(s.sim), 'key-squeeze')).toBeGreaterThan(0);
    // Mesh's tight end releases inside upright into his crossing route: not a down block.
    for (const s of snaps('mesh', 'gun_doubles_11')) expect(tagged(edges(s.sim), 'key-squeeze')).toBe(0);
  });

  it('a play-side edge replaces the vacated spot on counter or plays the kick-out he sees; a backside edge never replaces', () => {
    // Once he sees the kick-out arriving (a non-line blocker in front of him and in range is seen on the
    // ordinary delay under a run read), he plays it instead of squeezing to the spot: on one of the six
    // snaps he boxes the kick-out throughout. Only the play-side edge ever replaces, and his response
    // opens the play. A backside edge may later box a blocker arriving at him (run-fits' local kick-out
    // response, a different duty): with flat pullers off the line picture (#393) that late box no longer
    // occurs on these six, so two native counter snaps where it does (I-pro, seed 7, both flips) join the
    // backside checks. That response is protected by its acquired cue below, not counted as a replacement.
    const first = (s: ReturnType<typeof play>, a: Agent) =>
      Math.min(...['fit-replace', 'fit-box', 'fit-spill'].map(tag => s.firstFit.get(`${a.slot}:${tag}`) ?? Infinity));
    const counter = snaps('counter', 'i_jumbo_22');
    // On the combined reference (Run Game + Defense + Flex merged) the I-pro pair no longer shows it either;
    // I twins, seed 7, both flips do, so they join.
    const lateBox = [counter, [{ formation: 'i_pro_21', seed: 7, flip: false }, { formation: 'i_pro_21', seed: 7, flip: true },
      { formation: 'i_twins_21', seed: 7, flip: false }, { formation: 'i_twins_21', seed: 7, flip: true },
      { formation: 'i_pro_21', seed: 8, flip: false }]
      .map(({ formation, seed, flip }) => ({ seed, flip, ...play('counter', formation, seed, flip) }))].flat();
    for (const s of lateBox) {
      const playSide = edges(s.sim).filter(a => a.runFit!.side === s.ballSide);
      const backside = edges(s.sim).filter(a => a.runFit!.side !== s.ballSide);
      expect(playSide).toHaveLength(1);
      expect(first(s, playSide[0])).toBeLessThan(Infinity);
      for (const b of backside) {
        expect(b.tags.has('fit-replace')).toBe(false);
        expect(first(s, b)).toBeGreaterThan(first(s, playSide[0]));
        // A backside box is a response to a blocker his own picture shows arriving at him on that tick:
        // ahead of him, within 2.5 yd laterally, moving outward faster than 1.3 yd/s (run-fits' kick-out cue).
        const tag = s.firstFit.has(`${b.slot}:fit-box`) ? 'fit-box' : 'fit-spill';
        const boxed = s.firstFit.get(`${b.slot}:${tag}`);
        if (boxed !== undefined) {
          const side = b.runFit!.side, frame = s.fitFrame.get(`${b.slot}:${tag}`)!;
          // Still on his installed edge job (an edge keeps it until the carrier is 2+ yd past the LOS: Defense).
          expect(frame.job).toBe('edge');
          expect(frame.carrierPast).not.toBeNull();
          expect(frame.carrierPast!).toBeLessThanOrEqual(2);
          // A backside box answers a blocker his picture shows arriving; it can come before the handoff
          // (I-pro/I-twins seed 7: 0.95 s, carrier 3 yd behind the line), so it needs no possession picture.
          // When one was consumed, it shows the carrier no more than 2 yd past the line.
          if (frame.acquired?.carrying) expect(frame.acquired.pos.x - s.sim.los).toBeLessThanOrEqual(2);
          // The picture and fit are recorded in the same controller call;
          // a kick-out candidate is never the QB or the back.
          expect(s.sights.some(v => v.slot === b.slot && Math.abs(v.t - boxed) < 1e-9
            && v.target !== s.sim.qb.idx && v.target !== s.sim.slot('RB')?.idx
            && v.pos.x < v.me.x + .5 && Math.abs(v.pos.y - v.me.y) < 2.5 && v.vel.y * side > 1.3)).toBe(true);
        }
      }
    }
    // Squeeze, don't chase, on every snap: the play-side edge replaces the spot, or his live gap never takes
    // him inside it. A flat puller who has crossed behind the line no longer drags that gap in, so on two
    // snaps (seed 1, both flips) he stays 0.4+ yd outside the spot and the bound is never needed.
    for (const s of counter) {
      const playSide = edges(s.sim).find(a => a.runFit!.side === s.ballSide)!;
      if (!playSide.tags.has('fit-replace')) expect(s.inside.get(playSide.slot)).toBeGreaterThanOrEqual(0);
    }
    expect(counter.filter(s => edges(s.sim).some(a => a.tags.has('fit-replace'))).length).toBeGreaterThanOrEqual(4);
    // The late backside response is exercised, so its cue check above is not vacuous.
    expect(lateBox.some(s => edges(s.sim).some(a => a.runFit!.side !== s.ballSide
      && (a.tags.has('fit-box') || a.tags.has('fit-spill'))))).toBe(true);
    for (const s of snaps('wz_weak', 'ace_11')) expect(tagged(edges(s.sim), 'fit-replace')).toBe(0);
  });
});
