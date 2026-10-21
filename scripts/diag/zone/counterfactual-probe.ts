/** Counterfactual run defenses (see docs/reviews/counterfactual-defense.md).
 * Same plays, bodies and seeds under CF_FLOW unset / hold / over. Per play:
 * gain, where the ball crossed the line (outside the play-side tackle,
 * inside, backside of the center), whether play-side reach blocks got
 * outside their man, unblocked defenders on the edge and backside at 1.5 s,
 * and lateral flow at 1.5 s by group. Observation only.
 * CF_FLOW=hold node --import tsx scripts/diag/zone/counterfactual-probe.ts [runs] [seeds] [--plays]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runReads } from '../../../src/sim/run-read.js';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const runs = (args[0] ?? 'oz_strong,wz_strong,oz_weak,wz_weak').split(',');
const seeds = (args[1] ?? '3,7').split(',').map(Number);
const showPlays = process.argv.includes('--plays');
const arm = process.env.CF_FLOW ?? 'current';
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
type Play = { name: string; stopper: string; read: string; gain: number; cross: string; crossY: number | null; reachWon: number; reaches: number;
  edgeFree: number; backFree: number; flow: Record<string, number> };
const plays: Play[] = [];
for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const ps = playSideSign(sim, RUN_BY_ID[run]), dir = sim.attackDir('O');
    const lat = (a: Agent) => (a.pos.y - sim.ballY) * ps;
    const y0 = new Map(sim.agents.map((a) => [a, a.pos.y]));
    const tackle = Math.max(...sim.offense.filter((a) => OL.has(a.slot)).map(lat));
    const reachers = new Set(sim.offense.filter((a) => (OL.has(a.slot) || sim.offAlign.spots[a.slot]?.inline) && lat(a) > 0.5));
    const reachSeen = new Map<Agent, boolean>();
    let cross: string | null = null, crossY: number | null = null, edgeFree = 0, backFree = 0, stopper = '';
    const flow: Record<string, number[]> = { OL: [], DL: [], LB: [] };
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      if (sim.t <= 1.2) for (const e of sim.engagements) {
        if (!reachers.has(e.blocker) || e.type !== 'run') continue;
        // Head across: the blocker's center is play side of his man's.
        reachSeen.set(e.blocker, lat(e.blocker) > lat(e.defender));
      }
      if (Math.abs(sim.t - 1.5) < sim.dt / 2) {
        const blocked = new Set(sim.engagements.map((e) => e.defender));
        for (const dfn of sim.defense) {
          const depth = (dfn.pos.x - sim.los) * dir;
          if (blocked.has(dfn) || depth > 4 || dfn.isDown(sim.t)) continue;
          if (lat(dfn) > tackle + .5) edgeFree++;
          if (lat(dfn) < -.5) backFree++;
        }
        for (const a of sim.agents) {
          const g = OL.has(a.slot) ? 'OL' : a.slot.startsWith('D') ? 'DL' : a.slot.startsWith('LB') ? 'LB' : null;
          if (g) flow[g].push((a.pos.y - y0.get(a)!) * ps);
        }
      }
      const c = sim.carrier;
      if (!cross && c && c.slot === 'RB' && (c.pos.x - sim.los) * dir > 0) {
        // Against the line where it is now: outside the play-side tackle
        // (or inline end), between him and the center, or behind the center.
        crossY = lat(c);
        const edgeNow = Math.max(...sim.offense.filter((a) => OL.has(a.slot) || sim.offAlign.spots[a.slot]?.inline).map(lat));
        const tackleNow = Math.max(...sim.offense.filter((a) => OL.has(a.slot)).map(lat)), centerNow = lat(sim.slot('C')!);
        cross = crossY > edgeNow + .3 ? 'outside end' : crossY > tackleNow ? 'C/D gap' : crossY > centerNow ? 'inside' : 'backside';
      }
      if (!stopper) for (const ev of sim.events) if (['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle'].includes(ev.type)) {
        const by = ev.type === 'carrier_contact' ? ev.b : ev.a;
        if (by !== undefined && sim.agents[by].team !== 'O') { stopper = `${sim.agents[by].slot}@${(((ev.pos?.x ?? sim.los) - sim.los) * dir).toFixed(1)}`; break; }
      }
    }
    const end = sim.endSpot ?? sim.carrier?.pos ?? { x: sim.los, y: 0 };
    const rs = runReads.get(sim.slot('RB')!);
    const read = rs?.answer ? `${rs.answer} (${rs.why}, key ${rs.key?.slot}, lev ${rs.leverage?.toFixed(2)}, at ${rs.committedAt?.toFixed(2)})` : rs ? `none (key ${rs.key?.slot ?? '-'})` : 'off';
    const mean = (v: number[]) => v.reduce((p, q) => p + q, 0) / Math.max(1, v.length);
    plays.push({ stopper, read, name: `${run} s${seed} ${o}/${d} ${front}${flip ? ' flip' : ''}`, gain: (end.x - sim.los) * dir,
      cross: cross ?? 'behind', crossY, reachWon: [...reachSeen.values()].filter(Boolean).length, reaches: reachSeen.size,
      edgeFree, backFree, flow: { OL: mean(flow.OL), DL: mean(flow.DL), LB: mean(flow.LB) } });
  }
const f = (x: number, n = 2) => x.toFixed(n);
if (showPlays) for (const p of plays) console.log(`${p.name.padEnd(30)} gain ${f(p.gain, 1).padStart(5)} cross ${p.cross.padEnd(8)} reach ${p.reachWon}/${p.reaches} edge free ${p.edgeFree} back free ${p.backFree} first contact ${p.stopper} | read ${p.read}`);
const n = plays.length, sum = (k: (p: Play) => number) => plays.reduce((a, p) => a + k(p), 0);
const gains = plays.map((p) => p.gain).sort((a, b) => a - b);
console.log(`arm ${arm}: ${n} plays | gain mean ${f(sum((p) => p.gain) / n)} median ${f(gains[n >> 1])} | 5+ yd ${f(plays.filter((p) => p.gain >= 5).length / n)}`);
for (const k of ['outside end', 'C/D gap', 'inside', 'backside', 'behind']) {
  const ps = plays.filter((p) => p.cross === k);
  console.log(`  crossed ${k.padEnd(11)} ${String(ps.length).padStart(3)} (${f(ps.length / n)}) mean gain ${ps.length ? f(ps.reduce((a, p) => a + p.gain, 0) / ps.length) : '  -'}`);
}
console.log(`  play-side reach got outside its man by 1.2 s: ${sum((p) => p.reachWon)}/${sum((p) => p.reaches)} (${f(sum((p) => p.reachWon) / Math.max(1, sum((p) => p.reaches)))})`);
console.log(`  unblocked within 4 yd at 1.5 s: edge ${f(sum((p) => p.edgeFree) / n)} per play, backside ${f(sum((p) => p.backFree) / n)} per play`);
console.log(`  lateral at 1.5 s: OL ${f(sum((p) => p.flow.OL) / n)} DL ${f(sum((p) => p.flow.DL) / n)} LB ${f(sum((p) => p.flow.LB) / n)}`);
const answers = new Map<string, Play[]>();
for (const p of plays) { const k = p.read.split(' (')[0] + ' ' + (p.read.match(/\((\w+ ?\w*),/)?.[1] ?? ''); answers.set(k, [...(answers.get(k) ?? []), p]); }
for (const [k, ps] of [...answers].sort()) console.log(`  read ${k.padEnd(26)} n ${String(ps.length).padStart(3)} mean gain ${f(ps.reduce((a, p) => a + p.gain, 0) / ps.length)}`);
