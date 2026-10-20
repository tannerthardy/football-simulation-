/** When does each defender first recognize run, and what is he doing before
 * it? (observation only). Zone lab cases: the time of each defender's 'read'
 * event (and its read), his lateral displacement toward the play side and his
 * depth change at 0.5 and 1.0 s, by group. Play side +; depth + = toward his
 * own goal (away from the line).
 * node --import tsx scripts/diag/stretch/readtime.ts [--concepts oz,wz] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const q = (v: number[], f: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))] : NaN; };
const groupOf = (slot: string) => /^(DE|DT|NT)/.test(slot) ? 'DL' : /^LB/.test(slot) ? 'LB' : 'DB';
const acc = new Map<string, Record<string, number[]>>();
const push = (g: string, k: string, v: number) => { const r = acc.get(g) ?? {}; acc.set(g, r); (r[k] ??= []).push(v); };
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign, up = sim.attackDir('O');
      const home = new Map(sim.defense.map(d => [d, { ...d.pos }]));
      const at: Record<string, Map<object, { x: number; y: number }>> = { '0.5': new Map(), '1.0': new Map() };
      while (sim.phase === 'live' && sim.t < 1.05) {
        sim.tick();
        for (const k of ['0.5', '1.0']) if (Math.abs(sim.t - Number(k)) < 1e-6) for (const d of sim.defense) at[k].set(d, { ...d.pos });
      }
      const reads = new Map<number, { t: number; note: string }>();
      for (const ev of (sim as any).events ?? []) if (ev.type === 'read' && !reads.has(ev.a)) reads.set(ev.a, { t: ev.t, note: String(ev.note ?? '') });
      for (const d of sim.defense) {
        const g = groupOf(d.slot), h = home.get(d)!;
        const r = reads.get(d.idx);
        if (r) { push(g, 'read t', r.t); push(g, r.note.startsWith('run') ? 'reads run' : 'reads pass', 1); } else push(g, 'no read by 1 s', 1);
        for (const k of ['0.5', '1.0']) { const p = at[k].get(d); if (!p) continue;
          push(g, `lat ${k}`, (p.y - h.y) * ps); push(g, `depth ${k}`, (p.x - h.x) * up); }
      }
    }
console.log('group  read t p25/p50/p75 | first read run / pass / none | lat 0.5 / 1.0 (p50) | depth change 0.5 / 1.0 (p50)');
for (const [g, r] of [...acc].sort()) {
  const n = (k: string) => (r[k] ?? []).length;
  console.log(`${g.padEnd(5)}  ${q(r['read t'] ?? [], .25).toFixed(2)}/${q(r['read t'] ?? [], .5).toFixed(2)}/${q(r['read t'] ?? [], .75).toFixed(2)} | ${n('reads run')} / ${n('reads pass')} / ${n('no read by 1 s')} | ${q(r['lat 0.5'], .5).toFixed(2)} / ${q(r['lat 1.0'], .5).toFixed(2)} | ${q(r['depth 0.5'], .5).toFixed(2)} / ${q(r['depth 1.0'], .5).toFixed(2)}`);
}
