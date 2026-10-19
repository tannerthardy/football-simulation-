/** Where does the jitter come from? (observation only, sim internals). For
 * every player by group, from the snap to min(end, 3.5 s), sampled at 10 Hz
 * like tracking: speed oscillations per second (swings of at least 0.5 yd/s
 * between extrema) and left/right turn reversals per second (turns of at
 * least 5 degrees per 0.1 s while faster than 2 yd/s), in each layer of the
 * velocity: the behavior's request, after contact controllers, after
 * teammate spacing, and the achieved body velocity. The same counting as
 * smooth.py, so the achieved column compares with NFL tracking.
 * node --import tsx scripts/diag/stretch/jitter.ts [--formations ..] [--concepts ..] [--seeds ..] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type V = { x: number; y: number };
const LAYERS = ['request', 'contact', 'spacing', 'achieved'] as const;
const GROUP: Record<string, string> = { QB: 'O QB', RB: 'O RB', F: 'O FB', Y: 'O TE', H: 'O TE', X: 'O WR', Z: 'O WR', LT: 'O OL', LG: 'O OL', C: 'O OL', RG: 'O OL', RT: 'O OL' };
const groupOf = (team: string, slot: string) => team === 'O' ? GROUP[slot] ?? 'O other'
  : slot.startsWith('DE') || slot.startsWith('DT') || slot === 'NT' ? 'D DL' : slot.startsWith('LB') ? 'D LB' : 'D DB';
const pulses = (s: number[]) => {
  let ext = 0, last = s[0], dir = 0;
  for (const x of s.slice(1)) {
    if (dir >= 0 && x < last - .5) { ext += dir > 0 ? 1 : 0; dir = -1; last = x; }
    else if (dir <= 0 && x > last + .5) { ext += dir < 0 ? 1 : 0; dir = 1; last = x; }
    else if ((dir >= 0 && x > last) || (dir <= 0 && x < last)) last = x;
  }
  return ext;
};
const wobble = (v: V[]) => {
  let n = 0, sign = 0;
  for (let k = 1; k < v.length; k++) {
    const a = v[k - 1], b = v[k];
    if (Math.hypot(a.x, a.y) < 2 || Math.hypot(b.x, b.y) < 2) continue;
    const d = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180 / Math.PI;
    const sg = d > 5 ? 1 : d < -5 ? -1 : 0;
    if (sg && sign && sg !== sign) n++;
    if (sg) sign = sg;
  }
  return n;
};
const acc = new Map<string, { sec: number; p: number[]; w: number[] }>();
const Rs = rosters();
for (const formation of list('--formations', 'i_pro_21,ace_12')) for (const concept of list('--concepts', 'power,counter,duo,trap'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const s = sim as unknown as { cmds: { vel: V }[]; intents: { vel: V }[] };
      const pre = new Map<number, V>();
      s.intents = new Proxy(s.intents, { set(target, prop, value) {
        if ((new Error().stack ?? '').includes('spaceTeammates')) pre.set(Number(prop), target[Number(prop)]?.vel ?? { x: 0, y: 0 });
        (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true;
      } });
      const series = sim.agents.map(() => LAYERS.map(() => [] as V[]));
      let tick = 0;
      while (sim.phase === 'live' && sim.t < 3.5) {
        pre.clear();
        sim.tick();
        if (tick++ % 2) continue; // 10 Hz, as tracked
        for (const a of sim.agents) {
          if (a === sim.carrier) continue;
          const L = series[a.idx], final = s.intents[a.idx].vel;
          L[0].push({ ...s.cmds[a.idx].vel }); L[1].push({ ...(pre.get(a.idx) ?? final) }); L[2].push({ ...final }); L[3].push({ ...a.vel });
        }
      }
      for (const a of sim.agents) {
        const L = series[a.idx], n = L[0].length;
        if (n < 8) continue;
        const key = groupOf(a.team, a.slot);
        const row = acc.get(key) ?? { sec: 0, p: [0, 0, 0, 0], w: [0, 0, 0, 0] }; acc.set(key, row);
        row.sec += (n - 1) * .1;
        L.forEach((vs, i) => { row.p[i] += pulses(vs.map(v => Math.hypot(v.x, v.y))); row.w[i] += wobble(vs); });
      }
    }
console.log('per second: speed oscillations / turn reversals, at each layer: request -> after contact -> after spacing -> achieved');
for (const [k, r] of [...acc].sort()) console.log(`${k.padEnd(8)} pulses ${r.p.map(x => (x / r.sec).toFixed(2)).join(' -> ')} | wobble ${r.w.map(x => (x / r.sec).toFixed(2)).join(' -> ')}`);
