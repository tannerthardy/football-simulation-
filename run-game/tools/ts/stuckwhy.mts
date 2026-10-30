/** Holdout stuck climbers: what holds each one, from the #307 responsibility ledger.
 * Stuck = his double released, he never reached +2 before the carrier did, and he was still within 1.5 yd of a
 * first-level defender at about the time the carrier got there (climbfate.mts definition).
 * Window: release -> carrier at +2 (else first carrier contact, else play end). */
import { readFileSync, writeFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [setFile, out] = process.argv.slice(2);
const res: any[] = [];
for (const p of deserialize(readFileSync(setFile)) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const ledger = sim.recordResponsibility();
  sim.tick(); const dir = sim.attackDir('O'), los = sim.los;
  const depth = (a: any) => (a.pos.x - los) * dir;
  const first = sim.defense.filter((d: any) => depth(d) <= 1.5);
  const jobs: any[] = [];
  for (const o of sim.offense) { const c = o.behavior instanceof RunBlocker ? o.behavior.plan?.combination : null;
    if (c && c.members[1] === o) jobs.push({ c, rel: -1, leaver: null, lastNear: -1, reach2: -1, maxDepth: -99, ticks: [] as any[] }); }
  let carrier: any = null, carrier2 = -1;
  while (sim.phase === 'live' && sim.t < 8) {
    const t0 = sim.t; sim.tick(); const t = +sim.t.toFixed(2);
    if (sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === 'O') carrier = sim.carrier;
    if (carrier && carrier2 < 0 && depth(carrier) >= 2) carrier2 = t;
    for (const j of jobs) {
      if (j.rel < 0 && j.c.released) { j.rel = t; j.leaver = j.c.members.find((m: any) => m.behavior?.plan?.kind === 'climb') ?? null; }
      if (!j.leaver || j.reach2 >= 0 || carrier2 >= 0) continue;
      const L = j.leaver;
      const near = first.filter((d: any) => Math.hypot(d.pos.x - L.pos.x, d.pos.y - L.pos.y) <= 1.5);
      if (near.length) j.lastNear = t;
      j.maxDepth = Math.max(j.maxDepth, depth(L));
      if (depth(L) >= 2) j.reach2 = t;
      const req = sim.intents[L.idx]?.vel ?? { x: 0, y: 0 };
      j.ticks.push({ t: +t0.toFixed(2), near: near.map((d: any) => d.idx), req: Math.hypot(req.x, req.y), reqUp: req.x * dir,
        vel: Math.hypot(L.vel.x, L.vel.y), velUp: L.vel.x * dir, depth: +depth(L).toFixed(2) });
    }
  }
  const D = ledger.data, slot = (i: number | null) => i == null ? '-' : D.actors[i].slot;
  const fc = D.play.carrierEvents.find((e: any) => e.type === 'carrier_contact');
  for (const j of jobs) {
    if (!j.leaver || j.rel < 0 || j.reach2 >= 0) continue;
    const stuck = j.lastNear >= 0 && (carrier2 < 0 || j.lastNear >= carrier2 - 0.3);
    if (!stuck) continue;
    const L = j.leaver, end = carrier2 >= 0 ? carrier2 : fc ? fc.t : 99;
    const rows = D.rows.filter((r: any) => r.actor === L.idx && r.t >= j.rel - 1e-9 && r.t < end - 1e-9);
    const changes = D.changes.filter((c: any) => c.actor === L.idx && c.t >= j.rel - 0.06 && c.t < end);
    const cat: Record<string, number> = {}, engagedWith: Record<string, number> = {}, torsoWith: Record<string, number> = {}, loadedOn: Record<string, number> = {}, owner: Record<string, number> = {}, planAt: Record<string, number> = {};
    for (const r of rows) {
      const e = r.engagement, torso = r.torso.filter((k: any) => k.impulse > 1e-6), loaded = r.hands.filter((h: any) => h.loaded);
      const backer = j.c.backer?.idx, down = j.c.defender.idx;
      const who = (i: number) => i === down ? 'down man' : i === backer ? 'backer' : first.some((d: any) => d.idx === i) ? 'other first-level' : 'other';
      let k: string;
      if (e) k = `rep with ${who(e.defender)}${e.helpers.includes(L.idx) ? ' (helper)' : ''}`;
      else if (loaded.length) k = `loaded hands on ${who(loaded[0].defender)}`;
      else if (torso.length) k = `body contact with ${who(torso[0].defender)}`;
      else if (!r.plan || r.plan.kind !== 'climb' || r.plan.target !== backer) k = `free, job ${r.plan?.kind}->${who(r.plan?.target)}`;
      else k = 'free, climbing to his backer';
      cat[k] = (cat[k] ?? 0) + 1;
      if (e) engagedWith[slot(e.defender)] = (engagedWith[slot(e.defender)] ?? 0) + 1;
      for (const k2 of torso) torsoWith[slot(k2.defender)] = (torsoWith[slot(k2.defender)] ?? 0) + 1;
      for (const h of loaded) loadedOn[slot(h.defender)] = (loadedOn[slot(h.defender)] ?? 0) + 1;
      const o = r.command ? `${r.command.finalOwner}${r.command.rewrittenBy.length ? ':' + r.command.rewrittenBy.join('>') : ''}` : 'none';
      owner[o] = (owner[o] ?? 0) + 1;
      const pk = `${r.plan?.kind}->${slot(r.plan?.target)}`; planAt[pk] = (planAt[pk] ?? 0) + 1;
    }
    const free = j.ticks.filter((x: any) => true);
    const mean = (f: (x: any) => number) => free.length ? +(free.reduce((s: number, x: any) => s + f(x), 0) / free.length).toFixed(2) : null;
    res.push({ id: p.id, concept: sim.offCall.run?.id, front: sim.defCall.front?.id, climber: L.slot, keeper: j.c.members.find((m: any) => m !== L).slot,
      down: j.c.defender.slot, backer: j.c.backer?.slot, rel: j.rel, end, carrier2, firstContact: fc ? { t: fc.t, by: slot(fc.defender) } : null,
      maxDepth: +j.maxDepth.toFixed(2), cat, engagedWith, torsoWith, loadedOn, owner, planAt,
      changes: changes.map((c: any) => ({ t: c.t, reason: c.reason, fields: c.fields, from: `${c.before.kind}->${slot(c.before.target)}`, to: `${c.after.kind}->${slot(c.after.target)}` })),
      req: mean(x => x.req), reqUp: mean(x => x.reqUp), vel: mean(x => x.vel), velUp: mean(x => x.velUp),
      nearBy: Object.entries(j.ticks.flatMap((x: any) => x.near).reduce((m: any, i: number) => (m[slot(i)] = (m[slot(i)] ?? 0) + 1, m), {})) });
  }
}
writeFileSync(out, JSON.stringify(res, null, 1));
console.log('stuck climbers', res.length);
for (const r of res) {
  const top = Object.entries(r.cat).sort((a: any, b: any) => b[1] - a[1]);
  const n = top.reduce((s: number, x: any) => s + x[1], 0);
  console.log(`${r.id} ${r.concept}/${r.front} ${r.climber} (keeper ${r.keeper} on ${r.down}, backer ${r.backer}) rel ${r.rel} end ${r.end} maxDepth ${r.maxDepth}`
    + ` | ${top.map(([k, v]: any) => `${k} ${Math.round(100 * v / n)}%`).join('; ')}`
    + ` | req ${r.req} (up ${r.reqUp}) vel ${r.vel} (up ${r.velUp})`
    + ` | eng ${JSON.stringify(r.engagedWith)} torso ${JSON.stringify(r.torsoWith)} near ${JSON.stringify(r.nearBy)}`
    + ` | owner ${JSON.stringify(r.owner)} | plan ${JSON.stringify(r.planAt)} | changes ${r.changes.map((c: any) => `${c.t.toFixed(2)} ${c.reason} ${c.from}=>${c.to}`).join(', ')}`);
}
