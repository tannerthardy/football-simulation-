// Deep targeted receivers in games: who commands him in the last 1.5 s before the ball arrives, what speed is
// requested vs achieved, and his top speed (vmax). Population as deep_trail.py: target 12+ yd downfield of his start
// at arrival, nearest defender < 3 yd at arrival. Arrival = the first of secure/catch/incomplete/pbu/... events.
// usage: npx tsx scripts/diag/risk/deep-target-speed.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const ARRIVE = new Set(['secure', 'catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss']);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b) this.__dt = { R: b, x0: this.__start?.get(b) ?? b.pos.x, f: [] as any[], arrived: null };
  if (this.__dt && this.__dt.arrived === null && ARRIVE.has(type)) this.__dt.arrived = this.t;
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  if (!this.__start) this.__start = new Map(this.offense.map((o: any) => [o, o.pos.x]));
  const r = tick0.call(this);
  const T = this.__dt;
  if (T && T.arrived === null) {
    const R = T.R, i = this.agents.indexOf(R), c = this.cmds?.[i];
    T.f.push({ t: this.t, who: `${R.behavior?.constructor?.name}${R.behavior?.kind ? ':' + R.behavior.kind : ''}`, want: c ? Math.hypot(c.vel.x, c.vel.y) : NaN,
      sp: Math.hypot(R.vel.x, R.vel.y), vmax: R.profile.vmax, effort: R.behavior?.effort ?? R.behavior?.fallback?.effort });
  }
  if (T && T.arrived !== null && !T.done) {
    T.done = true; const R = T.R, dir = this.attackDir(R.team);
    const deep = (R.pos.x - this.__start.get(R)) * dir >= 12;
    const sep = Math.min(...this.defense.map((d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y)));
    if (deep && sep < 3 && T.f.length) rows.push({ f: T.f, ta: T.arrived, sep, man: !!this.defCall?.coverage?.man });
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { const x = v.filter(n => n === n).sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`deep targets, defender < 3 yd at arrival: n ${rows.length} (man ${rows.filter(r => r.man).length})`);
for (const back of [1.5, 1.0, 0.5, 0.2]) {
  const at = rows.map(r => r.f.reduce((b: any, x: any) => Math.abs(x.t - (r.ta - back)) < Math.abs(b.t - (r.ta - back)) ? x : b));
  const who = at.reduce((m: any, x: any) => (m[x.who] = (m[x.who] ?? 0) + 1, m), {});
  console.log(`  -${back.toFixed(1)} s: speed ${q(at.map((x: any) => x.sp))} requested ${q(at.map((x: any) => x.want))} | vmax ${q(at.map((x: any) => x.vmax))} effort ${q(at.map((x: any) => x.effort))} | controller ${JSON.stringify(who)}`);
}
