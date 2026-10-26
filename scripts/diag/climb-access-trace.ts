/** Why a released climber's routes were rejected, from the command trace.
 *   node --import tsx scripts/diag/climb-access-trace.ts <set.bin> <play id> <O slot> [from] [to] [out.json]
 * <set.bin> is a zone-climb-ordinary.ts set (or Phase II current-zone-set.bin). Prints each
 * step's raw and final request, then every departure access search in it: each surface's current
 * gap and bound, each candidate arc's rejection and the braking fallback. Observation only. */
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import type { Vec2 } from '../../src/core/vec.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';

const [setFile, id, slot, from = '0.9', to = '3.0', out] = process.argv.slice(2);
if (!setFile || !id || !slot) throw new Error('Usage: climb-access-trace.ts <set.bin> <play id> <O slot> [from] [to] [out.json]');
const play = (deserialize(readFileSync(setFile)) as Array<{ id: string; setup: Buffer }>).find(p => p.id === id);
if (!play) throw new Error(`${id} is not in ${setFile}`);
const sim = new PlaySim(restoreSetup(Buffer.from(play.setup)));
const trace = sim.recordCommands({ actor: { team: 'O', slot }, from: Number(from), to: Number(to) });
const result = sim.run();
const v = (p?: Vec2) => p ? `(${p.x.toFixed(2)},${p.y.toFixed(2)})` : '-';
const n = (x: number) => x.toFixed(3);
for (const s of trace.steps) {
  const e = s.start.engagement;
  console.log(`${s.stepStart.toFixed(2)} ${s.start.behavior.job}->${s.start.behavior.target?.slot ?? '-'} raw ${v(s.decision?.raw.vel)} final ${v(s.final?.vel)}`
    + ` pos ${v(s.start.body.position)} vel ${v(s.start.body.velocity)}${e ? ` ${e.blocker.slot}>${e.defender.slot}` : ''}`
    + ` ${s.start.lastStepContacts.map(c => `${c.other.slot}:${c.impulse.toFixed(1)}`).join(' ')} ${s.rewrites.map(r => r.stage).join(',')}`);
  for (const c of s.climbAccess ?? []) {
    const d = c.data, name = (key: number) => c.surfaces[d.surfaces.findIndex(q => q.key === key)]?.slot ?? String(key);
    console.log(`   access -> ${c.target.slot}: ${d.result}, obstacle ${d.obstacle === null ? '-' : name(d.obstacle)}; `
      + d.surfaces.map((q, i) => `${c.surfaces[i].slot} now ${n(q.current)} bound ${n(q.allowed)} route ${n(q.original)}`).join(' | '));
    for (const k of d.candidates) console.log(`     arc ${k.sign >= 0 ? '+' : ''}${k.sign} goal ${v(k.goal)} ${k.rejected ?? 'admissible'}`
      + (k.support ? ` at step ${k.support.step} (${k.support.state})` : '')
      + (k.failed ? ` vs ${k.failed.map(name).join(',')}` : '')
      + (k.gaps ? `; gaps ${k.gaps.map((g, i) => `${c.surfaces[i].slot} ${n(g)}`).join(' ')}` : '')
      + (k.score !== undefined ? `; ${k.score.toFixed(2)} yd from backer` : ''));
    if (d.fallback) console.log(`     fallback ${d.fallback.chose}: braking ${n(d.fallback.braking)} vs route ${n(d.fallback.original)}; braking gaps `
      + d.fallback.gaps.map((g, i) => `${c.surfaces[i].slot} ${n(g)}`).join(' '));
  }
}
console.log(`result ${result.outcome} ${result.yards.toFixed(2)} yd; first carrier contact `
  + (sim.events.filter(e => e.type === 'carrier_contact').slice(0, 1).map(e => `${e.t}s ${e.b !== undefined ? sim.agents[e.b].slot : ''}`)[0] ?? 'none'));
if (out) writeFileSync(out, JSON.stringify(trace.steps));
