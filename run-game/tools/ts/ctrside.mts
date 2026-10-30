/** Counter/power/trap: per play the call side, the pullers' path direction, the carrier's designed aim lateral (rel.
 * ball) at the handoff, his lateral when first 1 yd behind the LOS and at crossing, and whether he crossed. args: scheme seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [scheme, ...seeds] = process.argv.slice(2);
const agg: Record<string, number[]> = {};
for (const seed of seeds) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== scheme) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O'), by = sim.ballY;
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const pdir = Math.sign(pullers.reduce((s: number, o: any) => s + ((o.behavior.plan.pullPath?.at(-1)?.y ?? o.pos.y) - o.pos.y), 0));
  let aim: any = null, at1: number | null = null, cross: number | null = null, rbAim0: number | null = null;
  while (sim.phase === 'live' && sim.t < 5) {
    sim.tick();
    const c = sim.carrier, b: any = c?.behavior;
    if (!c || c === sim.qb) continue;
    if (aim === null && b?.opts?.aim) { aim = { ...b.opts.aim }; rbAim0 = (aim.y - by) * pdir; }
    const d = (c.pos.x - sim.los) * dir;
    if (at1 === null && d >= -1) at1 = (c.pos.y - by) * pdir;
    if (cross === null && d > 0) { cross = (c.pos.y - by) * pdir; break; }
  }
  const k = `${sim.offCall.run.side}`;
  console.log(`seed ${seed} #${pi} call side ${sim.offCall.run.side} pullers ${pullers.map((o: any) => o.slot + '/' + o.behavior.plan.pullRole).join(',')} pull dir ${pdir} | aim (+pull) ${rbAim0?.toFixed(1)} | at -1 yd ${at1?.toFixed(1)} | crossed ${cross?.toFixed(1) ?? 'never'}`);
  (agg.aim ??= []).push(rbAim0 ?? NaN); (agg.cross ??= []).push(cross ?? NaN);
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
console.log(`median aim (+pull side) ${med(agg.aim)} | crossed ${med(agg.cross)} | aim on pull side ${(agg.aim.filter(v => v > 0).length / agg.aim.length).toFixed(2)}`);
