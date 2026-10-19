/** While a carrier is held (sim.bond), what does he ask his feet for?
 * Observation only: per bond, the requested heading relative to straight
 * upfield and its speed at the first held tick, the carrier's depth at
 * contact, and yards gained from first hold to the end of the play.
 * node --import tsx scripts/diag/stretch/bondheading.ts [--concepts iz,oz,wz] [--seeds 77,71001,1]
 */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const R = rosters();
const rows: { ang: number; speed: number; depth: number; after: number; concept: string }[] = [];
for (const concept of arg('--concepts', 'iz,oz,wz').split(',')) for (const dir of ['strong', 'weak'] as const)
  for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of arg('--seeds', '77,71001,1').split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    const up = sim.attackDir('O');
    let first: { ang: number; speed: number; depth: number; x: number } | null = null;
    while (sim.phase === 'live' && sim.t < 20) {
      sim.tick();
      const c = sim.carrier;
      if (!first && sim.bond && c && c.team === 'O' && sim.handoffAt >= 0) {
        const v = sim.intents[c.idx]?.vel ?? { x: 0, y: 0 };
        first = { ang: Math.abs(Math.atan2(v.y, v.x * up)) * 180 / Math.PI, speed: Math.hypot(v.x, v.y),
          depth: (c.pos.x - sim.los) * up, x: c.pos.x };
      }
    }
    if (!first) continue;
    const gain = sim.buildResult().offenseYards;
    rows.push({ ...first, after: gain - first.depth, concept });
  }
const q = (v: number[], f: number) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
console.log(`bonds ${rows.length}`);
for (const band of [[-9, -1], [-1, 0], [0, 1], [1, 3], [3, 99]]) {
  const s = rows.filter(r => r.depth >= band[0] && r.depth < band[1]);
  if (!s.length) continue;
  const fwd = s.filter(r => r.ang < 30), side = s.filter(r => r.ang >= 30);
  console.log(`  held at [${band[0]},${band[1]}) n ${s.length} | requested heading off upfield p25/50/75 ${q(s.map(r => r.ang), .25)}/${q(s.map(r => r.ang), .5)}/${q(s.map(r => r.ang), .75)} deg, speed p50 ${q(s.map(r => r.speed), .5)} | yards after first hold p50: heading <30 deg ${q(fwd.map(r => r.after), .5)} (n ${fwd.length}), >=30 deg ${q(side.map(r => r.after), .5)} (n ${side.length})`);
}
