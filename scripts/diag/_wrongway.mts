/** Zone runs: interior DL with a key step (KEY_REACT). At his first engagement: is the man blocking him his key, and
 * did his step go away from where that blocker came from (a wrong-way step: he gets down-blocked or washed)?
 * Also STANCE_TELL steps against the key's real first step. Depth change from engagement to +1.0 s by class. */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, number[]> = {}; let tells = 0, tellWrong = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const d2 = sim.attackDir(sim.offense[0].team);
  const S = new Map<any, any>(); const tellSide = new Map<any, number>();
  const tick = sim.tick.bind(sim); sim.tick = () => { tick();
    for (const d of sim.defense) { if (!/^(DE|DT|NT)/.test(d.slot)) continue;
      if (d.tags.has('tell-step') && !tellSide.has(d)) tellSide.set(d, d.stanceTellSide ?? 0);
      const s = S.get(d);
      if (!s && d.engagement && d.keyStep) { const b = d.engagement.blocker; const from = Math.sign(b.pos.y - d.pos.y);
        S.set(d, { t: sim.t, x: d.pos.x, key: d.keyStep.from === b, away: d.keyStep.side === -from && from !== 0 }); }
      else if (s && s.dx === undefined && sim.t >= s.t + 1.0) s.dx = -(d.pos.x - s.x) * d2; } };
  sim.run();
  for (const s of S.values()) if (s.dx !== undefined) { const k = `${s.key ? 'blocked by key' : 'blocked by other'}, ${s.away ? 'stepped away from him' : 'stepped toward/with him'}`; (R[k] ??= []).push(s.dx); }
}
let n = 0; for (const v of Object.values(R)) n += v.length;
for (const [k, v] of Object.entries(R).sort()) { v.sort((a, b) => a - b); console.log(`${k.padEnd(48)} ${(100 * v.length / n).toFixed(0).padStart(3)}%  n ${v.length}  depth change +1 s median ${v[v.length >> 1].toFixed(2)}  driven back >=0.5: ${(100 * v.filter(x => x <= -0.5).length / v.length).toFixed(0)}%`); }
