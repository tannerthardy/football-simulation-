/** Why freed front defenders do not reach the speed they ask for after the
 * carrier crosses (observation only). At the crossing + DT s, every DL/LB not
 * engaged and asking for 5+ yd/s: his support capacity (balance recovery
 * share of the feet), the directional speed cap from facing vs requested
 * travel, his speed now and 0.3 s earlier, time since his last engagement
 * ended, and whether another body is within contact range. Flags from the
 * environment. node --import tsx scripts/diag/stretch/dlstall.ts [--dt 0.5] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import { directionalSpeedFactor, fatigueFactor } from '../../../src/physics/kinematics.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const DT = Number(arg('--dt', '0.5'));
const grp = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : /^LB/.test(s) ? 'LB' : 'DB';
const rows: any[] = [];
const Rs = rosters();
for (const concept of list('--concepts', 'iz,oz,wz')) for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
  for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation: 'ace_12' } as LabCase, Rs);
    const sgn = sim.attackDir('O');
    let crossT = -1;
    const lastEng = new Map<any, number>(), hist = new Map<any, number[]>();
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      for (const d of sim.defense) {
        if (d.engagement) lastEng.set(d, sim.t);
        const h = hist.get(d) ?? []; h.push(d.speed); if (h.length > 7) h.shift(); hist.set(d, h);
      }
      const c = sim.carrier;
      if (!c || c.team !== 'O') continue;
      if (crossT < 0 && (c.pos.x - sim.los) * sgn > 0) crossT = sim.t;
      if (crossT >= 0 && sim.t >= crossT + DT) {
        for (const d of sim.defense) {
          const g = grp(d.slot); if (g === 'DB' || d.engagement || d.isDown(sim.t) || sim.bond?.tacklers.includes(d)) continue;
          const it = (sim as any).intents[d.idx];
          const rq = Math.hypot(it.vel.x, it.vel.y); if (rq < 5) continue;
          const sup = d.body.support;
          const cap = sup ? availability(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : 1;
          const rel = Math.atan2(Math.sin(Math.atan2(it.vel.y, it.vel.x) - d.body.facing), Math.cos(Math.atan2(it.vel.y, it.vel.x) - d.body.facing));
          const near = sim.agents.some(o => o !== d && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < o.profile.radius + d.profile.radius + .15);
          const h = hist.get(d)!;
          rows.push({ g, cap, dirf: directionalSpeedFactor(d.profile, rel), spd: d.speed, prev: h[h.length - 7] ?? h[0],
            since: lastEng.has(d) ? sim.t - lastEng.get(d)! : 9, near, sup: sup?.state ?? 'up', lean: sup ? Math.hypot(sup.lean.x, sup.lean.y) : 0 });
        }
        break;
      }
    }
  }
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : '-'; };
for (const g of ['DL', 'LB']) {
  const s = rows.filter(r => r.g === g); if (!s.length) continue;
  const gain = s.map(r => (r.spd - r.prev) / .3);
  console.log(`${g} free, asking 5+ yd/s at crossing+${DT}s: n ${s.length} | speed p50 ${q(s.map(r => r.spd))} (0.3 s earlier ${q(s.map(r => r.prev))}), gain p50 ${q(gain)} yd/s2`);
  console.log(`  support capacity p10/p50 ${q(s.map(r => r.cap), .1)}/${q(s.map(r => r.cap))} (below 0.8: ${s.filter(r => r.cap < .8).length}) | directional cap for the request p10/p50 ${q(s.map(r => r.dirf), .1)}/${q(s.map(r => r.dirf))} (below 0.8: ${s.filter(r => r.dirf < .8).length}) | touching another body ${s.filter(r => r.near).length} | support state not up ${s.filter(r => r.sup !== 'up').length}`);
  for (const [lo, hi] of [[0, .15], [.15, .5], [.5, 1], [1, 9.1]]) {
    const b = s.filter(r => r.since >= lo && r.since < hi);
    if (b.length) console.log(`  free for ${lo}-${hi === 9.1 ? 'never engaged' : hi + ' s'}: n ${b.length} speed p50 ${q(b.map(r => r.spd))} gain p50 ${q(b.map(r => (r.spd - r.prev) / .3))} dirf p50 ${q(b.map(r => r.dirf))} cap p50 ${q(b.map(r => r.cap))}`);
  }
}
