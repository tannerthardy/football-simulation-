/** First N zone departures: per tick from start: climber speed/commanded, distance to released DL and keeper (minus
 * radii), joints attached to him (kind, other body), contacts this step (with whom, impulse), felt load, support. args: seed maxDepartures */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, maxN = '3'] = process.argv.slice(2); let shown = 0;
for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass || shown >= +maxN) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/zone/i.test(sim.offCall.run?.scheme ?? '')) continue;
  let who: any = null, t0 = -1; const lines: string[] = [];
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    for (const a of sim.offense) { const b: any = a.behavior; if (!who && b instanceof RunBlocker && b.plan.departure) { who = a; t0 = sim.t; } }
    if (!who) continue;
    const b: any = who.behavior, d = b.plan.departure;
    if (!d && sim.t - t0 > 0.05) { lines.push(`  ${sim.t.toFixed(2)} departure over: plan ${b.plan.kind} eng ${who.engagement?.defender?.slot ?? '-'}`); break; }
    const dd = d ?? {}; const rel = dd.defender, kp = dd.keeper;
    const gapTo = (o: any) => o ? (Math.hypot(o.pos.x - who.pos.x, o.pos.y - who.pos.y) - o.profile.radius - who.profile.radius).toFixed(2) : '-';
    const joints = sim.world.joints.filter((j: any) => j.a === who.body || j.b === who.body).map((j: any) => `${j.kind}:${sim.agents.find((x: any) => x.body === (j.a === who.body ? j.b : j.a))?.slot}${j.broken ? '(broken)' : ''}`);
    const contacts = (sim.lastStep?.contacts ?? []).filter((c: any) => c.i === who.idx || c.j === who.idx).map((c: any) => `${sim.agents[c.i === who.idx ? c.j : c.i].slot}`);
    const cmd = sim.intents[who.idx]?.vel; const felt = who.body.support?.felt;
    lines.push(`  ${sim.t.toFixed(2)} v ${who.speed.toFixed(2)} cmd ${cmd ? Math.hypot(cmd.x, cmd.y).toFixed(2) : '-'} | gap DL ${gapTo(rel)} keeper ${gapTo(kp)} | access ${b.departureAccess?.kind ?? '-'} | joints [${joints}] contacts [${contacts}] | felt ${felt ? Math.hypot(felt.x, felt.y).toFixed(0) : '-'} support ${who.body.support?.state} eng ${who.engagement?.defender?.slot ?? '-'}`);
  }
  if (!who) continue;
  shown++; console.log(`seed ${seed} #${pi} ${sim.offCall.run.scheme}: ${who.slot} departs at ${t0.toFixed(2)} (keeper ${who.behavior.plan.departure?.keeper?.slot ?? '?'}, mass ${who.profile.massKg})`); console.log(lines.slice(0, 18).join('\n'));
}
