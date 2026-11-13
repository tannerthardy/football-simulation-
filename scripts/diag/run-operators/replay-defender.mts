// Replay named restage plays; print the given defender's depth/engagement/blocker every 0.25 s to 1.5 s.
import { readFileSync } from 'node:fs';
const W = process.argv[2]; const plays = JSON.parse(readFileSync(process.argv[3], 'utf8')); const pick: Record<string, number> = JSON.parse(process.argv[4]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
for (const [id, j] of Object.entries(pick)) { const st: any = restoreSetup(Buffer.from(plays[id].setup, 'base64')); const sim: any = new PlaySim(st);
  const d = sim.defense[j]; const t0 = sim.t; let line = `${id} ${st.offCall.run.scheme} ${d.slot}:`;
  while (sim.phase === 'live' && sim.t - t0 < 1.51) { sim.tick(); const t = sim.t - t0;
    if (Math.abs(t * 4 - Math.round(t * 4)) < 1e-6 && t > 0) line += ` t${t.toFixed(2)} x${((d.pos.x - sim.los)).toFixed(2)} ${d.engagement ? 'eng:' + d.engagement.blocker.slot : 'free'}`; }
  console.log(line); }
