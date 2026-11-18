/** Man-coverage defenders who touch an offensive player who is not their man before the throw (Integration, via Rules): per game play, every man defender's separation to his man each 0.1 s
 * and each first touch with a non-assigned offensive body (time, closing speed along the line of centres, both speeds, whether either body is falling/down/rising within 1.0 s).
 *   node --import tsx scripts/diag/body/man-collide.mts [--seed 101] [--games 8] [--out out/mancollide/g.json]. Read-only tap on PlaySim.prototype.tick (no RNG draws). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8')), out = arg('--out', 'out/mancollide/g.json');
mkdirSync(dirname(out), { recursive: true });
const r2 = (v: number) => Math.round(v * 100) / 100;
type Pair = { d: number; o: number; t: number; closing: number; dv: number; ov: number; down: { d: boolean; o: boolean }; track?: { d: string; o: string } };
type Rec = { sim: any; sep: Map<number, number[]>; pairs: Map<string, Pair>; last: number; tgt: Map<number, number> };
const recs = new Map<object, Rec>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
const gone = (a: any) => ['falling', 'down', 'rising'].includes(a.body.support?.state);
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live') return;
  const thrown = this.events.some((e: any) => e.type === 'throw');
  let rec = recs.get(this); if (!rec) { rec = { sim: this, sep: new Map(), pairs: new Map(), last: -1, tgt: new Map() }; recs.set(this, rec); }
  const k = Math.floor(this.t * 10 + 1e-6);
  for (const d of this.agents) {
    if (d.team !== 'D' || d.behavior?.kind !== 'man' || !d.behavior.target) continue;
    const T = d.behavior.target; rec.tgt.set(d.idx, T.idx);
    if (k !== rec.last) { const s = rec.sep.get(d.idx) ?? []; s[k] = r2(Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y)); rec.sep.set(d.idx, s); }
    for (const o of this.agents) {
      if (o.team !== 'O' || o === T) continue;
      const key = `${d.idx}-${o.idx}`; const dx = o.pos.x - d.pos.x, dy = o.pos.y - d.pos.y, dist = Math.hypot(dx, dy);
      const p = rec.pairs.get(key);
      if (p) { if (this.t - p.t <= 1.0 + 1e-9) { p.down.d ||= gone(d); p.down.o ||= gone(o); } continue; }
      if (thrown || dist > d.profile.radius + o.profile.radius + 0.02) continue;
      const cl = ((d.vel.x - o.vel.x) * dx + (d.vel.y - o.vel.y) * dy) / (dist || 1);
      rec.pairs.set(key, { d: d.idx, o: o.idx, t: r2(this.t), closing: r2(cl), dv: r2(Math.hypot(d.vel.x, d.vel.y)), ov: r2(Math.hypot(o.vel.x, o.vel.y)), down: { d: gone(d), o: gone(o) } });
    }
  }
  rec.last = k;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const plays: any[] = [];
for (let g = 0; g < games; g++) {
  recs.clear();
  simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as never);
  let i = 0;
  for (const r of recs.values()) {
    const s = r.sim; if (s.offCall.kind !== 'pass') continue;
    const throwE = (s.events as any[]).find((e) => e.type === 'throw');
    const men = [...r.sep.keys()];
    plays.push({ id: `${seed + g}-${i++}`, concept: s.offCall.label, cov: s.defCall.label ?? s.defCall.coverage?.id, form: s.offCall.formation?.id, throw: throwE?.t ?? null,
      men: men.map((d) => ({ d, slot: s.agents[d].slot, tgt: s.agents[r.tgt.get(d)!].slot, sep: r.sep.get(d) })),
      pairs: [...r.pairs.values()].map((p) => ({ ...p, dslot: s.agents[p.d].slot, oslot: s.agents[p.o].slot, tslot: s.agents[r.tgt.get(p.d)!].slot })) });
  }
  console.error(`game ${g + 1}/${games}`);
}
writeFileSync(out, JSON.stringify(plays)); console.error(`${plays.length} pass plays -> ${out}`);
