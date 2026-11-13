// node --import tsx scripts/diag/eyes/placed-rusher.ts <hotLook 0|1> [FLAG=value ...]
// A free rusher placed in his field of view once he sets: the deepest defender, unblocked, 4 yd from him, 35 degrees off
// his body facing, already closing at 5 yd/s, as a blitzer. Does his alarm fire (felt time under 0.45 s) before the man
// is on him? Read "sacked" and "sacked with no alarm", not the alarm count: with an honest picture he throws before he needs it. The failing witness for his feel moving onto track() (PERCEIVE_TRACK 1b) and for
// FREE_BOUND. Stack flags come from the reference stack file; overrides from argv.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
process.env.HOT_LOOK = process.argv[2] ?? '0';
for (const kv of process.argv.slice(3)) { const [k, v] = kv.split('='); process.env[k] = v; }
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const { Blitzer } = await import('../../../src/sim/behaviors/defense.js');
const PANEL: [string, string, number, boolean][] = [
  ['post_cross', 'cover1', 2, false], ['post_cross', 'cover1', 3, false], ['post_cross', 'cover3', 2, false], ['dagger', 'cover3', 3, false],
  ['drive', 'cover3', 2, false], ['drive', 'cover3', 3, false], ['comebacks', 'cover1', 2, false], ['hitch_cross', 'cover1', 3, false],
  ['seam_hitch', 'cover1', 4, false], ['smash', 'cover1', 3, false], ['corner_flat', 'cover1', 4, true], ['dagger', 'cover1', 4, true],
];
let al = 0, lk = 0, staged = 0, sk = 0, skNo = 0;
for (const [concept, coverage, seed, flip] of PANEL) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
  let qb: any = null, done = false; const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    // The staging: once he is set, the deepest defender is placed unblocked 4 yd from him, wide of him at his depth,
    // coming at him as a blitzer. Nothing in the protection decides whether he arrives.
    if (!done && qb && sim.carrier === sim.qb && qb.phase === 'set') {
      done = true; staged++;
      const q = sim.qb, d = [...sim.defense].sort((x: any, y: any) => y.pos.x - x.pos.x)[0];
      // In his field of view: 4 yd from him, 35 degrees off the way his body faces (to the side nearer the middle of
      // the field), already coming at him at 5 yd/s. Known artifact: placing him moves him in one tick, so for one
      // perception delay (0.1-0.3 s) a picture still shows his old spot; that hurts the arm with the longer delay more.
      // Placing him farther out (9 yd, 75 degrees) removes it but he is then picked up or arrives after the throw on
      // most plays, so it no longer stages a free man; the near placement is kept and the artifact is read around.
      const side = q.pos.y > sim.ballY ? -1 : 1, ang = q.body.facing + side * 35 * Math.PI / 180;
      const px = Math.min(q.pos.x + 4 * Math.cos(ang), sim.los - 3.5), py = q.pos.y + 4 * Math.sin(ang);
      const L = Math.hypot(q.pos.x - px, q.pos.y - py) || 1;
      d.body.pos = { x: px, y: py };
      d.body.vel = { x: (q.pos.x - px) / L * 5, y: (q.pos.y - py) / L * 5 };
      d.behavior = new (Blitzer as any)(d, sim, 'C', side);
    }
  };
  const res = sim.run(); const p = qb?.hotPick;
  if (res.stats.sacked) { sk++; if (qb?.alarmAt == null) skNo++; }
  al += qb?.alarmAt != null ? 1 : 0; lk += (qb?.hotLooks ?? 0) > 0 ? 1 : 0;
  console.log(`${concept.padEnd(12)} ${coverage} s${seed}${flip ? ' flip' : '     '} alarm ${qb?.alarmAt != null ? qb.alarmAt.toFixed(2) : '  - '} looks ${qb?.hotLooks ?? 0} pick ${p ? `dt ${(p.t - p.alarmAt).toFixed(2)} gaze ${p.gazeOff.toFixed(0)} looked ${p.looked}` : '-'} | throw ${res.stats.timeToThrow ?? '-'} sacked ${res.stats.sacked}`);
}
console.log(`staged ${staged}, alarmed ${al}, with a look ${lk}, sacked ${sk}, sacked with no alarm ${skNo}`);
