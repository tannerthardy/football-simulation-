/** Measure the declared set on the current checkout. usage: node --import tsx g2measure.mts set.bin out.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const plays = deserialize(readFileSync(process.argv[2])) as any[];
const out: any[] = [];
let departures = 0;
const old = RunBlocker.prototype.startDeparture;
RunBlocker.prototype.startDeparture = function (...a: any[]) { departures++; return (old as any).apply(this, a); };
const t0 = performance.now();
for (const p of plays) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const t1 = performance.now(), d0 = departures;
  sim.tick();
  const dir = sim.attackDir('O');
  const combos: any[] = [];
  for (const o of sim.offense) { const c = o.behavior instanceof RunBlocker ? o.behavior.plan?.combination : null;
    if (c && c.members[1] === o) combos.push({ keeper: c.members[0], climber: o, dl: c.defender, lb: c.backer, combo: c }); }
  const climbs = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan?.kind === 'climb')
    .map((o: any) => ({ keeper: null, climber: o, dl: null, lb: o.behavior.plan.target }));
  const jobs = [...combos, ...climbs].map(j => ({ ...j, lbArrive: -1, lbWorkedBy: null as any, lbWorkedAt: -1, dlArrive: -1, dlHeld: null as any, dlHit: false, rel: -1, close: 99, closeT: -1 }));
  let carrier: any = null;
  const lvl = (d: any) => carrier && (carrier.pos.x - d.pos.x) * dir > -1;
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    const c = sim.carrier; if (c && c !== sim.qb && c.team === 'O') carrier = c;
    for (const j of jobs) {
      if (j.rel < 0 && (j.combo ? j.combo.released : sim.t > 0)) { j.rel = +sim.t.toFixed(2); const m = j.combo ? [j.climber, j.keeper].find((q: any) => q.behavior?.plan?.kind === 'climb' || q.behavior?.plan?.climbTo === j.lb && q.behavior?.plan?.target !== j.dl) ?? j.climber : j.climber; j.who = m.slot; j.relPos = { x: m.pos.x, y: m.pos.y }; j.at = sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir > 1.5 && (d.pos.x - sim.los) * dir < 7 && !sim.engagements.some((e: any) => e.defender === d)).map((d: any) => [d.slot, +Math.hypot(d.pos.x - m.pos.x, d.pos.y - m.pos.y).toFixed(1), +((d.pos.x - sim.los) * dir).toFixed(1)]).sort((a: any, b: any) => a[1] - b[1]).slice(0, 3); }
      if (j.lb && j.lbArrive < 0) { const r = Math.min(...[j.climber, j.keeper].filter(Boolean).map((m: any) => Math.hypot(m.pos.x - j.lb.pos.x, m.pos.y - j.lb.pos.y))); if (r < j.close) { j.close = +r.toFixed(2); j.closeT = +sim.t.toFixed(2); } }
      if (j.lb && j.lbArrive < 0) {
        const e = sim.engagements.find((e: any) => e.defender === j.lb);
        if (e && j.lbWorkedAt < 0) { j.lbWorkedAt = +sim.t.toFixed(2); j.lbWorkedBy = e.blocker.slot; }
        if (lvl(j.lb)) j.lbArrive = +sim.t.toFixed(2);
      }
      if (j.dl && j.dlArrive < 0) {
        if (sim.events.some((e: any) => e.type === 'carrier_contact' && e.b === j.dl.idx)) j.dlHit = true;
        if (lvl(j.dl)) { j.dlArrive = +sim.t.toFixed(2); const e = sim.engagements.find((e: any) => e.defender === j.dl); j.dlHeld = e ? e.blocker.slot : null; }
      }
    }
  }
  const res = sim.result ?? sim.run?.();
  const first = sim.events.find((e: any) => e.type === 'carrier_contact');
  const fd = first ? sim.agents[first.b] : null;
  out.push({ id: p.id, concept: p.concept, front: p.front, ms: +(performance.now() - t1).toFixed(0), departures: departures - d0,
    yards: res?.yards ?? null, first: fd ? { slot: fd.slot, t: first.t } : null,
    jobs: jobs.map(j => ({ keeper: j.keeper?.slot ?? null, climber: j.climber.slot, dl: j.dl?.slot ?? null, lb: j.lb?.slot ?? null,
      lbWorked: j.lb ? (j.lbWorkedAt >= 0 && (j.lbArrive < 0 || j.lbWorkedAt <= j.lbArrive)) : null, lbWorkedBy: j.lbWorkedBy, lbWorkedAt: j.lbWorkedAt, lbArrive: j.lbArrive,
      dlProtected: j.dl ? (!j.dlHit && j.dlHeld !== null) : null, dlHeld: j.dlHeld, dlArrive: j.dlArrive, rel: j.rel, close: j.close, closeT: j.closeT, lbDepthAtArrive: null, who: j.who, at: j.at })) });
}
console.log(`total ${(performance.now() - t0).toFixed(0)} ms, departures ${departures}`);
writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
