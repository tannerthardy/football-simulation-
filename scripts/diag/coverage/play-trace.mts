// Trace one play every 0.1 s (read-only taps): every defender's depth/width, speed, facing, behavior, job and technique
// label, man target; every eligible's depth/width/velocity; the QB; the ball. The play is found by concept, coverage
// and down in one game.
//   node --import tsx scripts/diag/coverage/play-trace.mts <teamSeed> <gameSeed> <leagueSample 0|1> <concept> <coverage> <down> <out.json>
// Census games: teamSeed 11, gameSeed 11+g, leagueSample 1. Film-room games: teamSeed 101, gameSeed 101+g, leagueSample 0.
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, ManCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';

const [teamSeed, gameSeed, ls, concept, coverage, down, out] = process.argv.slice(2);
const Z: any = ZoneCoverage.prototype, M: any = ManCoverage.prototype, P: any = PlaySim.prototype;
const zu = Z.update, mu = M.update, tick0 = P.tick;
const label = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = zu.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
M.update = function (a: any, sim: any) { const c = mu.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
const r2 = (v: number) => Math.round(v * 100) / 100;
let found: any = null;
P.tick = function () {
  if (this.__pt === undefined) {
    this.__pt = !found && this.offCall?.pass?.id?.startsWith(concept) && this.defCall?.coverage?.id === coverage && this.down === Number(down) ? { rows: [] } : null;
    // ARM=<FLAG>: switch that flag on for this play only (the game up to the snap is identical in both arms).
    if (this.__pt && process.env.ARM) process.env[process.env.ARM] = '1';
    if (this.__pt) found = { concept: this.offCall.pass.id, coverage, down: this.down, label: this.defCall.label, numbering: { ...this.offAlign.numbering }, rows: this.__pt.rows };
  }
  const res = tick0.call(this);
  const st = this.__pt;
  if (!st || st.done) return res;
  const k = Math.round(this.t * 10);
  if (st.rows.length && st.rows.at(-1).k === k) return res;
  const dir = this.attackDir('O');
  const P2 = (a: any) => ({ x: r2((a.pos.x - this.los) * dir), y: r2(a.pos.y), w: r2(Math.min(a.pos.y, FIELD_WIDTH - a.pos.y)), vx: r2(a.vel.x * dir), vy: r2(a.vel.y), f: r2(Math.cos(a.body.facing - (dir > 0 ? 0 : Math.PI))) });
  st.rows.push({ k, ball: this.ball.kind, phase: this.phase,
    D: this.defense.map((d: any) => { const b: any = d.behavior; const sub = b instanceof CoverageDefender ? (b as any).sub : b;
      return { s: d.slot, ...P2(d), kind: b?.kind, job: b instanceof CoverageDefender ? b.job : undefined, mode: (b as any)?.state?.mode, tech: label.get(d), tgt: sub?.target?.slot, hips: sub?.hipsOpen, read: d.recog?.read }; }),
    O: this.offense.filter((o: any) => !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)).map((o: any) => ({ s: o.slot, ...P2(o), kind: o.behavior?.kind, route: o.behavior?.route?.id })) });
  if (this.phase !== 'live' || k > 60) { st.done = true; if (process.env.ARM) delete process.env[process.env.ARM]; }
  return res;
};
const rng = new Rng(Number(teamSeed));
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const g = Number(gameSeed);
if (ls === '1') simulateGame(leagueSample(home, g), leagueSample(away, g), { seed: g, record: true, recordLevel: 'light' });
else simulateGame(home, away, { seed: g, record: true, recordLevel: 'light' });
writeFileSync(out, JSON.stringify(found));
console.log(found ? `${found.label} ${found.concept} rows ${found.rows.length}` : 'not found');
