/** Step 3c staged run-fit cases (Rules + Coaching): who made the fit, with FIT_RULES on and off. Run twice:
 *   npx tsx scripts/diag/fits/stage.ts            (FIT_RULES on, the default)
 *   FIT_RULES=0 npx tsx scripts/diag/fits/stage.ts
 * Same teams, calls and seeds both ways. Per case: the focus defenders' jobs, the first defender to contact the carrier,
 * the tacklers, mean yards, and when each focus defender first gets within 1.5 yd of the ball carrier (after the handoff). */
import { Rng } from '../../../src/core/rng.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefPersonnelId } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const N = Number(process.env.N ?? 16), LOS = 35;
const rng = new Rng(77);
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 }), away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
type Case = { id: string; fid: string; run: string; front: string; per: DefPersonnelId; cov: string; focus: string[] };
const ONLY = process.env.CASE;
const CASES: Case[] = [
  { id: '(a) IZ strong vs Over nickel cover3', fid: 'gun_doubles_11', run: 'iz_strong', front: 'over', per: 'nickel', cov: 'cover3', focus: ['LB_M'] },
  { id: '(b) IZ weak vs Over base cover3 (Will apex on the slot)', fid: 'gun_doubles_11', run: 'iz_weak', front: 'over', per: 'base43', cov: 'cover3', focus: ['LB_W'] },
  { id: '(c) IZ weak vs Over base cover1 (Will in man on the slot)', fid: 'gun_doubles_11', run: 'iz_weak', front: 'over', per: 'base43', cov: 'cover1', focus: ['LB_W', 'SS', 'FS'] },
  { id: '(d) OZ weak vs Over base cover3 (to the apex)', fid: 'gun_doubles_11', run: 'oz_weak', front: 'over', per: 'base43', cov: 'cover3', focus: ['LB_W'] },
  { id: '(e) IZ strong vs Over dime cover3', fid: 'gun_doubles_11', run: 'iz_strong', front: 'over', per: 'dime', cov: 'cover3', focus: ['LB_M', 'DB', 'SS'] },
  { id: '(f1) IZ strong vs Tite base34 cover3', fid: 'ace_11', run: 'iz_strong', front: 'tite', per: 'base34', cov: 'cover3', focus: ['NT', 'LB_M', 'LB_W'] },
  { id: '(f2) IZ weak vs Tite base34 cover3', fid: 'ace_11', run: 'iz_weak', front: 'tite', per: 'base34', cov: 'cover3', focus: ['NT', 'LB_M', 'LB_W'] },
  { id: '(g, expected worse) Power strong vs Over dime cover3', fid: 'gun_doubles_11', run: process.env.POWER ?? 'power', front: 'over', per: 'dime', cov: 'cover3', focus: ['LB_M', 'DB', 'SS'] },
];
const job = (j: any) => (j ? `${j.kind}:${j.gap}${j.side > 0 ? '+' : '-'}${j.inside ? `(${j.inside.gap}${j.inside.side > 0 ? '+' : '-'})` : ''}` : '-');
const tally = (m: Map<string, number>) => [...m].sort((p, q) => q[1] - p[1]).map(([k, v]) => `${k} ${v}`).join(', ');
console.log(`FIT_RULES=${process.env.FIT_RULES ?? '1(default)'} N=${N}`);
for (const c of CASES.filter((x) => !ONLY || x.id.startsWith(ONLY))) {
  const formation = FORMATION_BY_ID[c.fid], run = RUN_BY_ID[c.run];
  if (!run) { console.log(`${c.id}: no run ${c.run}`); continue; }
  const offense = pickOffense(home, formation.personnel), defense = pickDefense(away, c.per);
  const edges = new Map<string, [number, number]>(), first = new Map<string, number>(), tack = new Map<string, number>(), jobs = new Map<string, Map<string, number>>(), arrive = new Map<string, number[]>();
  let yards = 0;
  const seeds = new Rng(1234);
  for (let i = 0; i < N; i++) {
    const sim = new PlaySim({ offense, defense, offCall: { formation, flip: false, kind: 'run', run, label: c.run },
      defCall: { personnel: c.per, front: FRONT_BY_ID[c.front], coverage: COVERAGE_BY_ID[c.cov], pressure: null, label: c.cov }, los: LOS, ballY: CENTER_Y, firstDownX: LOS + 10, seed: seeds.nextU32() });
    if (i === 0) console.log(`  jobs (seed 1): ${sim.defense.map((a) => `${a.slot} ${job(a.runFit)}`).join(', ')}`);
    for (const s of c.focus) { const a = sim.slot(s); if (!a) continue; const m = jobs.get(s) ?? new Map(); const k = job(a.runFit); m.set(k, (m.get(k) ?? 0) + 1); jobs.set(s, m); }
    const reached = new Map<string, number>(); let crossedAt: number | null = null;
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < 12) {
      sim.tick();
      const car0 = sim.carrier;
      if (crossedAt === null && car0 && car0 !== sim.qb && (car0.pos.x - sim.los) * sim.attackDir(car0.team) > 0) {
        crossedAt = sim.t;
        for (const s of c.focus) { const a = sim.slot(s); if (a?.runFit?.kind !== 'force') continue;
          const ok = (a.pos.y - car0.pos.y) * a.runFit.side > 0 && Math.abs(a.pos.x - sim.los) < 3;
          const e = edges.get(s) ?? [0, 0]; e[0]++; if (ok) e[1]++; edges.set(s, e); }
      }
      for (const s of c.focus) {
        const a = sim.slot(s); if (!a?.runFit || reached.has(s)) continue;
        const car = sim.carrier;
        if (car && car !== sim.qb && Math.hypot(a.pos.x - car.pos.x, a.pos.y - car.pos.y) < 1.5) reached.set(s, sim.t);
      }
    }
    const r = sim.run();
    yards += r.yards;
    const fc = r.events.find((e) => e.type === 'carrier_contact' && e.b !== undefined && sim.agents[e.b]?.team === 'D');
    const fs = fc ? sim.agents[fc.b!].slot : 'none'; first.set(fs, (first.get(fs) ?? 0) + 1);
    for (const id of r.stats.tacklers ?? []) { const a = sim.agents.find((x) => x.player.id === id); const k = a?.slot ?? '?'; tack.set(k, (tack.get(k) ?? 0) + 1); }
    for (const [s, t] of reached) { const l = arrive.get(s) ?? []; l.push(t); arrive.set(s, l); }
  }
  console.log(`${c.id}: mean ${(yards / N).toFixed(2)} yd`);
  for (const s of c.focus) {
    const l = arrive.get(s) ?? [];
    console.log(`  ${s}: job ${tally(jobs.get(s) ?? new Map())}; within 1.5 yd of the carrier on ${l.length}/${N}${l.length ? `, median ${l.sort((p, q) => p - q)[Math.floor(l.length / 2)].toFixed(2)} s` : ''}`);
  }
  for (const [s, [n, k]] of edges) console.log(`  ${s} (force): outside the carrier, within 3 yd of the line, when he crossed it: ${k}/${n}`);
  console.log(`  first contact: ${tally(first)}`);
  console.log(`  tacklers: ${tally(tack)}`);
}
