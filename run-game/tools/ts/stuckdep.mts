/** Zone departures with a keeper detour that are not 2 yd clear of the released DL 1.0 s after release: per 0.1 s,
 * climber / DL / keeper / backer positions (depth past LOS, lateral rel. ball), climber speed+cmd, access (kind,
 * obstacle, turn, goal). args: seeds maxN */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [seedsArg, maxN = '3'] = process.argv.slice(2); let shown = 0;
for (const seed of seedsArg.split(',')) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass || shown >= +maxN) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/zone/i.test(sim.offCall.run?.scheme ?? '')) continue;
  const dir = sim.attackDir('O'), by = sim.ballY, f = (v: any) => `(${((v.x - sim.los) * dir).toFixed(1)},${(v.y - by).toFixed(1)})`;
  let seenEv = 0, cl: any = null; const lines: string[] = []; let detour = false;
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    const fresh = sim.events.slice(seenEv); seenEv = sim.events.length;
    if (!cl) for (const ev of fresh.filter((e: any) => e.type === 'block_climb')) { const a = sim.agents[ev.a], d = a.behavior.plan.departure; if (d) { cl = { a, dl: d.defender, kp: d.keeper, bk: d.backer, t0: sim.t }; break; } }
    if (!cl) continue;
    const b: any = cl.a.behavior, acc = b.departureAccess;
    if (acc?.kind === 'detour' && sim.agents[acc.plan.obstacle] === cl.kp) detour = true;
    if (Math.round((sim.t - cl.t0) * 100) % 10 === 0) {
      const cmd = sim.intents[cl.a.idx]?.vel;
      lines.push(`  +${(sim.t - cl.t0).toFixed(1)} ${cl.a.slot}${f(cl.a.pos)} v${cl.a.speed.toFixed(1)} cmd${cmd ? Math.hypot(cmd.x, cmd.y).toFixed(1) : '-'} | DL ${cl.dl.slot}${f(cl.dl.pos)} v(${(cl.dl.vel.x * dir).toFixed(1)},${cl.dl.vel.y.toFixed(1)}) | keeper ${cl.kp.slot}${f(cl.kp.pos)} | backer ${cl.bk.slot}${f(cl.bk.pos)} | ${b.plan.departure ? (acc ? acc.kind + (acc.kind === 'detour' ? ` around ${sim.agents[acc.plan.obstacle].slot} turn ${acc.plan.turn} goal ${f(acc.plan.goal)}` : '') : 'no access') : 'departure over, eng ' + (cl.a.engagement?.defender?.slot ?? '-')}`);
    }
    if (sim.t - cl.t0 > 1.2) break;
  }
  if (!cl || !detour) continue;
  const gapNow = Math.hypot(cl.a.pos.x - cl.dl.pos.x, cl.a.pos.y - cl.dl.pos.y);
  if (gapNow >= 2) continue;
  shown++; console.log(`seed ${seed} #${pi} ${sim.offCall.run.scheme} side ${sim.offCall.run.side ?? ''}: ${cl.a.slot} released at ${cl.t0.toFixed(2)} from ${cl.dl.slot} (keeper ${cl.kp.slot}) to ${cl.bk.slot}`); console.log(lines.join('\n'));
}
