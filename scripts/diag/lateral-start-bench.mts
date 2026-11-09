/** Lateral stretch start vs straight start, lone body, same World as the game (previewFreeMovement).
 * Real OL bodies at the snap of a restaged outside-zone play: at rest, facing downfield, in their snap posture.
 * A steady request of `speed` yd/s (default 3.45, the free OZ lineman's track tempo) sideways with the hips
 * square / half open / fully open, and straight ahead for comparison. Reports achieved speed along the request.
 * usage: node --import tsx scripts/diag/lateral-start-bench.mts <out/matched-restage/seedN-run.json> [speed] */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
(PlaySim as any).recordedSingleStream = true;
const plays = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[];
const speed = Number(process.argv[3] ?? 3.45);
const p = plays.find(x => !x.pass && /outsideZone|wideZone/.test(restoreSetup(Buffer.from(x.setup, 'base64')).offCall?.run?.scheme ?? ''));
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
while (sim.t < 0) sim.tick();
const up = sim.attackDir('O');
console.log(`play ${p.id ?? '?'} (${sim.offCall.label}), t ${sim.t.toFixed(2)}, request ${speed} yd/s`);
for (const slot of ['LT', 'LG', 'C', 'RG', 'RT']) {
  const a = sim.agents.find((x: any) => x.slot === slot);
  const down = up > 0 ? 0 : Math.PI;
  const cases: [string, number, number][] = [
    ['straight ahead', down, down],
    ['sideways, square hips', down + Math.PI / 2, down],
    ['sideways, hips 45 open', down + Math.PI / 2, down + Math.PI / 4],
    ['sideways, hips 90 open', down + Math.PI / 2, down + Math.PI / 2],
  ];
  const row: string[] = [];
  for (const [name, h, face] of cases) {
    const body = { ...a.body, vel: { x: 0, y: 0 }, facing: face, yaw: face };
    const s = previewFreeMovement(body as any, { vel: { x: Math.cos(h) * speed, y: Math.sin(h) * speed }, facing: face } as any, 0, 20);
    const along = (t: number) => { const q = s[Math.round(t / 0.05) - 1]; return (q.vel.x * Math.cos(h) + q.vel.y * Math.sin(h)).toFixed(2); };
    row.push(`${name}: ${along(0.25)}/${along(0.5)}/${along(1.0)}`);
  }
  console.log(`${slot} ${a.profile.massKg} kg, posture ${a.body.support?.posture?.toFixed(2)} | along-request speed @0.25/0.5/1.0 s | ${row.join(' | ')}`);
}
