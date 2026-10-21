/** The third level on gap runs: when the carrier crosses 8 yd past the line,
 * where is every linebacker and DB, is he blocked, and is he closing? Reruns
 * lab cases by id (out/ctr40.json: {big: [...], mid: [...]}) under the
 * ambient profile. Observation only.
 * node --import tsx scripts/diag/gap/third-level.ts out/ctr40.json */
import { readFileSync } from 'node:fs';
import { makeSim, rosters } from '../zone-lab/lab.js';

const sets = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Record<string, string[]>;
const R = rosters();
const q = (v: number[], f = .5) => v.length ? v.slice().sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
for (const [name, ids] of Object.entries(sets)) {
  const st: Record<string, number[]> = {};
  const add = (k: string, v: number) => (st[k] ??= []).push(v);
  let n = 0;
  for (const id of ids) {
    const [concept, dir, formation, look, roster, seed] = id.split('/');
    const sim = makeSim({ concept, dir: dir as 'strong', formation, look, roster, seed: Number(seed) }, R);
    const ad = sim.attackDir('O');
    let done = false;
    while (sim.phase === 'live' && sim.t < 12 && !done) {
      sim.tick();
      const c = sim.carrier;
      if (!c || c === sim.qb || (c.pos.x - sim.los) * ad < 8) continue;
      done = true; n++;
      add('t cross 8 yd', sim.t);
      for (const d of sim.defense) {
        if (/^(DE|DT|NT)/.test(d.slot)) continue;
        const dx = (d.pos.x - c.pos.x) * ad, dy = d.pos.y - c.pos.y, dist = Math.hypot(dx, dy);
        const close = -((d.vel.x - c.vel.x) * (d.pos.x - c.pos.x) + (d.vel.y - c.vel.y) * (d.pos.y - c.pos.y)) / Math.max(dist, 1e-6);
        const role = d.slot.replace(/_[SW]$/, '');
        const state = d.engagement ? 'blocked' : d.isDown(sim.t) ? 'down' : dx < -1 ? 'behind' : 'ahead';
        add(`${role} ${state}`, dist);
        if (state === 'ahead') add(`${role} ahead closing yd/s`, close);
      }
      const free = sim.defense.filter((d) => !d.engagement && !d.isDown(sim.t) && (d.pos.x - c.pos.x) * ad > -1);
      const nearest = Math.min(...free.map((d) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y)));
      add('nearest unblocked not behind', nearest);
      add('unblocked not behind count', free.length);
    }
  }
  console.log(`== ${name} n ${n}`);
  for (const k of Object.keys(st).sort()) {
    const v = st[k];
    console.log(`  ${k.padEnd(30)} n ${String(v.length).padStart(4)} p25/50/75 ${q(v, .25).toFixed(2)} / ${q(v).toFixed(2)} / ${q(v, .75).toFixed(2)}`);
  }
}
