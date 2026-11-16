// node --import tsx scripts/diag/eyes/facing-swing.ts [seed] [games] > rows.jsonl
// Integration's facing question (2026-11-16): his shoulders turning 0.4-0.8 rad and back inside 0.3 s. Is it the request
// or the body, and what causes it? dither-core.ts accounts velocity requests only, so this applies its definitions to his
// facing: a re-aim is a change of more than 20 deg in the facing he requests from one tick to the next; it is reversed
// when a later request comes back within 20 deg of the one before it within 0.3 s. The same is counted on his body's
// achieved facing. Each requested re-aim is charged to what changed that tick, in order: his phase (drop / set / windup /
// evade...: a mode switch), his read index (a read change), where his eyes are (sim.qbEyes), else the target moved.
// One row per pass play while he holds the ball in the pass behavior. Passive: wraps update and records its result.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const DEG = 180 / Math.PI, TURN = 20, BACK = 0.3;
const d = (a: number, b: number) => Math.abs(((b - a) * DEG + 540) % 360 - 180);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let qb: any = null, prev: any = null;
  const req: { t: number; f: number; cause: string }[] = [], body: { t: number; f: number }[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && !qb) {
      qb = b; const up = b.update.bind(b);
      b.update = (a: any, s: any) => {
        const before = { phase: b.phase, idx: b.readIdx, eyes: s.qbEyes };
        const cmd = up(a, s);
        if (sim.carrier === sim.qb && cmd && Number.isFinite(cmd.facing)) {
          const cause = !prev ? 'start' : b.phase !== prev.phase || before.phase !== b.phase ? `mode:${prev.phase}->${b.phase}`
            : b.readIdx !== prev.idx ? 'read change' : s.qbEyes !== prev.eyes ? 'eyes' : 'target moved';
          req.push({ t: s.t, f: cmd.facing, cause });
          prev = { phase: b.phase, idx: b.readIdx, eyes: s.qbEyes };
        }
        return cmd;
      };
    }
    tick();
    if (qb && sim.qb.behavior === qb && sim.carrier === sim.qb) body.push({ t: sim.t, f: sim.qb.body.facing });
  };
  const res = orig.apply(this);
  if (qb && req.length > 2) {
    const count = (xs: { t: number; f: number; cause?: string }[]) => {
      let re = 0, back = 0; const by: Record<string, [number, number]> = {};
      for (let i = 1; i < xs.length; i++) {
        if (d(xs[i - 1].f, xs[i].f) <= TURN) continue;
        re++; const c = xs[i].cause ?? '-', e = by[c] ??= [0, 0]; e[0]++;
        for (let j = i + 1; j < xs.length && xs[j].t - xs[i].t <= BACK + 1e-9; j++) if (d(xs[i - 1].f, xs[j].f) <= TURN) { back++; e[1]++; break; }
      }
      // Swings: the facing's range within any 0.3 s window that comes back near its start (the body measure of the census).
      let swings = 0;
      for (let i = 0; i < xs.length; i++) {
        let hi = 0;
        for (let j = i + 1; j < xs.length && xs[j].t - xs[i].t <= BACK + 1e-9; j++) { hi = Math.max(hi, d(xs[i].f, xs[j].f)); if (hi > 23 && d(xs[i].f, xs[j].f) < 6) { swings++; i = j; break; } }
      }
      return { n: xs.length, re, back, swings, by };
    };
    console.log(JSON.stringify({ concept: sim.offCall?.pass?.id ?? '?', secs: +(req[req.length - 1].t - req[0].t).toFixed(2), req: count(req), body: count(body) }));
  }
  return res;
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 2); g++) simulateGame(home, away, { seed: seed + g });
