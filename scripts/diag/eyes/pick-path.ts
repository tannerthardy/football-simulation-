// QB lane 2026-11-18: the picker's true path from the decision to the pick (one league play by run number): every
// 0.05 s his distance to the throw's aim, his speed toward it, his tags; and the ball's planned arrival.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.env.SEED ?? 101), want = Number(process.env.PLAY ?? 35), picker = process.env.PICKER ?? 'CB_S';
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  n++; const sim: any = this; if (n !== want) return orig.apply(this);
  let dec: any = null, hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st = b.startThrow.bind(b); b.startThrow = (a: any, s: any, ev: any) => { dec = { t: s.t, aim: { ...ev.point }, T: ev.T }; return st(a, s, ev); }; }
    tick0();
    const d = sim.defense.find((x: any) => x.slot === picker);
    if (dec && d && sim.t <= dec.t + 1.6) { const dx = dec.aim.x - d.pos.x, dy = dec.aim.y - d.pos.y, dist = Math.hypot(dx, dy); const vt = (d.vel.x * dx + d.vel.y * dy) / (dist || 1);
      console.log((sim.t - dec.t).toFixed(2), 'dist', dist.toFixed(2), 'v→aim', vt.toFixed(2), 'speed', Math.hypot(d.vel.x, d.vel.y).toFixed(2), 'ball', sim.ball.kind, [...(d.tags ?? [])].filter((x: string) => /arm|onBall|plant|break|look|bite|readArm|turn/.test(x)).join(',')); } };
  const res = orig.apply(this);
  const ie = sim.events.find((e: any) => e.type === 'interception'), te = sim.events.find((e: any) => e.type === 'throw');
  console.log('aim', dec && [dec.aim.x.toFixed(2), dec.aim.y.toFixed(2), dec.aim.z.toFixed(2)], 'thrown intended', JSON.stringify(sim.ball?.intended ?? sim.lastThrow?.intended ?? null), 'pick event', JSON.stringify(ie && { pos: ie.pos, a: ie.a }), 'throw event', JSON.stringify(te && { pos: te.pos }), 'missBy', JSON.stringify(sim.throwMiss ?? sim.lastMiss ?? null));
  console.log('decision', dec && dec.t.toFixed(2), 'release', sim.throwAt?.toFixed?.(2), 'T', dec?.T?.toFixed(2), 'planned arrival (from decision)', dec && (sim.throwAt - dec.t + dec.T).toFixed(2), sim.events.filter((e: any) => ['throw', 'interception'].includes(e.type)).map((e: any) => e.type + '@' + (e.t - dec.t).toFixed(2)).join(' '));
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
