// QB lane 2026-11-18: the picker's true path from the decision to the pick (one league play by run number): every
// 0.05 s his distance to the throw's aim, his speed toward it, his tags; and the ball's planned arrival.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';


const seed = Number(process.env.SEED ?? 101), want = Number(process.env.PLAY ?? 35), picker = process.env.PICKER ?? 'CB_S';
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  n++; const sim: any = this; (globalThis as any).__WDBG = n === want ? picker : null; if (n !== want) return orig.apply(this);
  let dec: any = null, hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; const st = b.startThrow.bind(b); b.startThrow = (a: any, s: any, ev: any) => { dec = { t: s.t, aim: { ...ev.point }, T: ev.T }; { const d = s.defense.find((x: any) => x.slot === picker), e = b.mind.estimate(d), dir = s.attackDir(s.qb.team); console.log('pMan', b.mind.pMan().toFixed(2), 'pSingleHigh', b.mind.pSingleHigh().toFixed(2), 'deepWait', b.deepWait.has(d)); console.log('depths at decision: aim', ((ev.point.x - s.los) * dir).toFixed(2), picker, 'seen', ((e.pos.x - s.los) * dir).toFixed(2), 'true', ((d.pos.x - s.los) * dir).toFixed(2)); } return st(a, s, ev); };
      const pd = b.pullDown.bind(b); b.pullDown = (a: any, s: any, ev: any) => { const left = b.releaseAt - s.t; const p = b.receiverForecasts.get(ev.target)?.predict(s.t, left + ev.T); b.marginProbe = true; const r0 = pd(a, s, ev); const d = s.defense.find((x: any) => x.slot === picker); const e = b.mind.estimate(d);
        console.log('recheck', s.t.toFixed(2), 'point', p && [p.x.toFixed(2), p.y.toFixed(2)], '->', r0, picker, 'true', [d.pos.x.toFixed(2), d.pos.y.toFixed(2)], 'v', [d.vel.x.toFixed(1), d.vel.y.toFixed(1)], 'seen', [e.pos.x.toFixed(2), e.pos.y.toFixed(2)], 'seenV', [e.vel.x.toFixed(1), e.vel.y.toFixed(1)], 'dist to point true', p && Math.hypot(d.pos.x - p.x, d.pos.y - p.y).toFixed(2), 'margin rows', JSON.stringify((b.marginLast ?? []).map((m: any) => ({ s: m.slot, m: m.m, first: m.first, contest: m.contest, blind: m.blind, react: m.react, dTgt: m.dTgt, facing: m.facingQB })))); return r0; };
      const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, r: any, v0: any, intended: any, ...rest: any[]) => { if (q === sim.qb && r) { const tgt = r.pos; console.log('release', sim.t.toFixed(2), 'intended', [intended.x.toFixed(2), intended.y.toFixed(2)], 'receiver now', [tgt.x.toFixed(2), tgt.y.toFixed(2)], 'drawn aim', JSON.stringify(b.releaseRec?.aim && [b.releaseRec.aim.x.toFixed(2), b.releaseRec.aim.y.toFixed(2)])); } return tb(q, r, v0, intended, ...rest); }; }
    tick0();
    { const bb: any = sim.qb.behavior; if (bb?.mind?.belief && [0.05, 0.5, 1.0, 1.5, 2.0, 2.5].some((x) => Math.abs(sim.t - x) < 0.026)) console.log('belief', sim.t.toFixed(2), Object.entries(bb.mind.belief as Record<string, number>).sort((u, v) => v[1] - u[1]).slice(0, 4).map(([k, v]) => k + ' ' + v.toFixed(3)).join(', '), 'true', sim.defCall?.coverage?.id); }
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
