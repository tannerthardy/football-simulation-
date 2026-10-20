/** Front-seven pursuit after the carrier crosses the line (observation only).
 * At the crossing + DT s, every DL/LB not engaged: support state, requested
 * speed (intent) vs achieved speed, the requested direction relative to the
 * carrier, body facing relative to the carrier, distance and whether he is
 * behind the carrier. Zone lab cases; flags from the environment.
 * node --import tsx scripts/diag/stretch/dlpursuit.ts [--dt 0.5] [--concepts iz,oz,wz] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const DT = Number(arg('--dt', '0.5'));
const grp = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : /^LB/.test(s) ? 'LB' : 'DB';
const rows: any[] = [];
const Rs = rosters();
const ang = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation } as LabCase, Rs);
      const sgn = sim.attackDir('O');
      let crossT = -1;
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        const c = sim.carrier;
        if (!c || c.team !== 'O') continue;
        if (crossT < 0 && (c.pos.x - sim.los) * sgn > 0) crossT = sim.t;
        if (crossT >= 0 && sim.t >= crossT + DT) {
          for (const d of sim.defense) {
            const g = grp(d.slot); if (g === 'DB') continue;
            const it = (sim as any).intents[d.idx];
            const tc = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
            const rq = Math.hypot(it.vel.x, it.vel.y);
            rows.push({ g, eng: !!d.engagement, down: d.isDown(sim.t), sup: d.body.support?.state ?? 'up',
              req: rq, spd: d.speed, faceVsTravel: it.facing === undefined || rq < .4 ? 0 : ang(it.facing - Math.atan2(it.vel.y, it.vel.x)), reqOff: rq > .3 ? ang(Math.atan2(it.vel.y, it.vel.x) - tc) : null, faceOff: ang(d.body.facing - tc),
              dist: Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y), behind: (c.pos.x - d.pos.x) * sgn > 0, kind: d.behavior.kind,
              fit: d.runFit?.kind ?? '-', bond: !!sim.bond?.tacklers.includes(d), id: `${concept}/${dir}/${formation}/${lk[0]}/${roster}/${seed}`, slot: d.slot, t: +sim.t.toFixed(2) });
          }
          break;
        }
      }
    }
const q = (v: number[], f = .5) => { const s = v.filter(x => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(1) : '-'; };
for (const g of ['DL', 'LB']) {
  const all = rows.filter(r => r.g === g);
  const free = all.filter(r => !r.eng && !r.bond);
  const up = free.filter(r => !r.down && r.sup === 'up');
  console.log(`${g} at crossing+${DT}s: n ${all.length}, engaged ${all.filter(r => r.eng).length}, in tackle ${all.filter(r => r.bond).length}, free ${free.length} (down/not up ${free.length - up.length})`);
  console.log(`  free & up: requested speed p25/p50/p75 ${q(up.map(r => r.req), .25)}/${q(up.map(r => r.req))}/${q(up.map(r => r.req), .75)} | achieved ${q(up.map(r => r.spd), .25)}/${q(up.map(r => r.spd))}/${q(up.map(r => r.spd), .75)} | request off carrier bearing p50 ${q(up.map(r => r.reqOff))} deg | facing off carrier bearing p50 ${q(up.map(r => r.faceOff))} deg | dist p50 ${q(up.map(r => r.dist))} | carrier past him ${(100 * up.filter(r => r.behind).length / Math.max(1, up.length)).toFixed(0)}%`);
  const kinds: Record<string, number> = {};
  for (const r of up) kinds[`${r.kind}/${r.fit}`] = (kinds[`${r.kind}/${r.fit}`] ?? 0) + 1;
  console.log(`  behaviors: ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const fixed = up.filter(r => r.faceVsTravel > 45);
  console.log(`  free & up requesting a facing > 45 deg off their requested travel: ${fixed.length} (${(100 * fixed.length / Math.max(1, up.length)).toFixed(0)}%) | achieved p50 ${q(fixed.map(r => r.spd))} vs others ${q(up.filter(r => r.faceVsTravel <= 45).map(r => r.spd))} | ${Object.entries(fixed.reduce((m: any, r) => (m[r.kind + '/' + r.fit] = (m[r.kind + '/' + r.fit] ?? 0) + 1, m), {})).map(([k, v]) => k + ' ' + v).join(', ')}`);
  const slow = up.filter(r => r.req < 3);
  console.log(`  free & up requesting < 3 yd/s: ${slow.length} | facing off p50 ${q(slow.map(r => r.faceOff))} dist p50 ${q(slow.map(r => r.dist))}`);
  const fast = up.filter(r => r.req >= 5);
  console.log(`  free & up requesting >= 5 yd/s: ${fast.length} | achieved p50 ${q(fast.map(r => r.spd))} facing off p50 ${q(fast.map(r => r.faceOff))}`);
  if (process.argv.includes('--examples')) for (const r of fast.filter(r => r.spd < 2.5).slice(0, 6)) console.log(`    e.g. ${r.id} ${r.slot} t ${r.t} req ${r.req.toFixed(1)} spd ${r.spd.toFixed(1)} faceOff ${r.faceOff.toFixed(0)} dist ${r.dist.toFixed(1)}`);
}
