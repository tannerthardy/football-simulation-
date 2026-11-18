// QB lane 2026-11-18 (Integration, the user's correction): what the "man" belief does in pricing, per defender. At each
// throw decision, the window's rows for defenders facing the QB (marginProbe) with his pMan; after the play, whether that
// defender keyed the arm (the defense's readArm tag: a zone reader with his eyes on the QB) and the coverage.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.env.SEED ?? 101), games = Number(process.env.GAMES ?? 2);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: any = null, hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') { hooked = true; b.marginProbe = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => { const keys = (slot: string) => { const d = s.defense.find((x: any) => x.slot === slot); if (!d) return null;
          const ang = Math.atan2(s.qb.pos.y - d.pos.y, s.qb.pos.x - d.pos.x), zoneEyes = d.behavior?.constructor?.name === 'ZoneCoverage' || d.behavior?.zoneEyes === true;
          return { facing: Math.cos(d.body.facing - ang) > (zoneEyes ? -0.2 : 0.1), zoneEyes, beh: d.behavior?.constructor?.name ?? null }; };
        if (!dec) dec = { t: +s.t.toFixed(2), pMan: +b.mind.pMan().toFixed(3), target: ev.target.slot, P: ev.P, iR: ev.intRisk,
        rows: (b.marginLast ?? []).filter((m: any) => m.facingQB).map((m: any) => ({ truth: keys(m.slot), slot: m.slot, m: m.m, first: m.first, blind: m.blind, react: m.react, wind: m.wind, pReads: m.pReads })) }; return st(a, s, ev); }; }
    tick0(); };
  const res = orig.apply(this);
  if (dec) { const cov: any = sim.defCall?.coverage;
    for (const r of dec.rows) { const d = sim.defense.find((x: any) => x.slot === r.slot); r.readArm = !!d?.tags?.has?.('readArm'); r.picked = sim.events.some((e: any) => e.type === 'interception' && sim.agents[e.a] === d); }
    console.log(JSON.stringify({ coverage: cov?.id, man: cov?.man, ...dec, int: sim.events.some((e: any) => e.type === 'interception') })); }
  return res; };
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
