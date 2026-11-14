// usage: npm run ref -- -- npx tsx scripts/diag/risk/accel-bench.ts SEED GAMES | grep "^AB "
// In-play acceleration bench: D1/D2 (nearest at the catch) on short completions, each tick from the catch to +1.0 s,
// out of contact (over 2 yd from the catcher, no other body within 1.5 yd). Achieved acceleration along his velocity
// (from his velocity before and after the tick) against the movement law's own prediction on a copy of his body
// (locomotionAccel at capacity 1): as he is; with the heading offset removed (the same request speed along his
// velocity); at energy 1. Also his posture, availability is the residual.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { locomotionAccel, fatigueFactor } from '../../../src/physics/kinematics.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick;
const rows: any[] = [];
const along = (a: any, v: any) => { const s = Math.hypot(v.x, v.y) || 1; return (a.x * v.x + a.y * v.y) / s; };
P.tick = function () {
  const s = this;
  let pre: any = null;
  if (s.__ab?.on) {
    pre = s.__ab.ids.map((i: number) => { const a = s.agents[i]; return { v: { ...a.vel }, body: { ...a.body, vel: { ...a.vel }, pos: { ...a.pos }, profile: a.profile, facing: a.body.facing } }; });
  }
  const r = t0.call(this);
  if (s.offCall?.kind !== 'pass' || s.offCall?.pass?.family === 'screen') return r;
  const held = s.ball.kind === 'held' && s.ball.carrier !== s.qb && s.offense.includes(s.ball.carrier);
  if (held && !s.__ab) {
    const C = s.ball.carrier;
    const order = s.defense.map((d: any) => d.idx).sort((i: number, j: number) => Math.hypot(s.agents[i].pos.x - C.pos.x, s.agents[i].pos.y - C.pos.y) - Math.hypot(s.agents[j].pos.x - C.pos.x, s.agents[j].pos.y - C.pos.y));
    s.__ab = { on: true, t0: s.t, ids: order.slice(0, 2), C };
    rows.push({ why: 'energy', c: C.body.energy, d1: s.agents[order[0]].body.energy, d2: s.agents[order[1]].body.energy, t: s.t, all: s.defense.map((d: any) => d.body.energy), off: s.offense.map((o: any) => o.body.energy) });
  }
  if (pre && s.__ab) {
    if (s.t - s.__ab.t0 > 1.0 + 1e-9) { s.__ab.on = false; return r; }
    s.__ab.ids.forEach((i: number, k: number) => {
      const a = s.agents[i], C = s.__ab.C, it = s.intents?.[i]; if (!it) return;
      const sp0 = Math.hypot(pre[k].v.x, pre[k].v.y);
      const dC = Math.hypot(a.pos.x - C.pos.x, a.pos.y - C.pos.y);
      const why = a.body.support?.state && a.body.support.state !== 'up' ? 'down' : s.bond?.tacklers?.includes(a) ? 'bond' : a.engagement ? 'engaged'
        : dC < 2 ? 'near catcher' : s.agents.some((o: any) => o !== a && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 1.5) ? 'near body' : sp0 < 2 ? 'slow' : 'free';
      const dsp = (Math.hypot(a.vel.x, a.vel.y) - sp0) / s.dt;
      rows.push({ k, why, dsp, sp: sp0, t: s.t - s.__ab.t0, req: Math.hypot(it.vel.x, it.vel.y) });
      if (why !== 'free') return;
      const ach = along({ x: (a.vel.x - pre[k].v.x) / s.dt, y: (a.vel.y - pre[k].v.y) / s.dt }, pre[k].v);
      const b = pre[k].body;
      const m0 = along(locomotionAccel(b, it, s.dt, 1), pre[k].v);
      const rs = Math.hypot(it.vel.x, it.vel.y);
      const straight = { ...it, vel: { x: pre[k].v.x / sp0 * rs, y: pre[k].v.y / sp0 * rs } };
      const m1 = along(locomotionAccel(b, straight, s.dt, 1), pre[k].v);
      const m2 = along(locomotionAccel({ ...b, energy: 1 }, straight, s.dt, 1), pre[k].v);
      const off = Math.abs(((Math.atan2(it.vel.y, it.vel.x) - Math.atan2(pre[k].v.y, pre[k].v.x)) * 180 / Math.PI + 540) % 360 - 180);
      rows.push({ k, why: 'bench', sp: sp0, req: rs, off, ach, m0, m1, m2, en: b.energy, fat: fatigueFactor(b.energy), tau: a.profile.tau, vmax: a.profile.vmax, post: a.body.support?.posture ?? null, eff: it.effort ?? 1 });
    });
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
process.stdout.write('AB ' + JSON.stringify(rows) + '\n');
