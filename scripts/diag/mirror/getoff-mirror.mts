// LINE_START mirror asymmetry (Run Game for Integration, 2026-11-16): the read compiler's offence-only sample
// (features.ts sampleRoutes: defence parked 60 yd downfield at y = 1), run flipped and not; every skill player's
// position, velocity, facing and command (vel, drive) per tick in the ball-relative mirrored frame (y * strongSign),
// and the first tick and term where a mirrored pair differs.
//   node scripts/ref.mjs -- npx tsx scripts/diag/mirror/getoff-mirror.mts [concept=pa_flood] [formation=gun_doubles_11]
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const concept = PASS_BY_ID[process.argv[2] ?? 'pa_flood'], formation = FORMATION_BY_ID[process.argv[3] ?? 'gun_doubles_11'];
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
const BALL_Y = process.env.BALL_Y !== undefined ? Number(process.env.BALL_Y) : 26.65; // compiler sample's ballY; CENTER_Y = 26.6667
const PARK_Y = process.env.PARK_Y !== undefined ? Number(process.env.PARK_Y) : null;
function sample(flip: boolean) {
  const off = generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def = generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
  const sim: any = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
    offCall: { formation, flip, kind: 'pass', pass: concept, label: concept.id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'none' },
    los: 40, ballY: BALL_Y, firstDownX: 50, seed: 1 } as any);
  sim.throwBall = () => undefined;
  // RESPOT=1 (probe arm): every body back on its alignment spot after construction (removes the absolute-y
  // placement error and the press back-off it triggers), and the pre-snap picture re-recorded there.
  if (process.env.RESPOT === '1') {
    for (const a of sim.agents) { const sp = (a.team === 'O' ? sim.offAlign : sim.defAlign).spots[a.slot]; if (sp) { a.body.pos = { ...sp.pos }; if (a.behavior && "start" in a.behavior) (a.behavior as any).start = { ...sp.pos }; } }
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, null);
  }
  const ss = sim.offAlign.strongSign;
  const park = () => sim.defense.forEach((d: any, i: number) => { d.body.pos = { x: sim.los + 60 + i * 2, y: PARK_Y === null ? 1 : sim.ballY + ss * PARK_Y }; d.body.vel = { x: 0, y: 0 }; });
  park();
  if (process.env.COMPILE_PICTURE !== '0') for (let i = 0; i < 12; i++) sim.perception.record(sim.agents, null);
  const skill = sim.offense.filter((a: any) => a !== sim.qb && !OL.has(a.slot));
  const cmds = new Map<any, any>();
  for (const a of skill) { const b = a.behavior, up = b.update.bind(b); b.update = (ag: any, s: any) => { const c = up(ag, s); cmds.set(ag, c); return c; }; }
  const rows: any[] = [];
  while (sim.phase === 'live' && sim.t <= 2.0 + 1e-9) {
    sim.tick(); park();
    rows.push(Object.fromEntries(skill.map((a: any) => { const c = cmds.get(a) ?? {}; return [a.slot, {
      x: a.pos.x - sim.los, y: (a.pos.y - sim.ballY) * ss, vx: a.vel.x, vy: a.vel.y * ss, f: Math.atan2(Math.sin(a.facing) * ss, Math.cos(a.facing)),
      cvx: c.vel?.x ?? 0, cvy: (c.vel?.y ?? 0) * ss, drive: c.drive ?? 1, cf: c.facing === undefined ? null : Math.atan2(Math.sin(c.facing) * ss, Math.cos(c.facing)),
      beh: a.behavior?.kind, tags: [...a.tags].sort().join(','),
      sd: a.behavior?.startDelay ?? null, rt: a.mind?.observationDelay?.(a.profile.reactionTime) ?? null,
      fs: a.behavior?.start ? Math.hypot(a.pos.x - a.behavior.start.x, a.pos.y - a.behavior.start.y) : null,
      decl: a.behavior?.stemDeclared ?? null, focus: a.mind?.focus ?? null, stress: a.mind?.stress ?? null }]; })));
  }
  return rows;
}
const A = sample(false), B = sample(true);
const terms = ['x', 'y', 'vx', 'vy', 'f', 'cvx', 'cvy', 'drive', 'cf', 'sd', 'rt', 'fs', 'focus', 'stress'];
let reported = 0;
for (let k = 0; k < Math.min(A.length, B.length) && reported < 8; k++) {
  for (const slot of Object.keys(A[k])) {
    const a = A[k][slot], b = B[k]?.[slot]; if (!b) continue;
    const bad = terms.filter((t) => a[t] !== null && b[t] !== null && Math.abs(a[t] - b[t]) > 1e-6);
    if (a.beh !== b.beh || a.tags !== b.tags) bad.push(`beh/tags ${a.beh}[${a.tags}] vs ${b.beh}[${b.tags}]`);
    if (bad.length) { console.log(`tick ${k + 1} (t ${(k + 1) * 0.05}) ${slot}: ${bad.map((t) => typeof t === 'string' && !terms.includes(t) ? t : `${t} ${a[t]?.toFixed?.(5)} vs ${b[t]?.toFixed?.(5)}`).join('; ')}`); reported++; }
  }
}
if (!reported) console.log('mirror-symmetric to 2.0 s');
if (process.env.SLOT) for (let k = 0; k < 14; k++) { const a = A[k][process.env.SLOT], b = B[k][process.env.SLOT];
  console.log(`  t ${((k + 1) * 0.05).toFixed(2)} ${process.env.SLOT}: fromStart ${a.fs?.toFixed(3)} / ${b.fs?.toFixed(3)} readTime ${a.rt?.toFixed(3)} / ${b.rt?.toFixed(3)} focus ${a.focus?.toFixed(3)} / ${b.focus?.toFixed(3)} stress ${a.stress?.toFixed(3)} / ${b.stress?.toFixed(3)} declared ${a.decl} / ${b.decl} drive ${a.drive.toFixed(3)} / ${b.drive.toFixed(3)}`); }
