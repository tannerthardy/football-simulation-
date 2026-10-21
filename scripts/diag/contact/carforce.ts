// usage: carforce.ts CASE_ID [FROM] [TO]
// Carrier force balance while held: achieved accel along his travel, the
// holds' force on him along it, and the remainder (ground + other contacts).
import { makeSim, rosters } from '../zone-lab/lab.js';
const [id, from = '0', to = '8'] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as any, rosters());
const f = (v: number) => v.toFixed(0);
let prev: any = null;
while (sim.phase === 'live' && sim.t < Number(to)) {
  const c0 = sim.carrier, v0 = c0 ? { ...c0.vel } : null;
  sim.tick();
  const b = sim.bond, c = sim.carrier;
  if (!b || !c || !v0 || sim.t < Number(from)) continue;
  const s = Math.hypot(c.vel.x, c.vel.y) || 1, ux = c.vel.x / s, uy = c.vel.y / s;
  const m = c.profile.massKg;
  const acc = ((c.vel.x - v0.x) * ux + (c.vel.y - v0.y) * uy) / sim.dt * m;
  let hold = 0;
  for (const d of b.tacklers) { const j: any = b.holds!.get(d); const n = j?.normalForceOnB ?? { x: 0, y: 0 }, t = j?.tangentForceOnB ?? { x: 0, y: 0 };
    hold += (n.x + t.x) * ux + (n.y + t.y) * uy; }
  const lean: any = (sim.world as any).braceX ? Math.hypot((sim.world as any).braceX[c.idx], (sim.world as any).braceY[c.idx]) : NaN;
  console.log(`t ${sim.t.toFixed(2)} v ${s.toFixed(2)} m*a ${f(acc)} holds ${f(hold)} rest ${f(acc - hold)} lean ${f(lean)} n ${b.tacklers.length} ${c.body.support?.state}`);
}
