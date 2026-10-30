/** One counter play: the center (back block) and a DT every 0.1 s: positions (depth, lateral toward the pull from
 * the ball), velocities, engagement (with win/control/drive), C's plan kind/target, carrier; run-contact 'end' reasons.
 * args: seed idx dtSlot */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { runContactObservers } = await import(root + '/src/sim/run-contact-observer.ts');
const [seed, idx] = process.argv.slice(2, 4).map(Number), dtSlot = process.argv[4];
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O'), C = sim.slot('C'), D = sim.slot(dtSlot);
const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
const ps = Math.sign(pullers.reduce((s: number, o: any) => s + ((o.behavior.plan.pullPath?.at(-1)?.y ?? o.pos.y) - o.pos.y), 0)) || 1;
console.log(`C plan ${C.behavior.plan.kind} -> ${C.behavior.plan.target?.slot}; pullers ${pullers.map((o: any) => o.slot + '/' + o.behavior.plan.pullRole).join(',')}`);
runContactObservers.set(sim, (e: any, kind: string, data: any) => {
  if (kind === 'movement' && e.blocker === C && e.defender === D && Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 0.01) {
    const r = (n: any) => typeof n === 'number' ? n.toFixed(2) : n;
    const lat = data.lat, cmd = data.command.vel, lc = cmd.x * lat.x + cmd.y * lat.y, dvl = data.defenderVel.x * lat.x + data.defenderVel.y * lat.y;
    console.log(`   mv t ${sim.t.toFixed(2)} lat-axis cmd ${r(lc)} | seal ${r(data.seal)} dLat ${r(data.dLat)} corr ${r(data.correction)} mirror ${r(data.mirror)} offset ${r(data.offset)} want ${r(data.wantOffset)} | D lat vel ${r(dvl)} | anchored ${data.anchored} stretch ${data.stretch} normalReq ${r(data.normalRequest)} lat(${r(lat.x)},${r(lat.y)})`);
  }
  if (kind === 'end' && (e.defender === D || e.blocker === C)) console.log(`  end t ${sim.t.toFixed(2)} ${e.blocker.slot}>${e.defender.slot} ${JSON.stringify(data)}`); });
const f = (a: any) => `(${((a.pos.x - sim.los) * dir).toFixed(1)},${((a.pos.y - sim.ballY) * ps).toFixed(1)}) v(${(a.vel.x * dir).toFixed(1)},${(a.vel.y * ps).toFixed(1)})`;
let next = 0.3;
while (sim.phase === 'live' && sim.t < 2.6) {
  sim.tick(); if (sim.t + 1e-9 < next) continue; next += 0.1;
  const e = sim.engagements.find((x: any) => x.defender === D);
  const c = sim.carrier;
  console.log(`t ${sim.t.toFixed(2)} C ${f(C)} ${C.behavior.plan.kind}>${C.behavior.plan.target?.slot ?? '-'} | ${dtSlot} ${f(D)} | eng ${e ? `${e.blocker.slot} win ${e.win?.toFixed(2)} ctl ${e.control?.toFixed?.(2)} side ${e.side}` : '-'} | carrier ${c && c !== sim.qb ? f(c) : 'qb'}`);
}
