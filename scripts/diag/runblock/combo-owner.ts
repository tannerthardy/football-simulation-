/** Who in a zone double actually blocks (observation only). For each double
 * (combination: owner = the member who held the man alone, helper = the
 * uncovered member) on the lab's zone cases: where the man stood relative to
 * the owner at the snap (+ = play side of him), whether the owner and the
 * helper ever touched him, whether the double released a climber, and how
 * long the owner went without touching anyone in the first 2.5 s. Also every
 * zone blocker who touched nobody by 2.5 s, by plan kind.
 * node --import tsx scripts/diag/runblock/combo-owner.ts [--concepts iz,oz,wz] [--seeds 77,1] [--formations ace_12] */
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const R = rosters();
type Row = { concept: string; side: string; ownerTouched: boolean; helperTouched: boolean; released: boolean; gain: number; ownerOn: number; helperOn: number; idle: number; relAt: number };
const rows: Row[] = [];
const idle = new Map<string, { n: number; idle: number }>();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS.map((l) => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const c: LabCase = { concept, dir, look: lk, roster, seed, formation };
      const sim = makeSim(c, R);
      const ps = playSideSign(sim, sim.offCall.run!);
      const touched = new Map<number, Set<number>>();
      const combos = new Map<any, { owner: any; helper: any; side: number; released: boolean; ownerOn: number; helperOn: number; idle: number; relAt: number }>();
      const blockers = new Map(sim.offense.filter((a) => a.behavior instanceof RunBlocker && (a.behavior as RunBlocker).plan.target?.team === 'D')
        .map((a) => [a, (a.behavior as RunBlocker).plan.kind]));
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        for (const a of sim.offense) {
          const b = a.behavior instanceof RunBlocker ? a.behavior : null;
          const combo = b?.plan.combination;
          if (combo && !combos.has(combo)) {
            const [owner, helper] = combo.members;
            combos.set(combo, { owner, helper, side: (combo.defender.pos.y - owner.pos.y) * ps, released: false, ownerOn: 0, helperOn: 0, idle: 0, relAt: NaN });
          }
          const e = a.engagement;
          if (e && sim.t <= 2.5) {
            const s = touched.get(a.idx) ?? new Set<number>(); touched.set(a.idx, s);
            s.add((e.blocker === a ? e.defender : e.blocker).idx);
            for (const h of e.helpers ?? []) if (h === a) s.add(e.defender.idx);
          }
          for (const d of sim.defense) if (d.engagement?.helpers?.includes(a) && sim.t <= 2.5) {
            const s = touched.get(a.idx) ?? new Set<number>(); touched.set(a.idx, s); s.add(d.idx);
          }
        }
        for (const [combo, r] of combos) {
          if (combo.released && !r.released) { r.released = true; r.relAt = sim.t; }
          if (sim.t > 2.5) continue;
          const on = (b: any) => { const e = combo.defender.engagement; return !!e && (e.blocker === b || e.helpers.includes(b)); };
          if (on(r.owner)) r.ownerOn += sim.dt;
          if (on(r.helper)) r.helperOn += sim.dt;
          if (sim.t > .8 && !r.owner.engagement && !sim.defense.some((d) => d.engagement?.helpers.includes(r.owner))) r.idle += sim.dt;
        }
      }
      const gain = sim.buildResult().offenseYards;
      for (const [combo, r] of combos) if (process.argv.includes('--list') && r.ownerOn < .3 && !(r.relAt <= 2))
        console.log(`stuck ${concept}/${dir}/${formation}/${lk}/${roster}/${seed} ${r.owner.slot}+${r.helper.slot} on ${combo.defender.slot}`);
      for (const [combo, r] of combos) rows.push({ concept: `${concept}/${dir}`, side: r.side < -.25 ? 'man on his backside' : r.side > .25 ? 'man on his play side' : 'man head-up',
        ownerTouched: !!touched.get(r.owner.idx)?.has(combo.defender.idx), helperTouched: !!touched.get(r.helper.idx)?.has(combo.defender.idx), released: r.released, gain,
        ownerOn: r.ownerOn, helperOn: r.helperOn, idle: r.idle, relAt: r.relAt });
      for (const [a, kind] of blockers) {
        const k = `${concept} ${kind}`;
        const s = idle.get(k) ?? { n: 0, idle: 0 }; idle.set(k, s); s.n++;
        if (!touched.get(a.idx)?.size) s.idle++;
      }
    }
const pct = (a: number, b: number) => `${(100 * a / Math.max(1, b)).toFixed(0)}%`;
const groups = new Map<string, Row[]>();
for (const r of rows) { const k = `${r.concept.split('/')[0]} ${r.side}`; groups.set(k, [...(groups.get(k) ?? []), r]); }
for (const [k, g] of [...groups].sort()) {
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];
  const lost = g.filter((r) => !r.ownerTouched);
  const q = (v: number[], f = .5) => { const z = v.filter((x) => !isNaN(x)).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))].toFixed(2) : '-'; };
  const stuck = g.filter((r) => r.ownerOn < .3 && !(r.relAt <= 2));
  console.log(`${k.padEnd(28)} owner on man p50 ${q(g.map((r) => r.ownerOn))} s, helper ${q(g.map((r) => r.helperOn))} s | released by 2.0 s ${pct(g.filter((r) => r.relAt <= 2).length, g.length)} | owner idle 0.8-2.5 s p50/p75 ${q(g.map((r) => r.idle))}/${q(g.map((r) => r.idle), .75)} | owner <0.3 s on man and no release by 2 s: ${stuck.length} (gain p50 ${q(stuck.map((r) => r.gain))} vs ${q(g.map((r) => r.gain))})`);
  console.log(`${k.padEnd(28)} doubles ${String(g.length).padStart(4)} | owner touched ${pct(g.filter((r) => r.ownerTouched).length, g.length)} helper ${pct(g.filter((r) => r.helperTouched).length, g.length)} released ${pct(g.filter((r) => r.released).length, g.length)} | owner never touched: n ${lost.length}, released ${pct(lost.filter((r) => r.released).length, lost.length)}, gain p50 ${lost.length ? med(lost.map((r) => r.gain)).toFixed(1) : '-'} vs ${med(g.map((r) => r.gain)).toFixed(1)}`);
}
console.log('blockers who touched nobody by 2.5 s:');
for (const [k, s] of [...idle].sort()) console.log(`  ${k.padEnd(18)} ${s.idle}/${s.n} (${pct(s.idle, s.n)})`);
