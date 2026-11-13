/** Sim between-player pursuit spread (Defense, report only): the same measures as
 * scripts/diag/pass-operators/skill_spread.py, collected per player id from live sim state across games, with the
 * play parity for split-half reliability. Writes JSON lines {id, pos, half, m, v} to stdout; combine with
 * player-spread-summary.py. Measures: lead (open field, level, 5-25 yd: intercept minus aim, deg), rel (pass: closing
 * on the catch point at the throw, within 8 yd of the catch), angle (his first arrival inside 1.5 yd), appr (speed
 * 3-2 yd before his arrival), ended (the play ends within 1 s of his arrival with him within 2 yd).
 * usage: node --import tsx scripts/diag/effective-mass/player-spread.mts [games] [seed] > out.jsonl */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 2), seed0 = Number(process.argv[3] ?? 101);
let playNo = 0;
const out = (o: object) => process.stdout.write(JSON.stringify(o) + '\n');
const iang = (dx: number, dy: number, cvx: number, cvy: number, s: number) => { const L = Math.hypot(dx, dy); if (L < 1e-6 || s < .5) return null;
  const ux = dx / L, uy = dy / L, along = cvx * ux + cvy * uy, perp = -cvx * uy + cvy * ux; if (Math.abs(perp) >= s) return null;
  const a = Math.asin(perp / s); return s * Math.cos(a) - along > 0 ? a : null; };
const St = new WeakMap<any, any>(); const fired = new WeakMap<any, string>();
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: any, d: any) => { fired.set(a, d?.kind ?? '?'); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any;
};
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; const wasAir = sim.ball.kind === 'air';
  for (const a of sim.agents) fired.delete(a);
  tick0.call(this);
  let s = St.get(sim); if (!s) { s = { n: playNo++, t0: -1, c: null, per: new Map(), atThrow: null, pend: [] }; St.set(sim, s); }
  const half = s.n % 2;
  for (let i = s.pend.length - 1; i >= 0; i--) { const P = s.pend[i]; if (sim.phase === 'live' && sim.t < P.due) continue; s.pend.splice(i, 1);
    const ended = sim.phase !== 'live' && Math.hypot(P.d.pos.x - P.c.pos.x, P.d.pos.y - P.c.pos.y) <= 2; out({ id: P.d.player.id, pos: P.d.slot, half, m: 'ended', v: ended ? 1 : 0 }); }
  if (!s.atThrow && sim.ball.kind === 'air') s.atThrow = sim.defense.map((d: any) => ({ d, p: { ...d.pos }, v: { ...d.vel } }));
  if (sim.phase !== 'live') return;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!c || c.team !== 'O') return;
  if (s.t0 < 0) { const open = sim.offCall?.kind === 'pass' ? c !== sim.qb : c.pos.x > sim.los; if (!open) return; s.t0 = sim.t; s.c = c;
    if (wasAir && s.atThrow) for (const r of s.atThrow) { if (Math.hypot(r.d.pos.x - c.pos.x, r.d.pos.y - c.pos.y) > 8) continue;
      const L = Math.hypot(c.pos.x - r.p.x, c.pos.y - r.p.y) || 1; out({ id: r.d.player.id, pos: r.d.slot, half, m: 'rel', v: (r.v.x * (c.pos.x - r.p.x) + r.v.y * (c.pos.y - r.p.y)) / L }); } }
  if (c !== s.c || sim.t - s.t0 > 3) return;
  if (!s.phys) { s.phys = new Map(); for (const d of sim.defense) s.phys.set(d, { v0: { ...d.vel }, t0: sim.t, done: false, prevSp: Math.hypot(d.vel.x, d.vel.y), prevT: sim.t }); }
  for (const d of sim.defense) { const Q = s.phys.get(d); if (!Q) continue; const sp = Math.hypot(d.vel.x, d.vel.y);
    out({ id: d.player.id, pos: d.slot, half, m: 'speed', v: sp, prof: { vmax: d.profile.vmax * d.speedScale, tau: d.profile.tau, lateral: d.profile.lateral } });
    if (Q.prevSp < 3 && sim.t - Q.prevT > 0) out({ id: d.player.id, pos: d.slot, half, m: 'accel', v: (sp - Q.prevSp) / (sim.t - Q.prevT) });
    Q.prevSp = sp; Q.prevT = sim.t;
    if (!Q.done && sim.t - Q.t0 >= 0.5 - 1e-9) { Q.done = true; if (Math.hypot(Q.v0.x, Q.v0.y) > 2 && sp > 2)
      out({ id: d.player.id, pos: d.slot, half, m: 'redirect', v: Math.abs(((Math.atan2(d.vel.y, d.vel.x) - Math.atan2(Q.v0.y, Q.v0.x)) * 180 / Math.PI + 540) % 360 - 180) }); } }
  for (const d of sim.defense) {
    let P = s.per.get(d); if (!P) { P = { arrived: false, band: NaN, k: 0 }; s.per.set(d, P); } if (P.arrived) continue;
    const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dist = Math.hypot(dx, dy), sp = Math.hypot(d.vel.x, d.vel.y), cs = Math.hypot(c.vel.x, c.vel.y);
    if (dist <= 1.5) { P.arrived = true; if (sp > .5) out({ id: d.player.id, pos: d.slot, half, m: 'angle', v: Math.abs(Math.atan2(-d.vel.x * dy + d.vel.y * dx, d.vel.x * dx + d.vel.y * dy)) * 180 / Math.PI });
      if (Number.isFinite(P.band)) out({ id: d.player.id, pos: d.slot, half, m: 'appr', v: P.band }); s.pend.push({ due: sim.t + 1, d, c }); continue; }
    if (dist >= 2 && dist < 3) P.band = sp;
    if (dist >= 5 && dist <= 25 && sp >= 1.5 && cs >= 1 && (P.k++ % 2 === 0)) {
      const bear = Math.acos(Math.max(-1, Math.min(1, (-dx * c.vel.x - dy * c.vel.y) / (dist * cs)))) * 180 / Math.PI;
      if (bear >= 60 && bear <= 120) { const side = (-c.vel.x * dy + c.vel.y * dx) / dist >= 0 ? 1 : -1;
        const aim = Math.atan2((-d.vel.x * dy + d.vel.y * dx) / dist, (d.vel.x * dx + d.vel.y * dy) / dist) * 180 / Math.PI * side;
        const ia = iang(dx, dy, c.vel.x, c.vel.y, sp);
        const it = sim.intents?.[d.idx]; const rq = it ? Math.hypot(it.vel.x, it.vel.y) : 0;
        if (ia !== null && rq > 1) { const raim = Math.atan2((-it.vel.x * dy + it.vel.y * dx) / dist, (it.vel.x * dx + it.vel.y * dy) / dist) * 180 / Math.PI * side;
          out({ id: d.player.id, pos: d.slot, half, m: 'leadreq', v: ia * 180 / Math.PI * side - raim, tb: new Rng(`pursuit-tendency:${d.player.id}`).normal(0, 1) * (1.2 - d.r('pursuit')) }); }
        if (ia !== null && sim.t - s.t0 >= 1) out({ id: d.player.id, pos: d.slot, half, m: 'leadlate', v: ia * 180 / Math.PI * side - aim, tb: new Rng(`pursuit-tendency:${d.player.id}`).normal(0, 1) * (1.2 - d.r('pursuit')) });
        if (ia !== null) out({ id: d.player.id, pos: d.slot, half, m: 'lead', v: ia * 180 / Math.PI * side - aim, r: d.r('pursuit'), tb: new Rng(`pursuit-tendency:${d.player.id}`).normal(0, 1) * (1.2 - d.r('pursuit')), src: fired.get(d) ? 'planner' : (d.behavior?.kind ?? '?') + ((d as any).tags?.has?.('onBall') ? '+onBall' : '') }); }
    }
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
