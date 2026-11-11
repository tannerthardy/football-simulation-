// Targeted throws on the 732 panel: air yards of the target when the ball arrives, result, separation, defenders deeper.
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const out: string[] = [];
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    let T: any = null, arr: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; if (air && !T) T = (sim.ball as any).target; tick();
      if (air && sim.ball.kind !== 'air' && T && !arr) arr = { x: T.pos.x, y: T.pos.y, defs: sim.defense.map((d: any) => ({ ...d.pos })) }; };
    const r: any = sim.run(); const s: any = sim.stats;
    if (!arr || s.throwaway) continue;
    const ds = arr.defs.map((d: any) => Math.hypot(d.x - arr.x, d.y - arr.y));
    out.push(JSON.stringify({ air: arr.x - sim.los, res: s.interceptedBy ? 'IN' : s.completed ? 'C' : 'I', sep: Math.min(...ds), deeper: arr.defs.filter((d: any) => d.x > arr.x).length, yds: r.yards })); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);
