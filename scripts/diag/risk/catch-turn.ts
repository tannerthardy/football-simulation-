// usage: npm run ref -- -- npx tsx scripts/diag/risk/catch-turn.ts SEED GAMES | grep "^CT " > out/risk/catch-turn.txt
// Post-catch redirect: for short completions (air < 10 yd, non-screen), the defender nearest the catcher at the catch,
// tick by tick from the catch for 0.6 s: behaviour kind, the decision's request, the command after each post-decision
// stage, the final intent, and his achieved velocity; the catcher's track to +1.1 s. JSON lines.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 6);
const STAGES = ['decision', 'containment', 'coverage-orientation', 'open-to-ball', 'technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard'];
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const r2 = (v: number) => Math.round(v * 100) / 100;
P.tick = function () {
  const s = this;
  if (!s.__ct) {
    s.__ct = { stv: new Map(), frames: [], catchI: -1, T: null, air: 0 };
    const put = (a: any, k: string, c: any) => { if (!c?.vel) return; const m = s.__ct.stv.get(a) ?? {}; m[k] = [r2(c.vel.x), r2(c.vel.y)]; s.__ct.stv.set(a, m); };
    s.responsibility = new Proxy({}, { get: (_o, k) => k === 'decision' ? (a: any, _b: any, c: any) => put(a, 'decision', c)
      : k === 'stage' ? (st: string, a: any, c: any) => put(a, st, c)
      : k === 'stageAll' ? (st: string, I: any[]) => I.forEach((c, i) => put(s.agents[i], st, c)) : () => undefined });
  }
  const C = s.__ct; C.stv.clear();
  const r = t0.call(this);
  if (s.offCall?.kind !== 'pass' || s.offCall?.pass?.family === 'screen') return r;
  if (s.ball.kind === 'air' && !C.T && s.ball.target && !s.ball.throwaway) { C.T = s.ball.target; C.air = (s.ball.intended.x - s.los) * s.attackDir('O'); }
  if (!C.T) return r;
  const held = s.ball.kind === 'held' && s.ball.carrier !== s.qb && s.offense.includes(s.ball.carrier);
  if (held && C.catchI < 0) { C.catchI = C.frames.length; C.T = s.ball.carrier; C.t0 = s.t; }
  if (C.catchI >= 0 && s.t - C.t0 <= 1.1 + 1e-9) {
    C.frames.push({ t: r2(s.t - C.t0), c: [r2(C.T.pos.x), r2(C.T.pos.y), r2(C.T.vel.x), r2(C.T.vel.y)],
      d: s.defense.map((d: any) => ({ p: [r2(d.pos.x), r2(d.pos.y)], v: [r2(d.vel.x), r2(d.vel.y)], k: d.behavior?.kind ?? '-', f: r2(d.body?.facing ?? d.facing),
        st: C.stv.get(d) ?? {}, it: s.intents?.[d.idx] ? [r2(s.intents[d.idx].vel.x), r2(s.intents[d.idx].vel.y)] : null })) });
  } else if (C.catchI < 0) C.frames.length = 0;
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), C = this.__ct; this.__ct = undefined;
  if (C && C.T && C.air < 10 && this.stats?.completed && C.frames.length > 5)
    process.stdout.write('CT ' + JSON.stringify({ yards: res.yards, frames: C.frames }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
