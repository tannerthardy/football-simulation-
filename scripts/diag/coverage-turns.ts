/**
 * COV-6: which coverage technique asks for the big fast turns.
 *   node --import tsx scripts/diag/coverage-turns.ts [seed] [--games 2] [--raw]
 * Same windows as yaw-sim.ts (LB/DB after the snap, 10 Hz, speed from
 * positions, 90°+ body swing within 0.2 s), plus the travel-direction change
 * over the same window and the facing technique that asked at each end.
 * --raw passes technique requests straight to the motor (develop's behavior
 * before the orientation technique), for a same-operator comparison.
 */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { CoverageOrientation, facingTechnique } from '../../src/sim/coverage/orientation.js';
import type { MoveCommand } from '../../src/physics/kinematics.js';
import type { Agent } from '../../src/sim/agent.js';

const argv = process.argv.slice(2);
const gi = argv.indexOf('--games');
const games = gi >= 0 ? Number(argv[gi + 1]) || 1 : 2;
const seed = Number(argv.find((a, i) => !a.startsWith('--') && (gi < 0 || i !== gi + 1)) ?? 7);
const raw = argv.includes('--raw');

const asked = new WeakMap<Agent, string>();
const steer = CoverageOrientation.prototype.steer;
CoverageOrientation.prototype.steer = function (a: Agent, now: number, dt: number, command: MoveCommand) {
  asked.set(a, facingTechnique(command)?.label ?? '');
  return raw ? command : steer.call(this, a, now, dt, command);
};

type Row = { t: number; x: number; y: number; o: number; label: string; kind: string; ball: string };
const paths: Row[][] = [];
let current = new Map<Agent, Row[]>();
const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: PlaySim) {
  const t = this.t;
  if (t <= 1e-9) current = new Map();
  for (const a of this.agents) asked.delete(a);
  tick.call(this);
  if (t < 0 || this.agents.length === 0) return;
  // 10 Hz, as the replay and the tracking data.
  if (Math.round(t / this.dt) % 2 !== 0) return;
  for (const a of this.defense) {
    if (/^(DE|DT|NT)/.test(a.slot)) continue;
    let rows = current.get(a);
    if (!rows) { rows = []; current.set(a, rows); paths.push(rows); }
    rows.push({ t, x: a.pos.x, y: a.pos.y, o: a.body.facing, label: asked.get(a) ?? '', kind: a.behavior.kind, ball: this.ball.kind });
  }
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });

const wrap = (d: number) => ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const deg = (r: number) => Math.abs(r) * 180 / Math.PI;
const BINS = [[0, 2], [2, 4], [4, 6], [6, 99]] as const;
const bins: Record<string, { windows: number; swings: number; travel90: number; labelled: number; labelledSwings: number }> = {};
const by: Record<string, number> = {};
const pairs: Record<string, number> = {};
const yaw: number[] = [], yawTechnique: number[] = [], yawOther: number[] = [];
const hot: Record<string, number> = {};
for (const rows of paths) {
  const speed = (k: number) => {
    const a = rows[Math.max(0, k - 1)], b = rows[Math.min(rows.length - 1, k + 1)];
    return Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1e-6, b.t - a.t);
  };
  const heading = (k: number) => Math.atan2(rows[k + 1].y - rows[k].y, rows[k + 1].x - rows[k].x);
  for (let k = 0; k + 2 < rows.length; k++) {
    if (Math.abs(rows[k + 2].t - rows[k].t - 0.2) > 1e-6) continue;
    const s = speed(k);
    const bin = BINS.find(([lo, hi]) => s >= lo && s < hi)!;
    const b = bins[`${bin[0]}-${bin[1]}`] ??= { windows: 0, swings: 0, travel90: 0, labelled: 0, labelledSwings: 0 };
    const swing = deg(wrap(rows[k + 2].o - rows[k].o));
    const moving = Math.hypot(rows[k + 1].x - rows[k].x, rows[k + 1].y - rows[k].y) > 0.1
      && Math.hypot(rows[k + 2].x - rows[k + 1].x, rows[k + 2].y - rows[k + 1].y) > 0.1;
    const travel = moving ? deg(wrap(heading(k + 1) - heading(k))) : 0;
    const label = rows[k].label || rows[k + 2].label;
    b.windows++;
    if (label) b.labelled++;
    if (travel >= 90) b.travel90++;
    if (bin[0] === 2) {
      const rate = deg(wrap(rows[k + 1].o - rows[k].o)) * 10;
      yaw.push(rate);
      (rows[k].label && rows[k + 1].label ? yawTechnique : yawOther).push(rate);
      if (rows[k].label && rate > 200) hot[rows[k].label] = (hot[rows[k].label] ?? 0) + 1;
    }
    if (swing < 90) continue;
    b.swings++;
    if (label) b.labelledSwings++;
    if (bin[0] !== 2 && bin[0] !== 4) continue;
    const owner = label ? (rows[k].label === rows[k + 2].label ? label : `${rows[k].label || '-'} > ${rows[k + 2].label || '-'}`)
      : `untechniqued:${rows[k].kind}/${rows[k].ball}`;
    by[owner] = (by[owner] ?? 0) + 1;
    if (label) pairs[travel < 30 ? 'body-only (travel <30°)' : 'with travel turn'] = (pairs[travel < 30 ? 'body-only (travel <30°)' : 'with travel turn'] ?? 0) + 1;
  }
}
const p90 = (v: number[]) => { v.sort((p, q) => p - q); return v.length ? +v[Math.floor(0.9 * v.length)].toFixed(1) : null; };
const report = {
  arm: raw ? 'raw requests' : 'orientation technique', seed, games,
  bins: Object.fromEntries(Object.entries(bins).map(([k, v]) => [`${k} yd/s`, { ...v,
    swingRate: +(v.swings / Math.max(1, v.windows)).toFixed(4),
    techniqueSwingRate: +(v.labelledSwings / Math.max(1, v.labelled)).toFixed(4),
    travel90Rate: +(v.travel90 / Math.max(1, v.windows)).toFixed(4) }])),
  yawP90DegS_2to4: { all: p90(yaw), technique: p90(yawTechnique), other: p90(yawOther), techniqueFrames: yawTechnique.length, otherFrames: yawOther.length },
  techniqueFramesOver200DegS_2to4: Object.fromEntries(Object.entries(hot).sort((p, q) => q[1] - p[1]).slice(0, 12)),
  swingsByTechnique_2to6: Object.fromEntries(Object.entries(by).sort((p, q) => q[1] - p[1])),
  techniqueSwingsBodyVsTravel_2to6: pairs,
};
console.log(JSON.stringify(report, null, 2));
