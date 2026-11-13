/**
 * Constructed scene for Run Game's #164 follow-up: does contact hold a climber
 * that leaves a double while still pressed on the DL?
 *
 * One released climber (C) and the DL he left (DT_W), everyone else parked and
 * idle; no engagement, no joint. C starts in torso contact (centres 0.70 yd,
 * radius sum ~0.69), squared to the DL, and asks to climb along the DL's face
 * (perpendicular to the line between them) at 5.8 yd/s: the median native
 * pressed request (cos into DL ~0). Arms differ only in the DL's command:
 *   none     DL parked 30 yd away (free acceleration control)
 *   passive  DL stands (contact friction / residue only)
 *   drive    DL drives into C at 2.4 yd/s, push 1 (native median for pressed
 *            releases still in contact: DL intent into the climber 2.4 yd/s)
 *   away     DL drives off C at 2.4 yd/s (opposing control)
 * Output: C speed, distance, contact impulse, time to 1.5 yd apart.
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { stand } from '../../../src/sim/behaviors/common.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const LOS = 40, formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
type Arm = 'none' | 'passive' | 'drive' | 'away';

function run(arm: Arm, gap = .70, req = 5.8, along = 1, v0 = 0) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) } as any; a.snapReadyAt = 0;
  }
  const c = sim.slot('C')!, dl = sim.slot('DT_W')!, rb = sim.slot('RB')!;
  c.body.pos = { x: LOS, y: CENTER_Y }; c.body.vel = { x: v0, y: 0 }; c.body.facing = 0;
  if (arm !== 'none') { dl.body.pos = { x: LOS + gap, y: CENTER_Y }; dl.body.facing = Math.PI; }
  rb.body.pos = { x: LOS - 6, y: CENTER_Y + 8 };
  // Climb along the DL's face: +y, with `along` mixing in the x (into DL) component when < 1.
  const dir = { x: Math.sqrt(Math.max(0, 1 - along * along)), y: along };
  c.behavior = { kind: 'climb-script', update: () => ({ vel: { x: dir.x * req, y: dir.y * req }, facing: Math.atan2(dir.y, dir.x) }) } as any;
  const into = arm === 'drive' ? -1 : arm === 'away' ? 1 : 0;
  dl.behavior = { kind: 'dl-script', update: () => {
    if (!into) return stand(Math.PI);
    const ux = c.pos.x - dl.pos.x, uy = c.pos.y - dl.pos.y, d = Math.hypot(ux, uy) || 1;
    return { vel: { x: -into * 2.4 * ux / d, y: -into * 2.4 * uy / d }, facing: Math.PI, push: 1 };
  } } as any;
  sim.ball = { kind: 'held', carrier: rb } as typeof sim.ball;
  sim.phase = 'live' as any;
  const y0 = c.pos.y; const out: { t: number; s: number; d: number; imp: number; prog: number }[] = []; let off15: number | null = null;
  for (let k = 0; k < 12; k++) {
    sim.tick();
    const d = Math.hypot(c.pos.x - dl.pos.x, c.pos.y - dl.pos.y);
    const imp = (sim.lastStep?.contacts ?? []).filter((q: any) => (q.i === c.idx && q.j === dl.idx) || (q.j === c.idx && q.i === dl.idx)).reduce((s: number, q: any) => s + q.impulse, 0);
    out.push({ t: (k + 1) * sim.dt, s: Math.hypot(c.vel.x, c.vel.y), d, imp, prog: c.pos.y - y0 });
    if (off15 === null && d >= 1.5) off15 = (k + 1) * sim.dt;
  }
  return { out, off15, joints: sim.world.joints.length, eng: !!c.engagement || !!dl.engagement };
}

const f = (x: number) => x.toFixed(2);
for (const v0 of [0, .45]) for (const along of [1, .95]) for (const arm of ['none', 'passive', 'drive', 'away'] as Arm[]) {
  const r = run(arm, .70, 5.8, along, v0);
  const at = (t: number) => r.out.find(o => o.t >= t - 1e-9)!;
  console.log(`v0 ${v0} ${along === 1 ? 'tangent' : '18deg in'} ${arm.padEnd(7)} speed .1/.2/.3/.6 ${f(at(.1).s)} ${f(at(.2).s)} ${f(at(.3).s)} ${f(at(.6).s)} | dist .1/.3/.6 ${arm === 'none' ? '  -' : `${f(at(.1).d)} ${f(at(.3).d)} ${f(at(.6).d)}`} | impulse 0-0.3 ${f(r.out.filter(o => o.t <= .3 + 1e-9).reduce((s, o) => s + o.imp, 0))} | climb progress .3/.6 ${f(at(.3).prog)} ${f(at(.6).prog)} | 1.5 off ${r.off15 ?? '-'} | joints ${r.joints} eng ${r.eng}`);
}
