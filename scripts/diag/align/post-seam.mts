/** MAN_SLOT residue (1): the cover-1 post safety against a slot seam. On slot-man.mts's fixture (cover1_off and
 * cover1_lurk, gun_spread_10, 1st & 10 and 3rd & 5, seeds 1..N x flips), for #2 seam / go routes: the free safety's
 * depth past the line, his lateral offset from #2, his speed and his closing rate on #2, his facing off the QB, and his
 * behaviour's kind, at the snap + 1.0 s, at the throw, the throw + 0.3 s and the arrival; when he first saw the flight
 * (throwSight) relative to the release; and whether the ball went to #2.
 *   MAN_SLOT=1 node --import tsx post-seam.mts [seeds] */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 12);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const CONCEPTS = ['four_verts', 'seam_slant', 'verts_hitch', 'hitch_post', 'post_cross', 'fade_flat', 'y_cross', 'stick', 'mesh'];
const deg = (r: number) => Math.abs(Math.atan2(Math.sin(r), Math.cos(r))) * 180 / Math.PI;
const rows: any[] = [];
for (const id of CONCEPTS) for (const cov of ['cover1_off', 'cover1_lurk']) for (const [down, dist] of [[1, 10], [3, 5]]) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  const formation = FORMATION_BY_ID.gun_spread_10, c = PASS_BY_ID[id];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: c, label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 35 + dist, down, seed: 1000 * seed + 7 + (flip ? 1 : 0) });
  const sideOf = (['S', 'W'] as const).find((sd) => { const r = sim.offAlign.numbering[`${sd}2`]; return r && !sim.offAlign.spots[r].inline; });
  if (!sideOf) continue;
  const route = (sideOf === 'S' ? c.strong : c.weak)?.[2] ?? '?';
  if (!/seam|go/.test(route)) continue;
  const two = sim.slot(sim.offAlign.numbering[`${sideOf}2`]), fs = sim.defense.find((d: any) => d.slot === 'FS');
  if (!fs) continue;
  const snap = (tag: string) => {
    const dx = two.pos.x - fs.pos.x, dy = two.pos.y - fs.pos.y, d = Math.hypot(dx, dy) || 1;
    return { tag, depth: fs.pos.x - sim.los, lat: Math.abs(fs.pos.y - two.pos.y), over: fs.pos.x - two.pos.x, sp: Math.hypot(fs.vel.x, fs.vel.y), close: (fs.vel.x * dx + fs.vel.y * dy) / d,
      offQB: deg(fs.facing - Math.atan2(sim.qb.pos.y - fs.pos.y, sim.qb.pos.x - fs.pos.x)), offTwo: deg(fs.facing - Math.atan2(dy, dx)), kind: fs.behavior?.kind, dist: d };
  };
  const at: any = {}; let rel = NaN, target: any = null;
  while (sim.phase !== 'dead' && sim.t < 8) {
    if (sim.ball.kind === 'air' && !target) { target = sim.ball.target; rel = sim.t; at.throw = snap('throw'); }
    sim.tick();
    if (!at.s10 && sim.t >= 1.0 - 1e-9) at.s10 = snap('s10');
    if (target && !at.t3 && sim.t >= rel + 0.3 - 1e-9) at.t3 = snap('t3');
    if (target && !at.arr && sim.ball.kind !== 'air') at.arr = snap('arr');
  }
  const seen = sim.throwSight?.seenAt?.(fs);
  rows.push({ id, cov, route, toTwo: target === two, seenLag: seen !== undefined && Number.isFinite(rel) ? seen - rel : undefined, ...Object.fromEntries(Object.entries(at).map(([k, v]: any) => [k, v])) });
}
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const T = rows.filter((r) => r.toTwo);
console.log(`== MAN_SLOT=${process.env.MAN_SLOT ?? 0}: #2 seam/go plays n ${rows.length}, thrown to #2 ${T.length}`);
for (const [lab, R] of [['thrown to #2', T], ['all seam plays', rows]] as const) {
  console.log(` -- ${lab}`);
  for (const k of ['s10', 'throw', 't3', 'arr']) {
    const V = R.map((r: any) => r[k]).filter(Boolean);
    if (!V.length) continue;
    console.log(`   ${k.padEnd(5)} FS depth ${q(V.map((v: any) => v.depth))} | over #2 ${q(V.map((v: any) => v.over))} | lateral off #2 ${q(V.map((v: any) => v.lat))} | to #2 ${q(V.map((v: any) => v.dist))} | speed ${q(V.map((v: any) => v.sp))} closing on #2 ${q(V.map((v: any) => v.close))} | facing off QB ${q(V.map((v: any) => v.offQB))} off #2 ${q(V.map((v: any) => v.offTwo))} | kinds ${[...new Set(V.map((v: any) => v.kind))].join(',')}`);
  }
  console.log(`   FS first saw the flight, after the release: ${q(R.map((r: any) => r.seenLag))} s (never ${R.filter((r: any) => r.seenLag === undefined).length})`);
}
