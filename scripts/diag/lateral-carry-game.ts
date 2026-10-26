/**
 * PHY-1 companion to lateral-carry.ts: the same measurement on real game snaps.
 * Read-only; every run is an ordinary PlaySim run of a captured constructor.
 *
 *   node --import tsx scripts/diag/lateral-carry-game.ts capture 10 out/phy1/runs-seed10.json
 *   node --import tsx scripts/diag/lateral-carry-game.ts scan out/phy1/runs-seed10.json [run]
 *   node --import tsx scripts/diag/lateral-carry-game.ts ledger out/phy1/runs-seed10.json <run> [Y DE_S]
 *
 * capture: plays the ordinary game and saves each designed run with a Y.
 * scan: finds tight-end/end run blocks where the end asks to go one way along
 *   the line (> 1 yd/s) and moves the other way (> 1 yd/s) on his feet for
 *   0.5 s or more, and reports what the World delivered along the line: each
 *   body's ground force, the end's strength and traction budgets (as feet()
 *   computes them), availability, the hands' load and any third body's push.
 *   With a run number it also prints that run's ticks.
 * ledger: the end's and blocker's momentum budget per tick, m dv/dt = ground +
 *   joints + contacts (the residual should be zero), naming every joint that
 *   loads the end. This is how a helper's hands are found.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { G } from '../../src/core/units.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { directionalSpeedFactor } from '../../src/physics/kinematics.js';
import { supportParams } from '../../src/physics/support.js';
import type { HandJoint } from '../../src/physics/world.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

type Captured = { n: number; call: string; defense: string; setup: string };
const [mode, a1, a2, a3, a4] = process.argv.slice(2);
const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const load = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Captured[];
const restage = (r: Captured) => new PlaySim(restoreSetup(Buffer.from(r.setup, 'base64')));

if (mode === 'capture') {
  // Same teams and numbering as edge-contain-restage.ts (every playResult call counts).
  const seed = Number(a1), out = a2 ?? `out/phy1/runs-seed${seed}.json`;
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let n = 0, setup: PlaySetup | null = null;
  const runs: Captured[] = [];
  simulateGame(home, away, { seed, hooks: { playSetup: s => { setup = s; }, playResult: (sim, kind) => {
    n++;
    if (kind === 'scrimmage' && !sim.isPass && setup && sim.offCall.formation.slots.Y)
      runs.push({ n, call: sim.offCall.label, defense: sim.defCall.label, setup: captureSetup(setup).toString('base64') });
    return undefined;
  } } });
  writeFileSync(out, JSON.stringify(runs));
  console.log(`captured ${runs.length} runs to ${out}`);
} else if (mode === 'scan') {
  scan(load(a1), a2 === undefined ? NaN : Number(a2));
} else if (mode === 'ledger') {
  ledger(load(a1).find(r => r.n === Number(a2))!, a3 ?? 'Y', a4 ?? 'DE_S');
} else {
  console.error('usage: capture <seed> [out] | scan <runs.json> [run] | ledger <runs.json> <run> [blocker end]');
  process.exit(1);
}

interface Tick { t: number; dVy: number; bVy: number; dWant: number; dGround: number; bGround: number; dCap: number; dTraction: number;
  bCap: number; dAvail: number; dAlong: number; third: number; hands: number; dLean: number; bLean: number; dState: string }

function scan(runs: Captured[], show: number): void {
  const episodes: Array<{ n: number; call: string; pair: string; ticks: Tick[] }> = [];
  for (const r of runs) {
    const sim = restage(r);
    const w = sim.world as unknown as { alpha: ArrayLike<number>; liftFelt: ArrayLike<number> };
    const open = new Map<object, { pair: string; ticks: Tick[] }>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const step = sim.lastStep;
      if (!step) return;
      for (const e of sim.engagements) {
        const b = e.blocker, d = e.defender;
        if (!/^(Y|H|F)$/.test(b.slot) || !/^DE_/.test(d.slot) || e.type !== 'run') continue;
        const di = d.idx, bi = b.idx, md = d.profile.massKg, spD = supportParams(d.profile), spB = supportParams(b.profile);
        const intent = sim.intents[di];
        const ground = (i: number) => step.groundImpulse[i].y / sim.dt;
        // The end's leg budget along the line, as world.ts feet() computes it.
        const dir = Math.sign(intent?.vel.y ?? 0) || 1;
        const along = directionalSpeedFactor(d.profile, angle(Math.atan2(dir, 0) - d.facing));
        const lift = Math.min(2, Math.max(0, 1 - w.liftFelt[di] / (md * G)));
        // Lateral force on the end from anyone but his blocker. The contact
        // record keeps magnitude only; its direction is taken from the centers.
        let third = 0;
        for (const c of step.contacts) {
          if ((c.i !== di && c.j !== di) || c.i === bi || c.j === bi) continue;
          const pi = sim.agents[c.i].pos, pj = sim.agents[c.j].pos, l = Math.hypot(pj.x - pi.x, pj.y - pi.y) || 1;
          third += (c.j === di ? 1 : -1) * c.impulse * (pj.y - pi.y) / l / sim.dt;
        }
        const rec = open.get(e) ?? { pair: `${b.slot}->${d.slot}`, ticks: [] };
        open.set(e, rec);
        rec.ticks.push({ t: +sim.t.toFixed(2), dVy: d.body.vel.y, bVy: b.body.vel.y, dWant: intent?.vel.y ?? 0,
          dGround: ground(di), bGround: ground(bi), dCap: spD.pushForce * along * w.alpha[di], dTraction: spD.traction * lift * w.alpha[di],
          bCap: Math.min(spB.pushForce, spB.traction), dAvail: w.alpha[di], dAlong: along, third, hands: e.hands?.normalForce ?? 0,
          dLean: d.body.support!.lean.y, bLean: b.body.support!.lean.y, dState: d.body.support!.state });
      }
    };
    sim.run();
    for (const v of open.values()) episodes.push({ n: r.n, call: r.call, ...v });
  }
  for (const ep of episodes) {
    const carried = ep.ticks.filter(k => Math.abs(k.dWant) > 1 && k.dVy * k.dWant < 0 && Math.abs(k.dVy) > 1 && k.dState === 'up');
    if (carried.length < 10) continue;
    const mean = (f: (k: Tick) => number) => carried.reduce((s, k) => s + f(k), 0) / carried.length;
    const s = (k: Tick) => -Math.sign(k.dWant); // + = the way he is being carried
    console.log(JSON.stringify({ n: ep.n, call: ep.call.slice(0, 40), pair: ep.pair, seconds: +(carried.length * 0.05).toFixed(2),
      carrySpeed: +mean(k => k.dVy * s(k)).toFixed(2),
      endGroundResist: +mean(k => -k.dGround * s(k)).toFixed(0), endStrengthCap: +mean(k => k.dCap).toFixed(0), endTractionCap: +mean(k => k.dTraction).toFixed(0),
      endAvail: +mean(k => k.dAvail).toFixed(2), endAlong: +mean(k => k.dAlong).toFixed(2),
      blockerGroundDrive: +mean(k => k.bGround * s(k)).toFixed(0), blockerCap: +mean(k => k.bCap).toFixed(0),
      endLeanResist: +mean(k => -k.dLean * s(k)).toFixed(0), thirdPush: +mean(k => k.third * s(k)).toFixed(0), hands: +mean(k => k.hands).toFixed(0) }));
  }
  for (const ep of episodes.filter(e => e.n === show)) {
    console.log(`\n${ep.n} ${ep.pair}: t dVy bVy dWant dGround bGround hands dLean bLean dAvail`);
    for (const k of ep.ticks) console.log([k.t, k.dVy.toFixed(2), k.bVy.toFixed(2), k.dWant.toFixed(1), k.dGround.toFixed(0), k.bGround.toFixed(0),
      k.hands.toFixed(0), k.dLean.toFixed(0), k.bLean.toFixed(0), k.dAvail.toFixed(2)].join(' '));
  }
  console.log(`${runs.length} runs, ${episodes.length} tight-end/end run blocks. Forces kg·yd/s² (x0.9144 = N), speeds yd/s, y = along the line.`);
}

function ledger(r: Captured, slotB: string, slotD: string): void {
  const sim = restage(r);
  const D = sim.bySlot.get(slotD)!, B = sim.bySlot.get(slotB)!;
  const who = (body: unknown) => sim.agents.find(x => x.body === body)?.slot;
  const prev = new Map<number, number>();
  const tick = sim.tick.bind(sim);
  console.log('t body vy m*dv/dt ground joints contactWithOther contactsElse residual');
  sim.tick = () => {
    tick();
    const st = sim.lastStep;
    for (const a of [D, B]) {
      const v = a.body.vel.y, before = prev.get(a.idx);
      prev.set(a.idx, v);
      if (!st || before === undefined) continue;
      const net = a.profile.massKg * (v - before) / sim.dt, ground = st.groundImpulse[a.idx].y / sim.dt;
      let joints = 0;
      for (const j of sim.world.joints as HandJoint[]) {
        if (j.a !== a.body && j.b !== a.body) continue;
        const fy = (j.normalForceOnB?.y ?? 0) + (j.tangentForceOnB?.y ?? 0), on = j.b === a.body ? fy : -fy;
        joints += on;
        if (a === D && Math.abs(on) > 50) console.log(`   ${j.kind} ${who(j.a)}->${who(j.b)} actor ${who(j.actor ?? j.a)}: ${on.toFixed(0)} on ${a.slot}`);
      }
      let cPair = 0, cElse = 0;
      for (const c of st.contacts) {
        if (c.i !== a.idx && c.j !== a.idx) continue;
        const pi = sim.agents[c.i].pos, pj = sim.agents[c.j].pos, l = Math.hypot(pj.x - pi.x, pj.y - pi.y) || 1;
        const f = (c.j === a.idx ? 1 : -1) * c.impulse * (pj.y - pi.y) / l / sim.dt, other = c.i === a.idx ? c.j : c.i;
        if (other === (a === D ? B.idx : D.idx)) cPair += f; else cElse += f;
      }
      console.log([sim.t.toFixed(2), a.slot, v.toFixed(2), net.toFixed(0), ground.toFixed(0), joints.toFixed(0), cPair.toFixed(0), cElse.toFixed(0),
        (net - ground - joints - cPair - cElse).toFixed(0)].join(' '));
    }
  };
  sim.run();
}
