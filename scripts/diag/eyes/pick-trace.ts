// QB lane 2026-11-18 (Flex's short picks): one league play by run number. Every startThrow (time, target, P, intRisk),
// every pullDown result with his rush time, the release, and the picker's lane terms in the window at the decision and
// at the release (marginProbe).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.env.SEED ?? 101), want = Number(process.env.PLAY ?? 44), picker = process.env.PICKER ?? 'NB';
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  n++; const sim: any = this; if (n !== want) return orig.apply(this);
  const dir = sim.attackDir(sim.qb.team);
  console.log('play', n, sim.offCall?.pass?.id, sim.defCall?.coverage?.id, 'isPass', sim.isPass);
  let hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; b.marginProbe = true;
      const st = b.startThrow.bind(b); b.startThrow = (a: any, s: any, ev: any) => { const m = (b.marginLast ?? []).find((x: any) => x.slot === picker);
        console.log(sim.t.toFixed(2), 'START', ev.target.slot, 'P', ev.P.toFixed(3), 'iR', ev.intRisk.toFixed(3), 'T', ev.T.toFixed(2), 'phase', b.phase, 'readIdx', b.readIdx, picker, JSON.stringify(m ?? null)); return st(a, s, ev); };
      const pd = b.pullDown.bind(b); b.pullDown = (a: any, s: any, ev: any) => { const pr = b.pressure(a, s); const r = pd(a, s, ev); const m = (b.marginLast ?? []).find((x: any) => x.slot === picker);
        console.log(sim.t.toFixed(2), 'RECHECK ->', r, 'rushT', pr.time.toFixed(2), 'left', (b.releaseAt - s.t).toFixed(2), 'stickKeptLast', b.stickKeptLast, picker, JSON.stringify(m ? { m: m.m, first: m.first, iPath: m.iPath, touch: m.touch } : null)); return r; }; }
    const d = sim.defense.find((x: any) => x.slot === picker);
    if (b?.kind === 'qb-pass' && d && sim.t >= 2.2 && sim.t <= 3.3) { const e = b.mind?.estimate?.(d); console.log(sim.t.toFixed(2), 'phase', b.phase, picker, 'true', ((d.pos.x - sim.los) * dir).toFixed(1), d.pos.y.toFixed(1), 'v', d.vel.x.toFixed(1), d.vel.y.toFixed(1), 'seen', e ? ((e.pos.x - sim.los) * dir).toFixed(1) + ',' + e.pos.y.toFixed(1) + ' age ' + (sim.t - (e.t ?? e.at ?? sim.t)).toFixed(2) : '-'); }
    tick0(); };
  const res = orig.apply(this);
  console.log('result', res.outcome, sim.events.filter((e: any) => ['throw', 'interception', 'pump', 'catch'].includes(e.type)).map((e: any) => e.type + '@' + e.t.toFixed(2)).join(' '));
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });
