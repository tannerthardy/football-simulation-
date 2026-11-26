/** Step 6 item 1 staged cases: run with BACK_SEEN on and =0 and compare.
 *   npx tsx scripts/diag/ir/back-seen.ts ; BACK_SEEN=0 npx tsx scripts/diag/ir/back-seen.ts
 * Per case: a per-play hash of the event log (identity check), mean yards, and when the box backers first read pass
 * or run (recog.read), seed by seed. */
import { createHash } from 'node:crypto';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { describeOffenseSnap, type OffenseSnapDescription } from '../../../src/playbook/ir/offense.js';
import type { OffensivePlayCall, PersonnelId } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { seenBack } from '../../../src/sim/seen-back.js';
const N = 16, rng = new Rng(404);
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 }), away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
const over = (p: 'base43' | 'nickel') => ({ personnel: p, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' });
const ipro = FORMATION_BY_ID.i_pro_21;
const fDesc = { ...describeOffenseSnap(ipro, { kind: 'run', run: { scheme: 'insideZone', direction: 'strong' } }), roles: { carrier: 'F', back: 'RB', outlet: 'RB' } } as OffenseSnapDescription;
const run = (f: string, r: string): OffensivePlayCall => ({ formation: FORMATION_BY_ID[f], flip: false, kind: 'run', run: RUN_BY_ID[r], label: r });
const pass = (f: string, c: string): OffensivePlayCall => ({ formation: FORMATION_BY_ID[f], flip: false, kind: 'pass', pass: PASS_BY_ID[c], label: c });
const CASES: Array<{ id: string; off: OffensivePlayCall; offDesc?: OffenseSnapDescription; per: PersonnelId; def: ReturnType<typeof over> }> = [
  { id: 'ordinary: ace_11 inside zone vs Over base', off: run('ace_11', 'iz_strong'), per: '11', def: over('base43') },
  { id: 'ordinary: gun_doubles_11 inside zone vs Over nickel', off: run('gun_doubles_11', 'iz_strong'), per: '11', def: over('nickel') },
  { id: 'ordinary: gun_doubles_11 stick vs Over nickel', off: pass('gun_doubles_11', 'stick'), per: '11', def: over('nickel') },
  { id: 'I pro, F carries (inside zone) vs Over base', off: run('i_pro_21', 'iz_strong'), offDesc: fDesc, per: '21', def: over('base43') },
  { id: 'empty: gun_empty_11 stick vs Over nickel', off: pass('gun_empty_11', 'stick'), per: '11', def: over('nickel') },
  { id: 'empty: gun_empty_11 QB draw vs Over nickel', off: run('gun_empty_11', 'qb_draw'), per: '11', def: over('nickel') },
  { id: 'split backs: gun_split_11 inside zone vs Over base', off: run('gun_split_11', 'iz_strong'), per: '11', def: over('base43') },
];
for (const c of CASES) {
  if (!c.off.run && !c.off.pass) { console.log(`${c.id}: no such concept`); continue; }
  const offense = pickOffense(home, c.per), defense = pickDefense(away, c.def.personnel), seeds = new Rng(7);
  let yards = 0; const h = createHash('sha256'); const keys = new Map<string, number>(); const reads: number[] = [];
  for (let i = 0; i < N; i++) {
    const sim = new PlaySim({ offense, defense, offCall: c.off, offDesc: c.offDesc, defCall: c.def, los: 35, ballY: CENTER_Y, firstDownX: 45, seed: seeds.nextU32() });
    if (i === 0) for (const s of ['LB_M', 'LB_W', 'LB_S', 'DT_S']) { const d = sim.slot(s); if (d) { const k = `${s}->${seenBack(sim, d)?.slot ?? 'none'}`; keys.set(k, 1); } }
    let firstRead = -1;
    while (sim.phase === 'live' && sim.t < 12) { sim.tick(); if (firstRead < 0 && sim.slot('LB_M')?.recog?.read) firstRead = sim.t; }
    const r = sim.run(); yards += r.yards; if (firstRead >= 0) reads.push(firstRead);
    h.update(JSON.stringify(r.events.map((e) => [e.t, e.type, e.a, e.b])) + r.yards.toFixed(4));
  }
  reads.sort((p, q) => p - q);
  console.log(`${c.id}: mean ${(yards / N).toFixed(2)} yd; Mike first read median ${reads.length ? reads[Math.floor(reads.length / 2)].toFixed(2) : '-'} s; keys ${[...keys.keys()].join(' ')}; plays hash ${h.digest('hex').slice(0, 12)}`);
}
