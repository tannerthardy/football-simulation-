/** Combo members on gap runs: depth (vs LOS) at first contact and at departure to the second level. */
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const contact: number[] = [], depart: number[] = [], departT: number[] = [];
for (const concept of ['power', 'counter', 'trap', 'duo']) for (const dir of ['strong', 'weak']) for (const [look] of LOOK_SPECS.slice(0, 6)) {
  let sim; try { sim = makeSim({ concept, dir, formation: 'i_pro_21', look, roster: 'pair11', seed: 77 } as never, R); } catch { continue; }
  const ad = sim.attackDir('O');
  const members = sim.offense.filter(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.kind === 'combo');
  const seen = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    for (const m of members) {
      const p = (m.behavior as RunBlocker).plan ?? {} as any, s = seen.get(m) ?? {};
      if (s.c === undefined && m.engagement) s.c = (m.pos.x - sim.los) * ad;
      if (s.c !== undefined && s.d === undefined && (p.combination?.released || p.kind === 'climb')) { s.d = (m.pos.x - sim.los) * ad; s.t = sim.t; }
      seen.set(m, s);
    }
  }
  for (const s of seen.values()) { if (s.c !== undefined) contact.push(s.c); if (s.d !== undefined) { depart.push(s.d); departT.push(s.t); } }
}
const q = (a: number[], f: number) => { const b = [...a].sort((x, y) => x - y); return b.length ? r2(b[Math.floor(f * (b.length - 1))]) : null; };
console.log(`combo members: contact depth p25/50/75 ${q(contact, .25)}/${q(contact, .5)}/${q(contact, .75)} n ${contact.length} | departure depth p25/50/75 ${q(depart, .25)}/${q(depart, .5)}/${q(depart, .75)} behind LOS ${depart.filter(x => x < 0).length}/${depart.length} | departure t p50 ${q(departT, .5)}`);
