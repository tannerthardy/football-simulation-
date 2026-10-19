/** Front-seven state after the carrier crosses the line (observation only).
 * At crossing + LAG s, every DL/LB is classed: down (support not up),
 * engaged (in a block rep), bonded (in the tackle bond), or free. Free ones
 * report behavior kind, requested and actual speed, and the requested
 * velocity's component toward the carrier. Engaged ones report whether the
 * runner is past them and their requested speed.
 * node --import tsx scripts/diag/stretch/frontstate.ts [--concepts iz,oz] [--seeds 77,71001,1] [--lag .5] [--formation ace_12] */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const LAG = +arg('--lag', '.5'), R = rosters();
const q = (v: number[], f = .5) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
type Row = { g: string; cls: string; kind: string; req: number; act: number; toward: number; actToward: number; past: number; dist: number };
const rows: Row[] = [];
let plays = 0;
for (const concept of arg('--concepts', 'iz,oz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    const up = sim.attackDir('O');
    let cross = -1;
    while (sim.phase === 'live' && sim.t < 12) {
      sim.tick();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || sim.handoffAt < 0) continue;
      if (cross < 0 && (c.pos.x - sim.los) * up > 0) cross = sim.t;
      if (cross >= 0 && sim.t >= cross + LAG - 1e-9) {
        plays++;
        for (const d of sim.defense) {
          const g = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot) ? 'DL' : d.slot.startsWith('LB') ? 'LB' : null;
          if (!g) continue;
          const eng = sim.engagements.find(e => e.defender === d);
          const cls = d.body.support?.state !== 'up' ? 'down' : sim.bond?.tacklers.includes(d) ? 'bonded' : eng ? 'engaged' : 'free';
          const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
          const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
          rows.push({ g, cls, kind: d.behavior.kind, req: Math.hypot(iv.x, iv.y), act: Math.hypot(d.vel.x, d.vel.y),
            toward: (iv.x * dx + iv.y * dy) / dd, actToward: (d.vel.x * dx + d.vel.y * dy) / dd, past: (c.pos.x - d.pos.x) * up, dist: dd });
        }
        break;
      }
    }
  }
console.log(`plays ${plays}, crossing + ${LAG} s`);
for (const g of ['DL', 'LB']) {
  const s = rows.filter(r => r.g === g);
  const cls = ['down', 'engaged', 'bonded', 'free'].map(c => `${c} ${(100 * s.filter(r => r.cls === c).length / s.length).toFixed(0)}%`).join(' ');
  console.log(`${g} n ${s.length}: ${cls}`);
  for (const c of ['engaged', 'free']) {
    const t = s.filter(r => r.cls === c);
    if (!t.length) continue;
    const kinds = Object.entries(t.reduce((m, r) => (m[r.kind] = (m[r.kind] ?? 0) + 1, m), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ');
    console.log(`  ${c}: requested speed p50 ${q(t.map(r => r.req))} actual ${q(t.map(r => r.act))} | requested toward carrier p50 ${q(t.map(r => r.toward))} actual ${q(t.map(r => r.actToward))} | runner past him p50 ${q(t.map(r => r.past))} yd, distance ${q(t.map(r => r.dist))} | ${kinds}`);
  }
}
