/** Every pulling blocker on saved runs: whom he engages, where that man is then (relative to the puller, the line and
 * the runner), and whether that man ever got within 2 yd of the ball carrier. Upfield = offense's attack direction.
 *   node --import tsx pullcensus.mts out/matched-restage/seed7.json ... */
import { readFileSync, writeFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const files = process.argv.slice(2).filter(f => f.endsWith('.json'));
const rows: any[] = [];
for (const f of files) {
  const seed = f.match(/seed(\d+)/)![1];
  (JSON.parse(readFileSync(f, 'utf8')) as any[]).forEach((p, i) => {
    if (p.pass) return;
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted || !sim.offCall.run) return;
    sim.tick();
    const dir = sim.attackDir('O'), los = sim.los;
    const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && (o.behavior.plan.kind === 'pull' || o.behavior.plan.kind === 'lead') && o.behavior.plan.pullRole);
    if (!pullers.length) return;
    const st = pullers.map((o: any) => ({ o, role: o.behavior.plan.pullRole, kind: o.behavior.plan.kind, planned: o.behavior.plan.target, first: null as any, near: new Map<any, number>() }));
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      const c = sim.carrier && sim.carrier.team === 'O' && sim.carrier !== sim.qb ? sim.carrier : null;
      for (const s of st) {
        if (c) for (const d of sim.defense) if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 2) s.near.set(d, s.near.get(d) ?? sim.t);
        if (s.first) continue;
        const e = sim.engagements.find((e: any) => e.type === 'run' && (e.blocker === s.o || e.helpers.includes(s.o)));
        if (!e) continue;
        const d = e.defender, ball = c ?? sim.slot('RB');
        s.first = { t: +sim.t.toFixed(2), whom: d.slot, planned: d === s.planned,
          // + = the man is downfield of the puller; - = behind him (deeper in our backfield)
          manVsPuller: +((d.pos.x - s.o.pos.x) * dir).toFixed(2), manVsLos: +((d.pos.x - los) * dir).toFixed(2),
          manOutsideBall: +((d.pos.y - ball.pos.y) * Math.sign(s.o.behavior.plan.drive?.y || 1)).toFixed(2),
          manVelUp: +(d.vel.x * dir).toFixed(2), ballVsLos: +((ball.pos.x - los) * dir).toFixed(2),
          ballHasIt: !!c };
      }
    }
    const res = sim.result ?? null;
    for (const s of st) {
      const whom = s.first ? sim.slot(s.first.whom) : null;
      rows.push({ id: `S${seed}-#${i}`, call: p.call, role: s.role, kind: s.kind, puller: s.o.slot, planned: s.planned?.slot, ...s.first,
        manEverNearBall: whom ? s.near.has(whom) : null, plannedEverNearBall: s.planned ? s.near.has(s.planned) : null,
        yards: +(sim.run?.call ? 0 : 0) });
    }
  });
}
writeFileSync('out/rel/pullcensus.json', JSON.stringify(rows, null, 1));
const n = rows.length, eng = rows.filter(r => r.t !== undefined);
console.log(`pullers ${n}; engaged someone ${eng.length}`);
const behind = eng.filter(r => r.manVsPuller < -0.3), deep = eng.filter(r => r.manVsLos < -2);
console.log(`engaged a man behind him (>0.3 yd deeper): ${behind.length}; man >2 yd into our backfield: ${deep.length}`);
console.log(`of those deep: man ever within 2 yd of the ball carrier ${deep.filter(r => r.manEverNearBall).length}`);
for (const r of eng.filter(r => r.manVsLos < -1.5).slice(0, 40)) console.log(JSON.stringify(r));
