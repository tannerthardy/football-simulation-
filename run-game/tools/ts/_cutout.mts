// Cut-out drill: run a real OZ play to the first C-on-box-LB engagement (runner has the ball),
// then either continue normally ('full') or move every other body 60 yd away ('alone').
import { readFileSync } from 'node:fs';
const W = process.argv[2], CON = process.argv[3] ?? 'outsideZone', MAX = +(process.argv[4] ?? 40);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const branch: Record<string, number> = {};
const rows: any[] = []; if (process.argv[5]?.includes("own")) (globalThis as any).__ownDef = true; if (process.argv[6]) (globalThis as any).__runMirror = +process.argv[6];
const find = (sim: any) => { const c = sim.slot('C'); const e = c.engagement; const car = sim.ball?.kind === 'held' ? sim.ball.carrier : null;
  return e && e.blocker === c && /LB/.test(e.defender.slot) && car && car !== sim.qb ? e : null; };
outer: for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (rows.length >= MAX) break outer;
  if (p.pass) continue; const st0: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (st0.offCall?.run?.scheme !== CON) continue;
  const probe: any = new PlaySim(st0); let t0 = -1;
  while (probe.t < 4 && probe.phase === 'live') { probe.tick(); if (find(probe)) { t0 = probe.t; break; } }
  if (t0 < 0) continue;
  const res: any = {};
  for (const mode of ['full', 'alone']) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    while (sim.t < t0 - 1e-9) sim.tick();
    const e = find(sim); if (!e) { res.bad = true; break; }
    const c = sim.slot('C'), lb = e.defender, car = sim.ball.carrier, ps = playSideSign(sim, sim.offCall.run);
    if (mode === 'alone') for (const a of sim.agents) if (a !== c && a !== lb && a !== car && a !== sim.qb) {
      a.body.pos = { x: a.pos.x + 60, y: a.pos.y }; a.body.vel = { x: 0, y: 0 };
      a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) }; }
    const c0 = { ...c.pos }, l0 = { ...lb.pos }, r0 = { ...car.pos }; let lreq = 0, creq = 0, n = 0;
    if (mode === 'alone') runContactObservers.set(sim, (ee: any, phase: string, o: any) => { if (phase !== 'defender-movement' || ee.defender !== lb) return;
      const k = o.workOff ? (o.exitAim ? 'shed: exit to runner' : 'shed: across face') : o.squeeze ? 'squeeze' : ee.defender.runFit && (ee.defender.runFit.kind === 'interior' || ee.defender.runFit.kind === 'edge') ? 'stack read' : 'legacy';
      branch[`${k} | reading ${o.reading} declared ${o.declared} support ${o.supportRunner}`] = (branch[`${k} | reading ${o.reading} declared ${o.declared} support ${o.supportRunner}`] ?? 0) + 1; });
    for (let k = 0; k < 20 && sim.phase === 'live'; k++) { sim.tick(); if (lb.engagement) { lreq += sim.intents[lb.idx].vel.y * ps; creq += sim.intents[c.idx].vel.y * ps; n++; } }
    res[mode] = { c: (c.pos.y - c0.y) * ps, lb: (lb.pos.y - l0.y) * ps, car: (car.pos.y - r0.y) * ps, eng: !!lb.engagement, lreq: n ? lreq / n : NaN, creq: n ? creq / n : NaN };
  }
  if (!res.bad) rows.push(res);
}
console.log(branch);
const med = (a: number[]) => { const s = a.filter(x => !isNaN(x)).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : '-'; };
console.log(`${CON}: ${rows.length} C-on-LB engagements, play-side lateral over 1 s after the first engaged tick (p50)`);
for (const m of ['full', 'alone']) console.log(` ${m.padEnd(6)} C ${med(rows.map(r => r[m].c))}  LB ${med(rows.map(r => r[m].lb))}  carrier ${med(rows.map(r => r[m].car))} | engaged LB req ${med(rows.map(r => r[m].lreq))}  C req ${med(rows.map(r => r[m].creq))} | still engaged ${rows.filter(r => r[m].eng).length}/${rows.length}`);
