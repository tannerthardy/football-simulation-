/**
 * G3 diagnosis: how the defender nearest the target reacts to a throw.
 *
 *   node --import tsx scripts/diag/throw-reaction.ts [games=3] [seed=7] > out/throw-reaction.txt
 *
 * For every targeted pass (not a throwaway), take the defender nearest the
 * target at the release and follow him through the flight: when he recognizes
 * the throw (the `onBall` tag), what he asks his body for (command speed and
 * heading), what his body does (speed, facing against travel), and how fast he
 * closes on the target and on the intended catch point. Bins are 0.1 s after
 * the release. Split by coverage family (zone/man) and depth off the ball at
 * the release (under/over 8 yd). The tracked side of the closing measure is
 * `air.defender_closing` in data/reviews/mechanics/nfl-bdb2022.json.
 */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';

interface Track {
  d: Agent; target: Agent; release: number; arrival: number; group: string; job: string;
  sepThrow: number; windupLead: number | null; recognized: number | null;
  rows: Array<{ dt: number; speed: number; cmdSpeed: number; cmdVsVel: number; faceVsVel: number; closeTarget: number; closePoint: number }>;
  sepArrival?: number;
}

const tracks: Track[] = [];
const angle = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
type Sim = PlaySim & { __track?: Track | null };
const cmdsOf = (sim: PlaySim) => (sim as unknown as { cmds: Array<{ vel: { x: number; y: number } }> }).cmds;

const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: Sim) {
  tick.call(this);
  const ball = this.ball;
  if (ball.kind === 'air' && this.__track === undefined) {
    this.__track = null;
    if (!ball.target || ball.throwaway) return;
    const T = ball.target;
    const d = this.defense.reduce((b, x) => (Math.hypot(x.pos.x - T.pos.x, x.pos.y - T.pos.y) < Math.hypot(b.pos.x - T.pos.x, b.pos.y - T.pos.y) ? x : b));
    const beh = d.behavior as { kind: string; job?: string };
    const man = beh.kind === 'man' || (beh.job ?? '').startsWith('man:');
    const deep = d.pos.x - this.los >= 8;
    this.__track = { d, target: T, release: ball.releaseT, arrival: ball.arrivalT, group: `${man ? 'man' : 'zone'}/${deep ? 'deep' : 'under'}`,
      job: beh.job ?? beh.kind, sepThrow: Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y),
      windupLead: this.windupAt >= 0 ? ball.releaseT - this.windupAt : null, recognized: null, rows: [] };
    tracks.push(this.__track);
  }
  const tr = this.__track;
  if (!tr) return;
  if (ball.kind !== 'air') {
    if (tr.sepArrival === undefined) tr.sepArrival = Math.hypot(tr.d.pos.x - tr.target.pos.x, tr.d.pos.y - tr.target.pos.y);
    return;
  }
  const { d, target } = tr;
  const dt = this.t - tr.release;
  if (tr.recognized === null && d.tags.has('onBall')) tr.recognized = dt;
  const v = d.vel, speed = Math.hypot(v.x, v.y);
  const cmd = cmdsOf(this)[d.idx]?.vel ?? { x: 0, y: 0 };
  const toT = { x: target.pos.x - d.pos.x, y: target.pos.y - d.pos.y }, lt = Math.hypot(toT.x, toT.y) || 1;
  const p = ball.intended, toP = { x: p.x - d.pos.x, y: p.y - d.pos.y }, lp = Math.hypot(toP.x, toP.y) || 1;
  const rel = { x: v.x - target.vel.x, y: v.y - target.vel.y };
  tr.rows.push({ dt, speed, cmdSpeed: Math.hypot(cmd.x, cmd.y),
    cmdVsVel: speed > 0.5 ? angle(Math.atan2(cmd.y, cmd.x), Math.atan2(v.y, v.x)) : NaN,
    faceVsVel: speed > 0.5 ? angle(d.facing, Math.atan2(v.y, v.x)) : NaN,
    closeTarget: (rel.x * toT.x + rel.y * toT.y) / lt, closePoint: (v.x * toP.x + v.y * toP.y) / lp });
};

const [games = 3, seed = 7] = process.argv.slice(2).map(Number);
const home = generateTeam(new Rng(seed * 2 + 11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(seed * 2 + 12), 'Away', 'AWY', { strength: 0.6 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed * 100 + g });

const mean = (xs: number[]) => { const f = xs.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : NaN; };
const med = (xs: number[]) => { const f = xs.filter(Number.isFinite).sort((a, b) => a - b); return f.length ? f[Math.floor(f.length / 2)] : NaN; };
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : '  — ');
console.log(`throws ${tracks.length} (games ${games}, seed ${seed})`);
for (const group of ['zone/under', 'zone/deep', 'man/under', 'man/deep', 'all']) {
  const ts = tracks.filter(t => group === 'all' || t.group === group);
  if (!ts.length) continue;
  const done = ts.filter(t => t.sepArrival !== undefined);
  console.log(`\n== ${group}: n ${ts.length}; sep at throw ${f2(mean(ts.map(t => t.sepThrow)))}, at arrival ${f2(mean(done.map(t => t.sepArrival!)))}, closing ${f2(mean(done.map(t => t.sepThrow - t.sepArrival!)))};`
    + ` recognized ${(100 * ts.filter(t => t.recognized !== null).length / ts.length).toFixed(0)}% at median +${f2(med(ts.map(t => t.recognized ?? NaN)))} s;`
    + ` windup→release median ${f2(med(ts.map(t => t.windupLead ?? NaN)))} s`);
  console.log('  dt   speed  cmd  cmd∠vel face∠vel  close→rcv  close→pt  recog%');
  for (let b = 0; b <= 10; b++) {
    const rows = ts.flatMap(t => t.rows.filter(r => r.dt >= b * 0.1 - 0.025 && r.dt < b * 0.1 + 0.025).map(r => ({ r, t })));
    if (rows.length < 5) continue;
    const rec = rows.filter(({ r, t }) => t.recognized !== null && t.recognized <= r.dt).length / rows.length;
    console.log(`  ${(b * 0.1).toFixed(1)}  ${f2(mean(rows.map(x => x.r.speed)))}  ${f2(mean(rows.map(x => x.r.cmdSpeed)))}  ${f2(mean(rows.map(x => x.r.cmdVsVel))).padStart(6)}  ${f2(mean(rows.map(x => x.r.faceVsVel))).padStart(6)}`
      + `  ${f2(mean(rows.map(x => x.r.closeTarget))).padStart(8)}  ${f2(mean(rows.map(x => x.r.closePoint))).padStart(8)}  ${(100 * rec).toFixed(0).padStart(5)}`);
  }
  const jobs = new Map<string, number>();
  for (const t of ts) { const k = t.job.split(':')[0]; jobs.set(k, (jobs.get(k) ?? 0) + 1); }
  console.log('  jobs at release:', [...jobs.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', '));
}
