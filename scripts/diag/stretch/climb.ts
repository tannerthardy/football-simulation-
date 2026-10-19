/** Second-level accounting at the crossing (observation only, sim internals).
 * At the carrier's first tick at or past the line, every linebacker or
 * safety within R yd of him who is not in a rep as defender is a free
 * second-level man. For each, who was meant to block him (an offensive
 * RunBlocker whose plan target, climb target or combination backer is him)
 * and where that blocker is: none assigned; assigned but still in a rep on
 * someone else; assigned, free, and within 2 yd of him (fitting); or free
 * but farther (late or lost). Also the share of second-level men who are in
 * a rep. Lab cases at the resolved flags.
 * node --import tsx scripts/diag/stretch/climb.ts [--formations ace_12,i_pro_21] [--concepts iz,oz,power,counter] [--seeds 77,71001,1] [--r 4] */
import type { Agent } from '../../../src/sim/agent.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const R = Number(arg('--r', '4'));
type Tally = Record<string, number>;
const out = new Map<string, Tally>();
const bump = (k: string, f: string, n = 1) => { const t = out.get(k) ?? {}; t[f] = (t[f] ?? 0) + n; out.set(k, t); };
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'iz,oz,power,counter'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001,1').map(Number)) {
      const c: LabCase = { concept, dir, look, roster, seed, formation };
      const sim = makeSim(c, Rs);
      const dirO = sim.attackDir('O');
      let done = false;
      while (sim.phase === 'live' && sim.t < 8 && !done) {
        sim.tick();
        const car = sim.carrier;
        if (!car || car.team !== 'O' || car === sim.qb) continue;
        if ((car.pos.x - sim.los) * dirO < 0) continue;
        done = true;
        const key = `${concept}`;
        bump(key, 'runs');
        for (const d of sim.defense) {
          const second = (d.pos.x - sim.los) * dirO > 1.5 || d.slot.startsWith('LB');
          if (!second || d.isDown(sim.t)) continue;
          const dist = Math.hypot(d.pos.x - car.pos.x, d.pos.y - car.pos.y);
          if (dist > R) continue;
          const grp = d.slot.startsWith('LB') ? 'LB' : d.slot.startsWith('DE') || d.slot.startsWith('DT') || d.slot === 'NT' ? 'DL' : 'DB';
          if (grp === 'DL') continue;
          bump(key, `${grp}`);
          if (d.engagement && d.engagement.defender === d) { bump(key, `${grp} in rep`); continue; }
          const meant = sim.offense.filter((b: Agent) => {
            if (!(b.behavior instanceof RunBlocker)) return false;
            const p = (b.behavior as RunBlocker).plan;
            return p.target === d || p.climbTo === d || p.combination?.backer === d;
          });
          if (!meant.length) { bump(key, `${grp} free: none assigned`); continue; }
          const b = meant.sort((x, y) => Math.hypot(x.pos.x - d.pos.x, x.pos.y - d.pos.y) - Math.hypot(y.pos.x - d.pos.x, y.pos.y - d.pos.y))[0];
          const bd = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y);
          if (b.engagement && b.engagement.blocker === b) bump(key, `${grp} free: blocker still on ${b.engagement.defender.slot.slice(0, 2)}`);
          else if (bd <= 2) bump(key, `${grp} free: blocker within 2 yd`);
          else {
            bump(key, `${grp} free: blocker farther`);
            // The late blocker: his plan, speed, heading relative to the man, and offset (depth +: man deeper; lateral +: man play side of him).
            const p = (b.behavior as RunBlocker).plan;
            bump(key, `  late: plan ${p.kind}${p.combination ? (p.combination.released ? ' (released)' : ' (combo on)') : ''}`);
            const sp = Math.hypot(b.vel.x, b.vel.y), to = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), hd = Math.atan2(b.vel.y, b.vel.x);
            const off = sp < .5 ? 'slow (<0.5 yd/s)' : Math.abs(Math.atan2(Math.sin(hd - to), Math.cos(hd - to))) < Math.PI / 4 ? 'heading at him' : 'heading elsewhere';
            bump(key, `  late: ${off}`);
            const ps = sim.offCall.run?.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
            const lat = (d.pos.y - b.pos.y) * ps;
            bump(key, `  late: man ${lat > 1 ? 'play side of him' : lat < -1 ? 'back side of him' : 'level with him'}`);
            // Where is the late blocker: behind the backer's depth (has not climbed) or level/past?
            bump(key, `${grp} late blocker short of his depth`, (d.pos.x - b.pos.x) * dirO > 1 ? 1 : 0);
          }
        }
      }
    }
for (const [k, t] of out) {
  const runs = t.runs;
  console.log(`${k}: runs crossing ${runs}`);
  for (const [f, n] of Object.entries(t).filter(([f]) => f !== 'runs').sort()) console.log(`  ${f.padEnd(40)} ${(n / runs).toFixed(2)}/run`);
}
