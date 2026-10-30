/** usage: node --import tsx reltrace.mts set.bin out.json */
import { readFileSync, writeFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const set = deserialize(readFileSync(process.argv[2])) as any[];
const rows: any[] = [];
for (const p of set) {
  const g = globalThis as any; g.__rel = [];
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  sim.tick();
  const dir = sim.attackDir('O');
  const combos: any[] = [];
  for (const o of sim.offense) { const c = o.behavior instanceof RunBlocker ? o.behavior.plan?.combination : null; if (c && c.members[1] === o) combos.push(c); }
  const st = new Map<any, any>();
  for (const c of combos) st.set(c, { rel: -1, climber: null, lbArrive: -1, workedAt: -1, workedBy: null, close: 99, dlArrive: -1, dlHeld: null, dlHit: false, inwardAfter: 0 });
  let carrier: any = null;
  while (sim.phase === 'live' && sim.t < 8) {
    sim.tick();
    if (sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === 'O') carrier = sim.carrier;
    const lvl = (d: any) => !!carrier && (carrier.pos.x - d.pos.x) * dir > -1;
    for (const c of combos) { const s = st.get(c);
      if (s.rel < 0 && c.released) { s.rel = +sim.t.toFixed(2); s.climber = [...c.members].find((m: any) => m.behavior?.plan?.departure || m.behavior?.plan?.target === c.backer) ?? null; }
      if (s.rel >= 0 && s.climber && s.lbArrive < 0) {
        const rel = { x: s.climber.pos.x - c.defender.pos.x, y: s.climber.pos.y - c.defender.pos.y };
        const closing = (s.climber.body.vel.x - c.defender.body.vel.x) * rel.x + (s.climber.body.vel.y - c.defender.body.vel.y) * rel.y;
        if (closing < 0) s.inwardAfter += 0.05;
        s.close = Math.min(s.close, Math.hypot(s.climber.pos.x - c.backer.pos.x, s.climber.pos.y - c.backer.pos.y));
      }
      if (c.backer && s.lbArrive < 0) { const e = sim.engagements.find((e: any) => e.defender === c.backer); if (e && s.workedAt < 0) { s.workedAt = +sim.t.toFixed(2); s.workedBy = e.blocker.slot; } if (lvl(c.backer)) s.lbArrive = +sim.t.toFixed(2); }
      if (s.dlArrive < 0) { if (sim.events.some((e: any) => e.type === 'carrier_contact' && e.b === c.defender.idx)) s.dlHit = true;
        if (lvl(c.defender)) { s.dlArrive = +sim.t.toFixed(2); s.dlHeld = sim.engagements.find((e: any) => e.defender === c.defender)?.blocker.slot ?? null; } }
    }
  }
  const res = sim.run();
  const log = g.__rel as any[];
  for (const c of combos) { const s = st.get(c);
    const applied = log.find(r => r.applied && r.t > s.rel - 0.051 && r.t < s.rel + 1e-6 && c.members.some((m: any) => m.slot === r.climber));
    const prop = applied && log.filter(r => !r.applied && Math.abs(r.t - applied.t) < 1e-6 && r.observer === applied.climber).at(-1);
    rows.push({ id: p.id, concept: p.concept, front: p.front, yards: res.yards, members: c.members.map((m: any) => m.slot).join('+'), down: c.defender.slot, backer: c.backer?.slot,
      released: s.rel, climber: applied?.climber ?? null, path: prop?.path ?? (applied ? (applied.check ? 'check' : '?') : null),
      near: prop?.near, ahead: prop?.ahead, flow: prop?.flow, arriving: prop?.arriving, inward: prop?.inward, closing: prop?.closing, exit: prop?.exit,
      worked: s.workedAt >= 0 && (s.lbArrive < 0 || s.workedAt <= s.lbArrive), workedAt: s.workedAt, workedBy: s.workedBy, lbArrive: s.lbArrive,
      closest: +s.close.toFixed(2), inwardAfter: +s.inwardAfter.toFixed(2), keeper: s.dlArrive < 0 ? null : (!s.dlHit && s.dlHeld !== null) });
  }
}
writeFileSync(process.argv[3], JSON.stringify(rows, null, 1));
console.log('rows', rows.length);
