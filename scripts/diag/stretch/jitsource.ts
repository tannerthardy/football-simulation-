/** Where does each achieved wobble/pulse come from? (observation only)
 * At 10 Hz like tracking, every achieved event (a left/right turn reversal,
 * or a speed extremum swinging 0.5 yd/s) is attributed to the first velocity
 * layer that shows a matching event within 0.2 s before it: the behavior's
 * request, the request after contact controllers, after teammate spacing; or
 * none (steady requests: the body/World). Also whether the player was in
 * physical contact (last World step) or engaged at that moment.
 * node --import tsx scripts/diag/stretch/jitsource.ts [--formations ..] [--concepts ..] [--seeds ..] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type V = { x: number; y: number };
const GROUP: Record<string, string> = { QB: 'O QB', RB: 'O RB', F: 'O FB', Y: 'O TE', H: 'O TE', X: 'O WR', Z: 'O WR', LT: 'O OL', LG: 'O OL', C: 'O OL', RG: 'O OL', RT: 'O OL' };
const groupOf = (team: string, slot: string) => team === 'O' ? GROUP[slot] ?? 'O other'
  : slot.startsWith('DE') || slot.startsWith('DT') || slot === 'NT' ? 'D DL' : slot.startsWith('LB') ? 'D LB' : 'D DB';
// Event indices of a series (10 Hz samples).
const wobbleEvents = (v: V[]) => {
  const out: number[] = []; let sign = 0;
  for (let k = 1; k < v.length; k++) {
    const a = v[k - 1], b = v[k];
    if (Math.hypot(a.x, a.y) < 2 || Math.hypot(b.x, b.y) < 2) continue;
    const d = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180 / Math.PI;
    const sg = d > 5 ? 1 : d < -5 ? -1 : 0;
    if (sg && sign && sg !== sign) out.push(k);
    if (sg) sign = sg;
  }
  return out;
};
const pulseEvents = (s: number[]) => {
  const out: number[] = []; let last = s[0], dir = 0;
  s.forEach((x, k) => {
    if (dir >= 0 && x < last - .5) { if (dir > 0) out.push(k); dir = -1; last = x; }
    else if (dir <= 0 && x > last + .5) { if (dir < 0) out.push(k); dir = 1; last = x; }
    else if ((dir >= 0 && x > last) || (dir <= 0 && x < last)) last = x;
  });
  return out;
};
type Row = { sec: number; w: Record<string, number>; p: Record<string, number>; wContact: number; pContact: number };
const rows = new Map<string, Row>();
const SRC = ['request', 'contact layer', 'spacing', 'body'];
const Rs = rosters();
for (const formation of list('--formations', 'i_pro_21,ace_12')) for (const concept of list('--concepts', 'power,counter,duo,trap'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const s = sim as unknown as { cmds: { vel: V }[]; intents: { vel: V }[]; lastStep?: { contacts: { i: number; j: number }[] } };
      const pre = new Map<number, V>();
      s.intents = new Proxy(s.intents, { set(target, prop, value) {
        if ((new Error().stack ?? '').includes('spaceTeammates')) pre.set(Number(prop), target[Number(prop)]?.vel ?? { x: 0, y: 0 });
        (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true;
      } });
      const L = sim.agents.map(() => ({ req: [] as V[], con: [] as V[], spa: [] as V[], ach: [] as V[], touch: [] as boolean[] }));
      let tick = 0;
      while (sim.phase === 'live' && sim.t < 3.5) {
        pre.clear(); sim.tick();
        if (tick++ % 2) continue;
        const touching = new Set<number>();
        for (const c of s.lastStep?.contacts ?? []) { touching.add(c.i); touching.add(c.j); }
        for (const a of sim.agents) {
          if (a === sim.carrier) { L[a.idx].req.push({ x: NaN, y: NaN }); continue; }
          const f = s.intents[a.idx].vel;
          L[a.idx].req.push({ ...s.cmds[a.idx].vel }); L[a.idx].con.push({ ...(pre.get(a.idx) ?? f) }); L[a.idx].spa.push({ ...f });
          L[a.idx].ach.push({ ...a.vel }); L[a.idx].touch.push(touching.has(a.idx) || !!a.engagement);
        }
      }
      for (const a of sim.agents) {
        const l = L[a.idx];
        if (l.ach.length < 8 || l.req.some(v => Number.isNaN(v.x))) continue;
        const key = groupOf(a.team, a.slot);
        const row = rows.get(key) ?? { sec: 0, w: {}, p: {}, wContact: 0, pContact: 0 }; rows.set(key, row);
        row.sec += (l.ach.length - 1) * .1;
        const layers = [l.req, l.con, l.spa];
        const near = (events: number[], k: number) => events.some(e => e <= k && e >= k - 2);
        const wl = layers.map(wobbleEvents), pl = layers.map(vs => pulseEvents(vs.map(v => Math.hypot(v.x, v.y))));
        for (const k of wobbleEvents(l.ach)) {
          const src = SRC[[0, 1, 2].find(i => near(wl[i], k)) ?? 3];
          row.w[src] = (row.w[src] ?? 0) + 1; if (l.touch[k]) row.wContact++;
        }
        for (const k of pulseEvents(l.ach.map(v => Math.hypot(v.x, v.y)))) {
          const src = SRC[[0, 1, 2].find(i => near(pl[i], k)) ?? 3];
          row.p[src] = (row.p[src] ?? 0) + 1; if (l.touch[k]) row.pContact++;
        }
      }
    }
const fmt = (r: Record<string, number>, sec: number) => SRC.map(k => `${k} ${((r[k] ?? 0) / sec).toFixed(2)}`).join(', ');
console.log('achieved events per second, by first layer showing the same event within 0.2 s before it');
for (const [k, r] of [...rows].sort()) {
  const W = Object.values(r.w).reduce((a, b) => a + b, 0), P = Object.values(r.p).reduce((a, b) => a + b, 0);
  console.log(`${k.padEnd(6)} wobble ${(W / r.sec).toFixed(2)} [${fmt(r.w, r.sec)}] touching ${(100 * r.wContact / Math.max(1, W)).toFixed(0)}%`);
  console.log(`${''.padEnd(6)} pulses ${(P / r.sec).toFixed(2)} [${fmt(r.p, r.sec)}] touching ${(100 * r.pContact / Math.max(1, P)).toFixed(0)}%`);
}
