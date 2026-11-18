/** Off-feet episodes in ordinary games: a read-only tap on PlaySim.tick that follows every body's support state (falling -> down -> rising -> up), with who, why, how fast, and how long
 * each phase lasts, and whether the play was still live when he would have been up. Passive: no draws, no state written.
 *   node --import tsx scripts/diag/body/down-slide.ts OUT.json SEED [SEED ...]
 * Per episode: team, slot, cause (support.cause), carrier at the fall, speed at the fall start and when he goes down, the phase times, getUp, the play's end time, and `open` if the play ended before he was up. */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const out = process.argv[2]; const seeds = process.argv.slice(3).map(Number);
const r2 = (v: number) => Math.round(v * 100) / 100;
const eps: any[] = [];
const state = new WeakMap<object, { open: Map<number, any>; ended: boolean; plays: number }>();
const proto = PlaySim.prototype as any; const tick = proto.tick;
let playNo = 0;
proto.tick = function (this: any) {
  tick.call(this);
  let st = state.get(this); if (!st) { st = { open: new Map(), ended: false, plays: ++playNo }; state.set(this, st); }
  for (const a of this.agents) {
    const s = a.body.support; if (!s) continue;
    let e = st.open.get(a.idx);
    if (s.state === 'falling' && !e) { e = { play: st.plays, team: a.team, slot: a.slot, cause: s.cause ?? null, carrier: this.carrier === a, speedFall: r2(Math.hypot(a.vel.x, a.vel.y)), engaged: !!a.engagement, tFall: r2(this.t), getUp: r2(a.profile.getUp ?? 0.9), ballKind: this.ball.kind }; st.open.set(a.idx, e); }
    if (e) {
      if (s.state === 'down' && e.tDown === undefined) { e.tDown = r2(this.t); e.speedDown = r2(Math.hypot(a.vel.x, a.vel.y)); e.carrierDown = this.carrier === a; }
      if (s.state === 'rising' && e.tRise === undefined) { e.tRise = r2(this.t); e.speedRise = r2(Math.hypot(a.vel.x, a.vel.y)); }
      if (s.state === 'up' && e.tDown !== undefined) { e.tUp = r2(this.t); eps.push(e); st.open.delete(a.idx); }
    }
  }
  if (this.phase === 'dead' && !st.ended) { st.ended = true; for (const e of st.open.values()) { e.open = true; e.tEnd = r2(this.t); eps.push(e); } for (const e of eps) if (e.play === st.plays && e.tEnd === undefined) e.tEnd = r2(this.t); st.open.clear(); }
};
const rng = new Rng(7);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let plays = 0;
for (const seed of seeds) { const g: any = simulateGame(home, away, { seed } as any); plays += g.log.length; }
writeFileSync(out, JSON.stringify({ seeds, plays: playNo, episodes: eps })); console.log(seeds, playNo, 'sims', eps.length, 'episodes ->', out);
