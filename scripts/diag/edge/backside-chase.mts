// Backside end on zone runs away (Run Game for Integration, 2026-11-16, report only): per 0.25 s, his lateral travel
// toward the ball (+), depth, his key's (the tackle over/inside him) travel, the branch driving him (tags), his request,
// and the carrier's position. Staged: zone runs, gun doubles / singleback, over / under fronts, cover 3, seeds × flip.
//   node scripts/ref.mjs -- npx tsx scripts/diag/edge/backside-chase.mts [seeds=6]
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { lineRead, pullers } from '../../../src/sim/run-fits.js';
const seeds = Number(process.argv[2] ?? 6);
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const T = [0.5, 1.0, 1.5, 2.0, 2.5];
const agg: Record<string, number[]> = {}; const tagc: Record<string, Record<string, number>> = {};
const push = (k: string, v: number) => (agg[k] ??= []).push(v);
for (const run of ['oz_strong', 'oz_weak', 'iz_strong', 'iz_weak']) for (const form of ['gun_doubles_11', 'singleback_11']) for (const fr of ['over', 'under'])
  for (let s = 1; s <= seeds; s++) for (const flip of [false, true]) {
    const formation = FORMATION_BY_ID[form]; if (!formation || !FRONT_BY_ID[fr]) continue;
    const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[fr], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'x' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 100 * s + 7, audibles: false } as any);
    // Play side: the side the carrier goes (sign of his lateral move by 1.5 s); backside end = the DE on the other side.
    const dir = sim.attackDir('O');
    const des = sim.defense.filter((d: any) => /^DE/.test(d.slot));
    const rows: any[] = []; let next = 0.25; const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); if (sim.t + 1e-9 < next) return; next += 0.25;
      const dd = des.map((d: any) => { const b: any = d.behavior; const key = b?.keyed ?? b?.inner?.keyed ?? null;
        return { key: key?.slot ?? '-', kst: key ? sim.see(d, key).stance : '-', kvy: key ? key.vel.y : 0, lr: lineRead(sim, d), pul: pullers(sim, d).length, beh: b?.kind ?? '-' }; });
      rows.push({ dd, t: +sim.t.toFixed(2), car: sim.carrier ? { ...sim.carrier.pos } : { ...sim.qb.pos }, de: des.map((d: any) => ({ slot: d.slot, p: { ...d.pos }, tags: [...d.tags].join(',') })),
        ol: Object.fromEntries(sim.offense.filter((o: any) => ['LT', 'RT'].includes(o.slot)).map((o: any) => [o.slot, { ...o.pos }])) }); };
    sim.run();
    const r15 = rows.find((r) => r.t >= 1.5); if (!r15) continue;
    const ps = Math.sign(r15.car.y - sim.ballY) || 1;
    const bi = des.findIndex((d: any) => (d.pos.y - sim.ballY) * ps < 0 || Math.sign(rows[0].de[des.indexOf(d)].p.y - sim.ballY) === -ps);
    const bs = rows[0].de.findIndex((d: any) => Math.sign(d.p.y - sim.ballY) === -ps); if (bs < 0) continue;
    const y0 = rows[0].de[bs].p.y, x0 = rows[0].de[bs].p.x;
    const tackle = Object.entries(rows[0].ol).find(([, p]: any) => Math.sign(p.y - sim.ballY) === -ps)?.[0] as string;
    const last = rows[rows.length - 1].de[bs].tags;
    const fam = (run.startsWith('oz') ? 'OZ' : 'IZ') + (last.includes('end-chase') ? ' end-chase' : last.includes('edge-trail') ? ' edge-trail' : ' other') + ` ${fr}`;
    for (const tt of T) { const r = rows.find((q) => Math.abs(q.t - tt) < 0.01); if (!r) continue;
      push(`${fam} toward ${tt}`, (r.de[bs].p.y - y0) * ps); push(`${fam} depth ${tt}`, (r.de[bs].p.x - sim.los) * dir);
      if (tackle) push(`${fam} tackle ${tt}`, (r.ol[tackle].y - rows[0].ol[tackle].y) * ps);
      push(`${fam} carrier ${tt}`, (r.car.y - y0) * ps);
      const tg = r.de[bs].tags.split(',').filter((x: string) => /chase|squeeze|edge|fit|key|set|rush|contain|spill|engaged/.test(x)).sort().join('+') || '(none)';
      ((tagc[`${fam} ${tt}`] ??= {})[tg] = ((tagc[`${fam} ${tt}`] ??= {})[tg] ?? 0) + 1); }
    void x0; void bi;
    if (process.env.WHY && !last.includes('end-chase')) for (const tt of [0.5, 0.75, 1.0]) { const r = rows.find((q) => Math.abs(q.t - tt) < 0.01); if (!r) continue;
      const w = r.dd[bs]; console.log(`WHY ${run} ${form} ${fr} s${s}${flip ? 'f' : ''} t ${tt}: beh ${w.beh} key ${w.key} stance ${w.kst} key vy toward ball ${(w.kvy * ps).toFixed(2)} lineRead ${w.lr * ps} pullers ${w.pul} tags ${r.de[bs].tags}`); }
  }
const q = (v: number[] = []) => { const s = [...v].sort((a, b) => a - b); return s.length < 4 ? '-' : [.25, .5, .75].map((p) => s[Math.floor(p * (s.length - 1))].toFixed(2)).join('/') + ` (n ${s.length})`; };
for (const fam of Object.keys(agg).map((k) => k.split(' toward ')[0]).filter((v, i, a) => a.indexOf(v) === i && !v.includes(' depth') && !v.includes(' tackle') && !v.includes(' carrier')).sort()) { console.log(`== ${fam} backside end`); for (const tt of T) console.log(`  t ${tt}: toward ball ${q(agg[`${fam} toward ${tt}`])} | depth past LOS ${q(agg[`${fam} depth ${tt}`])} | his tackle toward ${q(agg[`${fam} tackle ${tt}`])} | carrier lateral from him ${q(agg[`${fam} carrier ${tt}`])}`);
  for (const tt of T) console.log(`  tags ${tt}: ` + Object.entries(tagc[`${fam} ${tt}`] ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join('; ')); }
