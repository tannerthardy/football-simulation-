/** The defense against our quick screens, by coverage, on its existing rules (Rules + Coaching, 2026-11-14; the
 * specification for any screen-recognition work, which is not built until this table exists).
 *
 *   node --import tsx scripts/diag/screen-defense.mts [--seeds 12] [--json out/screens/defense.jsonl]
 *
 * Each quick screen (bubble, bunch now, now, tunnel) and the screen RPO from the screen lab's formation, against
 * nickel Over with each coverage below, seeds 1..N, both flips, installed checks made (a killed screen or a handed-off
 * RPO is counted, not measured). Per caught screen:
 * - the defender nearest the catcher at the catch: his slot, his coverage job (zone id, man, or rush) and distance;
 * - the first wrap on the carrier: the tackler's slot and job, and the yards after the catch;
 * - each screen blocker (stalk / crack / line jobs): whom he engaged before the tackle (if anyone), and whether that
 *   defender then made the first wrap ("won through"), was within 1.5 yd of the carrier while engaged ("shed late"),
 *   or never reached him ("held"). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RPO_CONCEPTS, RUN_BY_ID, SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SEEDS = Number(arg('--seeds', '12')), JSON_OUT = arg('--json', '');
const COVS = arg('--covs', 'cover3,cover3_cloud,cover2,cover4,cover1,cover1_off').split(',');
const ONLY = arg('--only', '').split(',').filter(Boolean);
const CALLS = [
  { id: 'bubble_screen', formation: 'gun_trips_11' }, { id: 'bunch_now_screen', formation: 'gun_bunch_11' },
  { id: 'wide_now_screen', formation: 'gun_doubles_11' }, { id: 'tunnel_screen', formation: 'gun_doubles_11' },
  ...RPO_CONCEPTS.map((r) => ({ id: r.id, formation: r.formation, rpo: r })),
];
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const job = (d: any): string => {
  const b = d.behavior; if (!b) return '?';
  const inner = b.prev ?? b.fallback ?? b;
  if (inner.zone) return inner.zone;
  if (inner.kind === 'man' || inner.target?.idx !== undefined && inner.kind?.includes('man')) return 'man';
  return inner.kind ?? '?';
};
type Row = { call: string; cov: string; killed: boolean; caught: boolean; yards: number; yac: number | null; near?: { slot: string; job: string; d: number };
  tackler?: { slot: string; job: string }; blocks: { job: string; on: string | null; onJob: string | null; result: string }[] };
const rows: Row[] = [];
for (const call of CALLS.filter((c) => !ONLY.length || ONLY.includes(c.id))) for (const cov of COVS) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID[call.formation];
  const screen = 'rpo' in call && call.rpo ? SCREEN_BY_ID[call.rpo.screen] : SCREEN_BY_ID[call.id];
  const sim: any = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: 'rpo' in call && call.rpo ? { formation, flip, kind: 'run', run: RUN_BY_ID[call.rpo.run], rpo: screen, label: call.id }
      : { formation, flip, kind: 'pass', pass: screen, label: call.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 + (flip ? 1 : 0),
  });
  if (sim.offCall.pass?.id !== screen.id) { rows.push({ call: call.id, cov, killed: true, caught: false, yards: sim.run().yards, yac: null, blocks: [] }); continue; }
  const jobAtSnap = new Map<number, string>();
  let catchT = -1, catchX = 0, near: Row['near'], carrier: any = null;
  const blockers = new Map<number, { job: string; on: any; closeWhileOn: boolean }>();
  const dir = sim.attackDir('O');
  sim.tick(); for (const d of sim.defense) jobAtSnap.set(d.idx, job(d));
  for (const a of sim.offense) if (a.behavior?.kind === 'screen-block') blockers.set(a.idx, { job: a.behavior.job?.job ?? a.behavior.job ?? '?', on: null, closeWhileOn: false });
  while (sim.phase !== 'dead' && sim.t < 15) {
    sim.tick();
    for (const [i, b] of blockers) {
      const e = sim.agents[i].engagement;
      if (e && !b.on) b.on = e.defender === sim.agents[i] ? e.blocker : e.defender;
      if (b.on && carrier && e && Math.hypot(b.on.pos.x - carrier.pos.x, b.on.pos.y - carrier.pos.y) < 1.5) b.closeWhileOn = true;
    }
    const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (catchT < 0 && c && c.team === 'O' && c !== sim.qb) {
      catchT = sim.t; catchX = c.pos.x; carrier = c;
      let best: any = null, bd = 1e9;
      for (const d of sim.defense) { const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); if (dd < bd) { bd = dd; best = d; } }
      near = { slot: best.slot, job: jobAtSnap.get(best.idx) ?? '?', d: Math.round(bd * 10) / 10 };
    }
  }
  const res = sim.result ?? sim.buildResult?.() ?? {};
  const wrap = sim.events.find((e: any) => e.type === 'tackle_wrap' && catchT >= 0 && e.t >= catchT);
  const tk = wrap ? sim.agents[wrap.a] : null;
  const endX = sim.endSpot?.x ?? (carrier ? carrier.pos.x : sim.los);
  const yards = (endX - sim.los) * dir;
  rows.push({ call: call.id, cov, killed: false, caught: catchT >= 0, yards, yac: catchT >= 0 ? (endX - catchX) * dir : null, near,
    tackler: tk ? { slot: tk.slot, job: jobAtSnap.get(tk.idx) ?? '?' } : undefined,
    blocks: [...blockers.values()].map((b) => ({ job: String(b.job), on: b.on?.slot ?? null, onJob: b.on ? jobAtSnap.get(b.on.idx) ?? '?' : null,
      result: !b.on ? 'no block' : tk && b.on === tk ? 'won through' : b.closeWhileOn ? 'shed late' : 'held' })) });
}
if (JSON_OUT) { mkdirSync(dirname(JSON_OUT), { recursive: true }); writeFileSync(JSON_OUT, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); }
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const top = (v: string[], k = 3) => { const c = new Map<string, number>(); for (const x of v) c.set(x, (c.get(x) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([x, n]) => `${x} ${Math.round(100 * n / v.length)}%`).join(', '); };
for (const call of CALLS.filter((c) => !ONLY.length || ONLY.includes(c.id))) {
  console.log(`\n== ${call.id}`);
  for (const cov of COVS) {
    const R = rows.filter((r) => r.call === call.id && r.cov === cov), M = R.filter((r) => !r.killed), C = M.filter((r) => r.caught);
    const B = C.flatMap((r) => r.blocks);
    console.log(`  ${cov.padEnd(13)} n ${R.length} killed ${R.length - M.length} caught ${C.length} | yards p50 ${med(M.map((r) => r.yards)).toFixed(1)} mean ${(M.reduce((s, r) => s + r.yards, 0) / Math.max(1, M.length)).toFixed(1)} | YAC p50 ${med(C.map((r) => r.yac!)).toFixed(1)}`
      + ` | nearest at catch p50 ${med(C.map((r) => r.near!.d)).toFixed(1)} yd: ${top(C.map((r) => `${r.near!.slot}/${r.near!.job}`))}`
      + ` | tackler: ${top(C.filter((r) => r.tackler).map((r) => `${r.tackler!.slot}/${r.tackler!.job}`))}`
      + ` | blocks: ${top(B.map((b) => `${b.job}:${b.result}`), 4)}`);
  }
}
