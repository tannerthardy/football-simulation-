// Staged fade-flat vs Cover 2: at 2.6 s, #1's depth, the flat corner's depth and distance to him, the half safety's depth and
// distance to him; how often the corner is level with or over #1. Read-only.   [flags] node --import tsx scripts/diag/coverage/c2-fade-stage.mts
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const rows: string[] = []; let onTop = 0, n = 0;
for (let seed = 1; seed <= 12; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept: 'fade_flat', coverage: 'cover2', seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  const one = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering.S1), cb = sim.defense.find((d: any) => (d.behavior as any)?.zone === 'flat_s');
  const saf = sim.defense.find((d: any) => /deep_half/.test((d.behavior as any)?.zone ?? '') && Math.sign(d.pos.y - sim.ballY) === Math.sign(one.pos.y - sim.ballY));
  let at: string | null = null; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (at === null && sim.t >= 2.6) { n++;
    const top = cb.pos.x >= one.pos.x - 0.5; if (top) onTop++;
    at = `s${seed} #1 d ${(one.pos.x - sim.los).toFixed(1)} | CB d ${(cb.pos.x - sim.los).toFixed(1)} dist ${Math.hypot(cb.pos.x - one.pos.x, cb.pos.y - one.pos.y).toFixed(1)} | half d ${saf ? (saf.pos.x - sim.los).toFixed(1) : '-'} dist ${saf ? Math.hypot(saf.pos.x - one.pos.x, saf.pos.y - one.pos.y).toFixed(1) : '-'}`; } };
  sim.run(); rows.push(at ?? `s${seed} -`);
}
console.log(rows.join('\n')); console.log('corner level or over #1 at 2.6 s:', onTop, 'of', n);
