/** Counter, first crease read that selects the backside: for the best pull-side candidate entry, each defender within
 * 8 yd: slot, his margin (threatTime to entry - runner arrival; < 0 closes it), and the earliest puller/OL that can
 * reach that defender (timeToReach to his seen position), vs the defender's time to the entry. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
const { timeToReach } = await import(root + '/src/physics/reach.ts');
const tally: Record<string, number> = {};
for (const seed of process.argv.slice(2)) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== 'counter' || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const by = sim.ballY;
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const role = new Map(pullers.map((o: any) => [o, o.behavior.plan.pullRole]));
  const pdir = Math.sign(pullers.reduce((s: number, o: any) => s + ((o.behavior.plan.pullPath?.at(-1)?.y ?? o.pos.y) - o.pos.y), 0)) || 1;
  let done = false;
  runReadObservers.set(sim, (e: any) => {
    if (done || e.phase !== 'aim' || !e.selected || (e.selected.y - by) * pdir > -0.3) return;
    done = true;
    const a = sim.agents[e.actor];
    const pull = (e.candidates ?? []).filter((k: any) => (k.entry.y - by) * pdir > 0.3).sort((x: any, y: any) => x.risk - y.risk)[0];
    if (!pull) return;
    const q = pull.entry, me = { pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale };
    const arrive = timeToReach(me, q, 0);
    const lines: string[] = [];
    for (const d of sim.defense) {
      const s = sim.see(a, d);
      if (Math.hypot(s.pos.x - q.x, s.pos.y - q.y) > 8) continue;
      const tD = timeToReach({ ...s, profile: d.profile }, q, d.profile.radius + a.profile.radius + d.profile.reach * .75);
      const margin = tD - arrive;
      if (margin > 0.3) continue;
      const eng = sim.engagements.find((x: any) => x.defender === d);
      // Earliest teammate (non-carrier OL/TE/FB) to reach the defender's seen spot.
      let bestO: any = null, tO = Infinity;
      for (const o of sim.offense) {
        if (o === a || o === sim.qb) continue;
        const so = sim.see(a, o);
        const t = timeToReach({ ...so, profile: o.profile }, s.pos, o.profile.radius + d.profile.radius);
        if (t < tO) { tO = t; bestO = o; }
      }
      const who = eng ? `engaged by ${eng.blocker.slot}` : `free; first OL ${bestO?.slot}${role.has(bestO) ? '(' + role.get(bestO) + ')' : ''} reaches him in ${tO.toFixed(2)} vs his ${tD.toFixed(2)} to the entry`;
      lines.push(`${d.slot} margin ${margin.toFixed(2)} ${who}`);
      const k = eng ? 'engaged' : tO < tD ? (role.has(bestO) ? 'free, puller there first' : 'free, other OL there first') : 'free, nobody there first';
      tally[k] = (tally[k] ?? 0) + 1;
    }
    console.log(`s${seed}#${pi} t ${e.t.toFixed(2)} sel ${((e.selected.y - by) * pdir).toFixed(1)} | pull-side ${((q.y - by) * pdir).toFixed(1)} risk ${pull.risk.toFixed(2)} arrive ${arrive.toFixed(2)} | ${lines.join(' ; ')}`);
  });
  while (sim.phase === 'live' && sim.t < 4 && !done) sim.tick();
}
console.log('closing defenders:', JSON.stringify(tally));
