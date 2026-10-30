/** One run play: every 0.1 s the carrier (pos, speed, behavior aim/press entry, designed flag), the line (OL/TE, DL,
 * near LBs) as depth/lateral with engagement, and the blocking plans at the snap. args: seed playIndex [tmax] */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, pi, tmax = '3'] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[+pi];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O'), by = sim.ballY;
const f = (v: any) => `(${((v.x - sim.los) * dir).toFixed(1)},${((v.y - by)).toFixed(1)})`;
console.log(`scheme ${sim.offCall.run?.scheme} side ${sim.offCall.run?.side ?? ''} ballY ${by.toFixed(1)} (lateral printed relative to the ball)`);
for (const o of sim.offense) if (o.behavior instanceof RunBlocker) { const pl = o.behavior.plan; console.log(`  ${o.slot} ${f(o.pos)} ${pl.kind}${pl.pullRole ? '/' + pl.pullRole : ''} -> ${pl.target?.slot ?? '-'}`); }
console.log('  D: ' + sim.defense.map((d: any) => `${d.slot}${f(d.pos)}`).join(' '));
const line = [...sim.offense.filter((o: any) => o.behavior instanceof RunBlocker), ...sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir < 6 && Math.abs(d.pos.y - by) < 9)];
while (sim.phase === 'live' && sim.t < +tmax) {
  sim.tick();
  if (Math.round(sim.t * 100) % 10) continue;
  const c = sim.carrier; const b: any = c?.behavior;
  const head = b?.heading != null ? (b.heading * 180 / Math.PI).toFixed(0) : '-';
  const aim = b?.opts?.aim ? f(b.opts.aim) : '-', pe = b?.pressEntry ? f(b.pressEntry) : '-';
  console.log(`${sim.t.toFixed(1)} ${c ? `${c.slot}${f(c.pos)} v${c.speed.toFixed(1)} h${head} aim${aim} until${b?.opts?.aimUntil?.toFixed(2) ?? '-'} press${pe} des${b?.wasDesigned} ${[...c.tags].filter((x: string) => /crease|paced|squeez/.test(x)).join(',')}` : 'no carrier'}`);
  console.log('     ' + line.map((a: any) => `${a.slot}${f(a.pos)}${a.engagement ? '~' + (a.team === 'O' ? a.engagement.defender.slot : a.engagement.blocker.slot) : ''}`).join(' '));
}
for (const e of sim.events.filter((e: any) => /contact|tackle|shed|squeeze/.test(e.type)).slice(0, 8)) console.log(`  ev ${e.t.toFixed(2)} ${e.type} ${sim.agents[e.a]?.slot ?? ''} ${e.b != null ? sim.agents[e.b]?.slot : ''} ${e.detail ?? ''}`);
