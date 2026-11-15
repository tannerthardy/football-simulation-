// QB step-up physics question (Integration/QB lane, 2026-11-15): when asked to step up from his set he achieves about half (+1.27 commanded -> +0.62 achieved; +2.65 -> +1.18). Lone-body tests of the BODY (no
// behaviour layer): a generated QB, upfield = +x, asked for a velocity request upfield from (a) rest facing upfield, (b) rest facing the sideline (a pocket slide's stance), (c) the end of a five-step drop
// (moving back, facing upfield, the speed a real drop ends at), (d) the same with five linemen standing 1.4 yd in front of him. Reports his upfield velocity at 0.25 / 0.5 / 1.0 s after the request.
// usage: [DIR_CAP=1] node --import tsx scripts/diag/effective-mass/qb-stepup-lone.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const rng = new Rng(33);
const profs: any[] = []; for (let i = 0; i < 6; i++) profs.push(derivePhysical(generatePlayer(rng, 'QB' as any)));
const olProf = derivePhysical(generatePlayer(new Rng(5), 'OT' as any));
const mk = (prof: any, x: number, y: number, vx: number, facing: number) => ({ pos: { x, y }, vel: { x: vx, y: 0 }, facing, energy: 1, profile: prof, support: S.newSupport(0.4) } as any);
function run(prof: any, cmd: number, start: 'rest-up' | 'rest-side' | 'drop', line: boolean | 'gap') {
  const qb = mk(prof, 0, 0, 0, start === 'rest-side' ? Math.PI / 2 : 0); const bodies = [qb];
  const v0 = start === 'drop' ? -3.0 : 0; qb.vel.x = v0;
  if (line === true) for (let k = -2; k <= 2; k++) bodies.push(mk(olProf, 1.4, k * 1.1, 0, 0));
  if (line === 'gap') for (const y of [-2.2, -1.1, 1.1, 2.2]) bodies.push(mk(olProf, 0.9, y, 0, 0));   // four linemen 0.9 yd ahead with a 2.2 yd gap in the middle: he steps through it
  const w = new World(bodies); const cmds = (c: number) => bodies.map((b, i) => i === 0 ? { vel: { x: c, y: 0 }, facing: 0, effort: 1 } as any : { vel: { x: 0, y: 0 }, facing: 0, effort: 1 } as any);
  // the drop: five steps back at 3 yd/s asked for, then the request
  if (start === 'drop') for (let k = 0; k < 40; k++) w.step(cmds(-3.0), 0.025);
  const out: number[] = []; for (let k = 1; k <= 40; k++) { w.step(cmds(cmd), 0.025); if (k === 10 || k === 20 || k === 40) out.push(qb.vel.x); }
  return out;
}
for (const cmd of [1.27, 2.65, 2.5]) for (const [start, line] of [['rest-up', false], ['rest-side', false], ['drop', false], ['drop', true], ['rest-up', 'gap'], ['drop', 'gap']] as const) {
  const rows = profs.map(p => run(p, cmd, start as any, line)); const med = (j: number) => { const a = rows.map(r => r[j]).sort((x, y) => x - y); return a[a.length >> 1]; };
  console.log(`ask ${cmd.toFixed(2)} upfield from ${start}${line === true ? ' with five linemen 1.4 yd in front' : line === 'gap' ? ' with four linemen 0.9 yd ahead and a 2.2 yd gap' : ''}: achieved at 0.25 / 0.5 / 1.0 s = ${[0, 1, 2].map(j => med(j).toFixed(2)).join(' / ')}  (${(med(1) / cmd * 100).toFixed(0)}% at 0.5 s)`);
}
