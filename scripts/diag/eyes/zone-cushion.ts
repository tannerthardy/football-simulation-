// Zone cushion over a crosser passing through a defender's lane, sim side (pair of align/nfl_zone_cushion.py, same
// definition). Zone calls; shallow / shallow_high / mesh_under / cross runners; ball held by the QB. The pass: the
// crosser's lateral position crosses an underneath defender's (not DL; 1.5-12 yd off the line) while the crosser runs
// more across than up (|vy| > |vx|, 2+ yd/s). At that tick: distance, over, the defender's speed along the crosser's
// lateral direction (v_with) and downfield; distance 0.5 s before and after, closest within +-0.5 s; nearest or not;
// his behaviour. By seat class and the crosser's depth class.
//   npx tsx scripts/diag/eyes/zone-cushion.ts [--seed 101] [--games 16] > out.txt
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16'));
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const CROSS = /:(shallow|shallow_high|mesh_under|cross)$/;
const DL = ['DE_S', 'DE_W', 'DT_S', 'DT_W'];
const role = (d: any): string => {
  const b = d.behavior; const n = b?.constructor?.name ?? '?';
  if (n === 'CoverageDefender') return `${String(b.job).split(':')[0]}/${b.sub?.constructor?.name}`;
  return n;
};
const seat = (s: string) => s.startsWith('LB') ? 'LB' : s === 'NB' || s.startsWith('DB') ? 'NB' : s === 'SS' || s === 'FS' ? 'S' : s.startsWith('CB') ? 'CB' : s;
const rows: any[] = [];
for (let game = 0; game < games; game++) {
  simulateGame(leagueSample(home, seed + game), leagueSample(away, seed + game), { seed: seed + game, hooks: {
    playResult: (sim: any, kind: string) => {
      if (kind !== 'scrimmage' || sim.offCall.kind !== 'pass' || sim.defCall.coverage.man) return undefined;
      const snaps: any[] = [];
      const t0 = sim.tick.bind(sim);
      sim.tick = () => {
        t0();
        if (sim.ball.kind !== 'held' || sim.ball.carrier !== sim.qb || sim.t > 4.5) return;
        const dir = sim.attackDir('O');
        const P = new Map<any, any>();
        for (const a of [...sim.offense, ...sim.defense]) P.set(a, { x: a.pos.x, y: a.pos.y, vx: a.vel.x * dir, vy: a.vel.y, depth: (a.pos.x - sim.los) * dir, role: sim.defense.includes(a) ? role(a) : '' });
        snaps.push({ t: sim.t, P });
      };
      const out = sim.run();
      const crossers = sim.offense.filter((o: any) => CROSS.test(String(routeOfAgent.get(o) ?? '')));
      const defs = sim.defense.filter((d: any) => !DL.includes(d.slot));
      const dt = snaps.length > 1 ? snaps[1].t - snaps[0].t : 0.05; const h = Math.round(0.5 / dt);
      for (const c of crossers) {
        const seen = new Set<any>();
        for (let i = 1; i < snaps.length; i++) {
          const A = snaps[i - 1].P, B = snaps[i].P, r = B.get(c);
          if (snaps[i].t < 0.5 || Math.abs(r.vy) <= Math.abs(r.vx) || Math.abs(r.vy) < 2) continue;
          for (const d of defs) {
            if (seen.has(d)) continue;
            const q = B.get(d);
            if (q.depth < 1.5 || q.depth > 12) continue;
            const s0 = A.get(c).y - A.get(d).y, s1 = r.y - q.y;
            if (s0 === 0 || (s0 > 0) === (s1 > 0)) continue;
            seen.add(d);
            const dist = (j: number) => { const S = snaps[j]; if (!S) return null; const a = S.P.get(c), b = S.P.get(d); return Math.hypot(a.x - b.x, a.y - b.y); };
            const win: number[] = []; for (let j = i - h; j <= i + h; j++) { const x = dist(j); if (x != null) win.push(x); }
            let nd = Infinity, nearest: any = null;
            for (const o of defs) { const b = B.get(o); const x = Math.hypot(r.x - b.x, r.y - b.y); if (x < nd) { nd = x; nearest = o; } }
            const side = r.vy > 0 ? 1 : -1;
            rows.push({ seat: seat(d.slot), role: q.role, rdepth: r.depth, dist: dist(i), over: q.depth - r.depth, vwith: q.vy * side, vdown: q.vx,
              pre: dist(i - h), post: dist(i + h), close: Math.min(...win), near: nearest === d, t: snaps[i].t });
          }
        }
      }
      return out;
    } } as any });
}
const qn = (v: any[]) => { v = v.filter((x) => x != null).sort((a, b) => a - b); return v.length < 5 ? '-' : v[Math.floor(v.length / 2)].toFixed(2); };
const line = (R: any[], tag: string) => console.log(`${tag}: n ${R.length} | dist -0.5/0/+0.5 ${qn(R.map(r => r.pre))}/${qn(R.map(r => r.dist))}/${qn(R.map(r => r.post))} closest ${qn(R.map(r => r.close))}`
  + ` | over ${qn(R.map(r => r.over))} v_with ${qn(R.map(r => r.vwith))} v_down ${qn(R.map(r => r.vdown))} | nearest ${Math.round(100 * R.filter(r => r.near).length / Math.max(1, R.length))}% t ${qn(R.map(r => r.t))}`);
console.log(`== zone-cushion CUT_WALL=${process.env.CUT_WALL ?? 0} CROSS_OVER=${process.env.CROSS_OVER ?? 0} CROSS_FLAT=${process.env.CROSS_FLAT ?? 0} seed ${seed} games ${games}`);
for (const [cls, lo, hi] of [['all', -9, 99], ['shallow <4', -9, 4], ['mid 4-8', 4, 8], ['deep 8+', 8, 99]] as const) {
  const C = rows.filter(r => r.rdepth >= lo && r.rdepth < hi);
  line(C, `sim zone, crosser ${cls}`);
  for (const s of ['LB', 'NB', 'S', 'CB']) { const R = C.filter(r => r.seat === s); if (R.length >= 15) line(R, `  ${s}`); }
  if (cls === 'mid 4-8') { const tc: Record<string, number> = {}; for (const r of C) tc[r.role] = (tc[r.role] ?? 0) + 1;
    for (const [k, v] of Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 6)) { const R = C.filter(r => r.role === k); line(R, `    role ${k}`); void v; } }
}
