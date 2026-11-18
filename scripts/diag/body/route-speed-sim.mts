/** Receivers on a called route in the engine's own games: position, alignment (pressed by a defender within 2 yd ahead and 1.5 yd across at the snap), and speed every 0.1 s from the snap to the throw
 * (backward difference of position, the provider's definition of s). The same operator as nfl_route_speed.py. Read-only tap on PlaySim.prototype.tick.
 *   node --import tsx scripts/diag/body/route-speed-sim.mts [--seed 101] [--games 8] [--out out/bodymeasure/sim-routes.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ownRoutes } from '../../../src/sim/ball-estimate.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8')), out = arg('--out', 'out/bodymeasure/sim-routes.json');
mkdirSync(dirname(out), { recursive: true });
type Rec = { sim: any; last: number; pos: Map<number, number[][]>; route: Map<number, string>; snap: number[][] | null };
const recs = new Map<object, Rec>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live') return;
  let rec = recs.get(this); if (!rec) { rec = { sim: this, last: -1, pos: new Map(), route: new Map(), snap: null }; recs.set(this, rec); }
  const k = Math.floor(this.t * 10 + 1e-6); if (k === rec.last || k < 0) return; rec.last = k;
  for (const a of this.agents) {
    const L = rec.pos.get(a.idx) ?? []; L[k] = [a.pos.x, a.pos.y]; rec.pos.set(a.idx, L);
    if (a.team === 'O' && !rec.route.has(a.idx)) { const r = ownRoutes.get(a); if (r) rec.route.set(a.idx, String(r.routeId ?? '')); }
  }
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const rows: any[] = [];
for (let g = 0; g < games; g++) {
  recs.clear();
  simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false, handContact: 'center' } as never);
  for (const r of recs.values()) {
    const s = r.sim; if (s.offCall.kind !== 'pass' || s.offCall.pass?.fake) continue;
    const thr = (s.events as any[]).find((e) => e.type === 'throw' || e.type === 'throwaway' || e.type === 'sack' || e.type === 'scramble')?.t; if (thr === undefined) continue;
    const kt = Math.floor(thr * 10 + 1e-6); const dir = s.attackDir('O');
    for (const a of s.agents) {
      if (a.team !== 'O') continue; const route = r.route.get(a.idx); if (!route) continue;
      const P = r.pos.get(a.idx)!; if (!P[0]) continue;
      const press = s.agents.some((d: any) => d.team === 'D' && (r.pos.get(d.idx)?.[0] ?? null) && ((r.pos.get(d.idx)![0][0] - P[0][0]) * dir > 0) && Math.hypot(r.pos.get(d.idx)![0][0] - P[0][0], r.pos.get(d.idx)![0][1] - P[0][1]) < 2.0 && Math.abs(r.pos.get(d.idx)![0][1] - P[0][1]) < 1.5);
      const sp: number[] = [0]; for (let k = 1; k <= Math.min(kt, 60); k++) sp.push(P[k] && P[k - 1] ? Math.round(Math.hypot(P[k][0] - P[k - 1][0], P[k][1] - P[k - 1][1]) * 100) / 10 : NaN);
      rows.push({ g: seed + g, pos: a.player.position, slot: a.slot, route, press, kt, vmax: Math.round(a.profile.vmax * 100) / 100, s: sp });
    }
  }
  console.error(`game ${g + 1}/${games}: ${rows.length} receiver routes`);
}
writeFileSync(out, JSON.stringify(rows)); console.error(`${rows.length} rows -> ${out}`);
