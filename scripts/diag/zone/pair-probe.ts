/** Engaged zone pairs: why does a run block move laterally as slowly as it
 * does? For each engaged OL-DL run rep on stretch zone, per tick: each side's
 * lateral request, the pair's achieved lateral speed, ground traction use
 * (ground impulse / traction capacity) and hand forces. Play-side signed.
 *
 * node --import tsx scripts/diag/zone/pair-probe.ts [run=wz_strong]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { supportParams } from '../../../src/physics/support.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const run = process.argv[2] ?? 'wz_strong';
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const rows: Record<string, number[]>[] = [];
const bins = new Map<number, Record<string, number[]>>();
const addRaw = (t: number, k: string, v: number) => { const b = Math.round(t * 4) / 4; if (!bins.has(b)) bins.set(b, {}); (bins.get(b)![k] ??= []).push(v); };
for (const [o, dseed] of [[31, 32], [41, 42]]) for (const front of ['over', 'under']) for (const flip of [false, true]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(dseed), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const ps = playSideSign(sim, RUN_BY_ID[run]);
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    const pairs = sim.engagements.filter((e) => e.type === 'run' && OL.has(e.blocker.slot));
    const before = pairs.map((e) => ({ e, b: intents[e.blocker.idx], d: intents[e.defender.idx] }));
    const report = step(intents, dt);
    for (const { e, b, d } of before) {
      const B = e.blocker, D = e.defender;
      const sideKey = (D.pos.y - sim.ballY) * ps > .3 ? 'P' : (D.pos.y - sim.ballY) * ps < -.3 ? 'B' : 'M';
      const add = (t: number, k: string, v: number) => { addRaw(t, k, v); addRaw(t, sideKey + k, v); };
      add(sim.t, 'bReq', (b?.vel.y ?? 0) * ps); add(sim.t, 'dReq', (d?.vel.y ?? 0) * ps);
      add(sim.t, 'bAch', B.vel.y * ps); add(sim.t, 'dAch', D.vel.y * ps);
      add(sim.t, 'bReqX', (b?.vel.x ?? 0) * sim.attackDir(B.team)); add(sim.t, 'dReqX', (d?.vel.x ?? 0) * sim.attackDir(B.team));
      for (const [k, a] of [['b', B], ['d', D]] as const) {
        const g = report.groundImpulse[a.idx], cap = supportParams(a.profile).traction * dt;
        add(sim.t, k + 'Trac', Math.hypot(g.x, g.y) / Math.max(1e-9, cap));
      }
      add(sim.t, 'handN', Math.abs(e.hands?.normalForce ?? 0)); add(sim.t, 'handT', Math.abs(e.hands?.tangentForce ?? 0));
      add(sim.t, 'bFace', Math.abs(Math.atan2(Math.sin(B.facing), Math.cos(B.facing))));
    }
    return report;
  };
  while (sim.t < 1.8 && sim.phase === 'live') (sim as unknown as { tick(): void }).tick();
}
const m = (v?: number[]) => v?.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '  - ';
console.log(`${run}: engaged OL-DL run pairs, play-side lateral (yd/s); traction use = ground impulse / capacity`);
console.log(' t    n  | OL req  ach | DL req  ach | fwd req OL DL | traction OL DL | hand N   T');
for (const side of ['P', 'M', 'B']) {
  console.log(`-- ${side === 'P' ? 'play-side' : side === 'B' ? 'backside' : 'middle'} defenders: t n | OL req ach | DL req ach | traction OL DL`);
  for (const [t, k] of [...bins].sort((a, b) => a[0] - b[0])) console.log(`${t.toFixed(2)} ${String(k[side + 'bReq']?.length ?? 0).padStart(4)} | ${m(k[side + 'bReq'])} ${m(k[side + 'bAch'])} | ${m(k[side + 'dReq'])} ${m(k[side + 'dAch'])} | ${m(k[side + 'bTrac'])} ${m(k[side + 'dTrac'])}`);
}
for (const [t, k] of [...bins].sort((a, b) => a[0] - b[0])) console.log(`${t.toFixed(2)} ${String(k.bReq?.length ?? 0).padStart(4)} | ${m(k.bReq)} ${m(k.bAch)} | ${m(k.dReq)} ${m(k.dAch)} | ${m(k.bReqX)} ${m(k.dReqX)} | ${m(k.bTrac)} ${m(k.dTrac)} | ${m(k.handN)} ${m(k.handT)}`);
