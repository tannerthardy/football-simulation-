/** Why do requests reverse? (observation only, sim internals). For each
 * left/right reversal of a player's request (behavior command, 10 Hz, as in
 * jitter.ts): did its movement objective's point move more than 0.75 yd over
 * the preceding 0.2 s (target selection), or stay put (steering law around a
 * steady target)? Also the distance to that target at the reversal, and the
 * behavior kind. Requests without objective metadata are counted apart.
 * node --import tsx scripts/diag/stretch/reqsource.ts [--formations ..] [--concepts ..] [--seeds ..] */
import { movementObjective } from '../../../src/sim/movement-objective.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type V = { x: number; y: number };
const GROUP: Record<string, string> = { QB: 'O QB', RB: 'O RB', F: 'O FB', Y: 'O TE', H: 'O TE', X: 'O WR', Z: 'O WR', LT: 'O OL', LG: 'O OL', C: 'O OL', RG: 'O OL', RT: 'O OL' };
const groupOf = (team: string, slot: string) => team === 'O' ? GROUP[slot] ?? 'O other'
  : slot.startsWith('DE') || slot.startsWith('DT') || slot === 'NT' ? 'D DL' : slot.startsWith('LB') ? 'D LB' : 'D DB';
type Row = { sec: number; cat: Record<string, number>; kinds: Record<string, number>; dist: number[] };
const rows = new Map<string, Row>();
const Rs = rosters();
for (const formation of list('--formations', 'i_pro_21,ace_12')) for (const concept of list('--concepts', 'power,counter,duo,trap'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const s = sim as unknown as { cmds: ({ vel: V } & object)[] };
      const S = sim.agents.map(() => [] as { v: V; p: V | null; me: V; kind: string }[]);
      let tick = 0;
      while (sim.phase === 'live' && sim.t < 3.5) {
        sim.tick();
        if (tick++ % 2) continue;
        for (const a of sim.agents) {
          const c = s.cmds[a.idx], o = movementObjective(c as never);
          S[a.idx].push({ v: { ...c.vel }, p: o ? { ...o.point } : null, me: { ...a.pos }, kind: a === sim.carrier ? 'carrier' : a.engagement ? 'engaged' : a.behavior.kind });
        }
      }
      for (const a of sim.agents) {
        const ser = S[a.idx];
        if (ser.length < 8) continue;
        const key = groupOf(a.team, a.slot);
        const row = rows.get(key) ?? { sec: 0, cat: {}, kinds: {}, dist: [] }; rows.set(key, row);
        row.sec += (ser.length - 1) * .1;
        let sign = 0;
        for (let k = 1; k < ser.length; k++) {
          const p = ser[k - 1].v, q = ser[k].v;
          if (ser[k].kind === 'carrier' || Math.hypot(p.x, p.y) < 2 || Math.hypot(q.x, q.y) < 2) continue;
          const d = Math.atan2(p.x * q.y - p.y * q.x, p.x * q.x + p.y * q.y) * 180 / Math.PI;
          const sg = d > 5 ? 1 : d < -5 ? -1 : 0;
          if (sg && sign && sg !== sign) {
            const now = ser[k], before = ser[Math.max(0, k - 2)];
            let cat: string;
            if (!now.p || !before.p) cat = 'no objective';
            else {
              const moved = Math.hypot(now.p.x - before.p.x, now.p.y - before.p.y);
              const dist = Math.hypot(now.p.x - now.me.x, now.p.y - now.me.y);
              row.dist.push(dist);
              cat = moved > .75 ? 'target moved' : dist < 1.5 ? 'steady target, arriving' : 'steady target, en route';
            }
            row.cat[cat] = (row.cat[cat] ?? 0) + 1;
            row.kinds[now.kind] = (row.kinds[now.kind] ?? 0) + 1;
          }
          if (sg) sign = sg;
        }
      }
    }
console.log('request reversals per second, by cause; behavior kinds; median distance to target');
for (const [k, r] of [...rows].sort()) {
  const n = Object.values(r.cat).reduce((a, b) => a + b, 0);
  const ds = [...r.dist].sort((a, b) => a - b);
  console.log(`${k.padEnd(6)} ${(n / r.sec).toFixed(2)}/s [${Object.entries(r.cat).sort((a, b) => b[1] - a[1]).map(([c, x]) => `${c} ${(x / r.sec).toFixed(2)}`).join(', ')}] kinds ${Object.entries(r.kinds).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, x]) => `${c} ${x}`).join(', ')} | dist p50 ${ds.length ? ds[ds.length >> 1].toFixed(2) : '-'}`);
}
