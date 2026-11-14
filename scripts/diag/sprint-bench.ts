/** Lone-body sprint bench: a full-speed straight request through the real movement law.
 *
 * Question: does a body that asks for full speed in a straight line reach the speed the law
 * says it should, from rest and from 3, 4.5, 6 yd/s, at energy 1.0 and 0.75, and where does
 * that sit against 10-yard-split data? No play, no opponent, no contact: any gap seen in a
 * play that is absent here belongs to the play (something is taxing the body).
 *
 *   node --import tsx scripts/diag/sprint-bench.ts [--out out/sprint-bench.json]
 *
 * Three integrations are compared per case: the law's own closed form (V - (V - v0) e^(-t/tau)),
 * `stepBody` (locomotionAccel plus the traction clamp, DT 0.05, energy spent as in play) and a
 * lone `World.step` (the real world path). Energy is held at the case value for the speed curves
 * (spendEnergy is switched off by restoring the energy each step), and a separate row shows what
 * a full run spends. */
import { writeFileSync, mkdirSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { DT } from '../../src/core/units.js';
import { generatePlayer } from '../../src/players/generator.js';
import { derivePhysical, solveSprint, sprintDistance, GAME_BURST, type PhysicalProfile } from '../../src/players/physical.js';
import { directionalSpeedFactor, fatigueFactor, stepBody, type Body } from '../../src/physics/kinematics.js';
import { World } from '../../src/physics/world.js';
import { newSupport } from '../../src/physics/support.js';
import type { Position } from '../../src/players/types.js';

const args = process.argv.slice(2);
const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'out/sprint-bench.json';

// --- combine medians (BDB 2027 combine_results.csv) -------------------------------------
function combineMedians(): Record<string, { n: number; ten: number; forty: number; lb: number; in: number }> {
  const root = 'data/raw/kaggle/nfl-big-data-bowl-2027';
  if (!existsSync(root)) return {};
  const dir = readdirSync(root).map((d) => join(root, d)).find((d) => existsSync(join(d, 'combine_results.csv')));
  if (!dir) return {};
  const lines = readFileSync(join(dir, 'combine_results.csv'), 'utf8').trim().split('\n');
  const head = lines[0].split(',').map((s) => s.replace(/"/g, ''));
  const ix = (k: string) => head.indexOf(k);
  const by = new Map<string, number[][]>();
  for (const line of lines.slice(1)) {
    const c = line.split(',').map((s) => s.replace(/"/g, ''));
    const v = ['ten_yd_split', 'forty', 'combine_weight', 'combine_height'].map((k) => Number(c[ix(k)]));
    if (v.some((x) => !Number.isFinite(x))) continue;
    const pos = c[ix('combine_position')];
    (by.get(pos) ?? by.set(pos, []).get(pos)!).push(v);
  }
  const med = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const out: Record<string, { n: number; ten: number; forty: number; lb: number; in: number }> = {};
  for (const [pos, rows] of by) out[pos] = { n: rows.length, ten: med(rows.map((r) => r[0])), forty: med(rows.map((r) => r[1])), lb: med(rows.map((r) => r[2])), in: med(rows.map((r) => r[3])) };
  return out;
}
const COMBINE = combineMedians();

// --- profiles ----------------------------------------------------------------------------
function profileFor(position: Position, m: { ten: number; forty: number; lb: number; in: number } | null, seed = 1): { profile: PhysicalProfile; measurables: { ten: number; forty: number; lb: number } } {
  const player = generatePlayer(new Rng(seed), position, { quality: 0.5 });
  if (m) Object.assign(player.measurables, { tenSplit: m.ten, forty: m.forty, weightLb: m.lb, heightIn: m.in });
  const mm = player.measurables;
  return { profile: derivePhysical(player), measurables: { ten: mm.tenSplit, forty: mm.forty, lb: mm.weightLb } };
}

// LB is not in the BDB 2027 combine table (DB, OL, DL, WR, TE): the sim's own median LB.
const lbSamples = Array.from({ length: 200 }, (_, k) => generatePlayer(new Rng(1000 + k), 'LB', { quality: 0.5 }).measurables);
const medOf = (f: (m: typeof lbSamples[number]) => number) => { const s = lbSamples.map(f).sort((a, b) => a - b); return s[s.length >> 1]; };
const LB_SIM = { n: lbSamples.length, ten: medOf((m) => m.tenSplit), forty: medOf((m) => m.forty), lb: medOf((m) => m.weightLb), in: medOf((m) => m.heightIn) };

const CASES: { name: string; position: Position; m: typeof LB_SIM; source: string }[] = [];
if (COMBINE.DB) CASES.push({ name: 'DB', position: 'CB', m: COMBINE.DB, source: `BDB 2027 combine median, n=${COMBINE.DB.n}` });
CASES.push({ name: 'LB', position: 'LB', m: LB_SIM, source: `sim generator median at quality .5, n=${LB_SIM.n} (no LB in combine_results.csv)` });

// --- integrators -------------------------------------------------------------------------
const T_END = 2, STARTS = [0, 3, 4.5, 6], ENERGIES = [1, 0.75], MARKS = [0.5, 1, 1.5, 2];
const mkBody = (profile: PhysicalProfile, v0: number, energy: number): Body => ({ pos: { x: 0, y: 0 }, vel: { x: v0, y: 0 }, facing: 0, energy, profile, support: newSupport(0.2) });

function runStepBody(profile: PhysicalProfile, v0: number, energy: number, holdEnergy: boolean) {
  const b = mkBody(profile, v0, energy);
  const trace: { t: number; v: number; x: number; e: number }[] = [{ t: 0, v: v0, x: 0, e: energy }];
  for (let k = 1; k <= Math.round(T_END / DT); k++) {
    stepBody(b, { vel: { x: profile.vmax, y: 0 }, effort: 1 }, DT);
    if (holdEnergy) b.energy = energy;
    trace.push({ t: k * DT, v: b.vel.x, x: b.pos.x, e: b.energy });
  }
  return trace;
}

function runWorld(profile: PhysicalProfile, v0: number, energy: number) {
  const b = mkBody(profile, v0, energy);
  const w = new World([b], {});
  const trace: { t: number; v: number; x: number }[] = [{ t: 0, v: v0, x: 0 }];
  for (let k = 1; k <= Math.round(T_END / DT); k++) {
    w.step([{ vel: { x: profile.vmax, y: 0 }, effort: 1 }], DT);
    b.energy = energy;
    trace.push({ t: k * DT, v: b.vel.x, x: b.pos.x });
  }
  return trace;
}

const at = <T extends { t: number }>(tr: T[], t: number) => tr[Math.min(tr.length - 1, Math.round(t / DT))];
const law = (p: PhysicalProfile, v0: number, energy: number, t: number) => {
  const cap = p.vmax * fatigueFactor(energy);
  return cap - (cap - v0) * Math.exp(-t / p.tau);
};
/** Time for the closed-form curve to cover `yd` from rest. */
const timeToDistance = (tr: { t: number; x: number }[], yd: number) => {
  for (let k = 1; k < tr.length; k++) if (tr[k].x >= yd) return tr[k - 1].t + DT * (yd - tr[k - 1].x) / (tr[k].x - tr[k - 1].x);
  return NaN;
};

const report: Record<string, unknown> = { gameBurst: GAME_BURST, dt: DT, cases: {} };
const lines: string[] = [];
for (const c of CASES) {
  const { profile, measurables } = profileFor(c.position, c.m);
  const combineCurve = solveSprint(measurables.ten, measurables.forty);
  const tauScale = profile.tau / combineCurve.tau, vScale = profile.vmax / combineCurve.vmax;
  lines.push(`\n== ${c.name} (${c.source}) ==`);
  lines.push(`combine: ten ${measurables.ten.toFixed(2)} s, forty ${measurables.forty.toFixed(2)} s, ${measurables.lb.toFixed(0)} lb -> sprint V ${combineCurve.vmax.toFixed(2)} yd/s, tau ${combineCurve.tau.toFixed(3)} s, a0 = V/tau ${(combineCurve.vmax / combineCurve.tau).toFixed(2)} yd/s^2`);
  lines.push(`in-game profile: vmax ${profile.vmax.toFixed(2)} (x${vScale.toFixed(3)}), tau ${profile.tau.toFixed(3)} s (x${tauScale.toFixed(3)} = gameSpeed x GAME_BURST ${GAME_BURST}), a0 = ${(profile.vmax / profile.tau).toFixed(2)} yd/s^2, mass ${profile.massKg.toFixed(0)} kg`);
  const rows: unknown[] = [];
  lines.push(`speed (yd/s) at ${MARKS.map((t) => t + ' s').join(' | ')}    [law closed form / stepBody / World]`);
  for (const e of ENERGIES) for (const v0 of STARTS) {
    const sb = runStepBody(profile, v0, e, true), wd = runWorld(profile, v0, e);
    const cells = MARKS.map((t) => ({ t, law: law(profile, v0, e, t), stepBody: at(sb, t).v, world: at(wd, t).v }));
    rows.push({ energy: e, v0, cells });
    lines.push(`e=${e.toFixed(2)} v0=${String(v0).padEnd(3)}  ` + cells.map((q) => `${q.law.toFixed(2)}/${q.stepBody.toFixed(2)}/${q.world.toFixed(2)}`).join('  '));
  }
  // 10-yard splits from rest: combine curve vs in-game law vs the integrators.
  const sb0 = runStepBody(profile, 0, 1, true), wd0 = runWorld(profile, 0, 1);
  const tenCombine = measurables.ten, tenLaw = (() => { let lo = 0, hi = 6; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (sprintDistance(mid, profile.vmax, profile.tau) < 10 ? (lo = mid) : (hi = mid)); } return (lo + hi) / 2; })();
  const longRun = (() => { const b = mkBody(profile, 0, 1); const tr: { t: number; x: number }[] = [{ t: 0, x: 0 }]; for (let k = 1; k <= 200; k++) { stepBody(b, { vel: { x: profile.vmax, y: 0 }, effort: 1 }, DT); b.energy = 1; tr.push({ t: k * DT, x: b.pos.x }); } return tr; })();
  const split = { combineData: tenCombine, inGameLawClosedForm: tenLaw, stepBody: timeToDistance(longRun, 10), forty_combine: measurables.forty, forty_inGameLaw: (() => { let lo = 0, hi = 12; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; (sprintDistance(mid, profile.vmax, profile.tau) < 40 ? (lo = mid) : (hi = mid)); } return (lo + hi) / 2; })() };
  lines.push(`10 yd from rest (s): combine data ${split.combineData.toFixed(2)} | in-game law ${split.inGameLawClosedForm.toFixed(2)} | stepBody ${split.stepBody.toFixed(2)}    40 yd: combine ${split.forty_combine.toFixed(2)} | in-game law ${split.forty_inGameLaw.toFixed(2)}`);
  lines.push(`speed at 0.5/1/1.5/2 s from rest on the COMBINE curve (what the 10-yd data implies): ${MARKS.map((t) => (combineCurve.vmax * (1 - Math.exp(-t / combineCurve.tau))).toFixed(2)).join(' / ')}`);
  // What a full run spends: energy after 2, 4, 6 s of full-speed running from rest, energy not held.
  const spend = (() => { const b = mkBody(profile, 0, 1); const out: Record<string, number> = {}; for (let k = 1; k <= 120; k++) { stepBody(b, { vel: { x: profile.vmax, y: 0 }, effort: 1 }, DT); if (k % 40 === 0) out[(k * DT).toFixed(0) + 's'] = b.energy; } return out; })();
  lines.push(`energy after a full-speed run from rest, not held: ${Object.entries(spend).map(([t, e]) => `${t} ${e.toFixed(2)}`).join(', ')}`);
  lines.push(`fatigueFactor(1.0)=${fatigueFactor(1).toFixed(4)} fatigueFactor(0.75)=${fatigueFactor(0.75).toFixed(4)} fatigueFactor(0.5)=${fatigueFactor(0.5).toFixed(4)} fatigueFactor(0.25)=${fatigueFactor(0.25).toFixed(4)}`);
  (report.cases as Record<string, unknown>)[c.name] = { source: c.source, combine: measurables, combineCurve, profile: { vmax: profile.vmax, tau: profile.tau, a0: profile.vmax / profile.tau, massKg: profile.massKg }, rows, split, spend };
}

// --- facing sweep: the same full-speed request along +x while his hips face another way ------
// A body that looks elsewhere while running keeps his start force but his top speed in that direction
// is vmax x directionalSpeedFactor(angle between facing and travel). Speed against time, v0 = 4.5, energy 0.75.
{
  const facingRows: Record<string, unknown> = {};
  for (const c of CASES) {
    const { profile } = profileFor(c.position, c.m);
    lines.push(`\n== ${c.name}: facing offset vs travel, request ${profile.vmax.toFixed(2)} yd/s along +x, v0 4.5, energy 0.75; speed at ${MARKS.join('/')} s [cap = vmax x fatigue x directional factor] ==`);
    const out: unknown[] = [];
    for (const deg of [0, 30, 60, 90, 135, 180]) {
      const b = mkBody(profile, 4.5, 0.75); b.facing = (deg * Math.PI) / 180; const tr: number[] = [4.5];
      for (let k = 1; k <= Math.round(T_END / DT); k++) { stepBody(b, { vel: { x: profile.vmax, y: 0 }, facing: (deg * Math.PI) / 180, effort: 1 }, DT); b.energy = 0.75; tr.push(b.vel.x); }
      const cap = profile.vmax * fatigueFactor(0.75) * directionalSpeedFactor(profile, (deg * Math.PI) / 180);
      const cells = MARKS.map((t) => tr[Math.round(t / DT)]);
      out.push({ deg, cap, cells });
      lines.push(`facing ${String(deg).padStart(3)} deg: cap ${cap.toFixed(2)}  ` + cells.map((v) => v.toFixed(2)).join(' / '));
    }
    facingRows[c.name] = out;
  }
  report.facing = facingRows;
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 1));
console.log(lines.join('\n'));
