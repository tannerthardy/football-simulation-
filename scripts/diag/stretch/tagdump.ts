/** One slot's request, intent and achieved velocity each tick, with the branch path
 * that produced the request. Runs in an instrumented copy (instrument.sh).
 * node --import tsx scripts/diag/stretch/tagdump.ts CASE_ID SLOT FROM TO */
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
let cur: string[] = [];
(globalThis as any).__tag = (l: string, v: unknown) => { if (v && typeof v === 'object' && 'vel' in (v as object)) cur.push(l); return v; };
const [id, slot, from, to] = process.argv.slice(2);
const [concept, dir, formation, look, roster, seed] = id.split('/');
const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as LabCase, rosters());
const a = sim.agents.find(x => x.slot === slot)!;
let tags: string[] = [];
let tick = 0;
while (sim.phase === 'live' && sim.t < Number(to ?? 3)) {
  const b = a.behavior as unknown as Record<string | symbol, unknown>;
  if (!b.__w) { const o = (b.update as (...x: unknown[]) => unknown).bind(b); b.update = (...x: unknown[]) => { cur = []; const r = o(...x); tags = cur; cur = []; return r; }; b.__w = true; }
  sim.tick();
  if (sim.t < Number(from ?? 0) || tick++ % 1) continue;
  const c = (sim as any).cmds[a.idx].vel, it = (sim as any).intents[a.idx].vel;
  const f = (v: { x: number; y: number }) => `${Math.hypot(v.x, v.y).toFixed(2)}@${(Math.atan2(v.y, v.x) * 180 / Math.PI).toFixed(0).padStart(4)}`;
  console.log(`t ${sim.t.toFixed(2)} req ${f(c)} int ${f(it)} vel ${f(a.vel)} pos ${a.pos.x.toFixed(2)},${a.pos.y.toFixed(2)} ${a.engagement ? 'ENG ' : ''}${[...tags].reverse().filter(t => !t.includes('availableTarget')).slice(0, 4).join(' > ')}`);
}
