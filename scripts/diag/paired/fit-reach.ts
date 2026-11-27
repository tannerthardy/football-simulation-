/** Census: label-free run-fit jobs whose gap lies more than 3 yd from the man, on a paired-replay capture.
 *   npx tsx scripts/diag/paired/fit-reach.ts out/paired-e111/path-<id>   (FIT_RULES=0 for the faithful path) */
import { deserialize } from 'node:v8';
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ScoutingReport } from '../../../src/sim/recognition.js';
import { CoverageScouting } from '../../../src/sim/qbmind.js';
import { buildRunFits, FIT_RULES } from '../../../src/sim/run-fits.js';
import { gapY } from '../../../src/playbook/alignment.js';
const dir = process.argv[2]; let snaps = 0; const far: Record<string, number> = {}; const ex: string[] = []; let jobsN = 0;
for (let g = 1; g <= 16; g++) for (const b of deserialize(readFileSync(`${dir}/setups-${g}.bin`)) as Buffer[]) {
  const s = deserialize(b); if (s.offCall.kind !== 'run') continue;
  if (s.scouting) Object.setPrototypeOf(s.scouting, ScoutingReport.prototype);
  if (s.coverageScouting) Object.setPrototypeOf(s.coverageScouting, CoverageScouting.prototype);
  const sim = new PlaySim(s); snaps++;
  for (const [d, j] of buildRunFits(sim)) {
    if (j.kind === 'alley' || j.kind === 'force') continue; jobsN++;
    const gy = gapY(sim.offAlign as any, j.gap, j.side); const dy = Math.abs(gy - d.pos.y);
    if (dy > 3) { const sp = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!; const depth = (sp.pos.x - sim.los) * sim.attackDir('O');
      const k = `${j.kind} ${depth < 2 ? 'on-line' : 'off'} ${sp.role.kind}`; far[k] = (far[k] ?? 0) + 1;
      if (ex.length < 12) ex.push(`g${g} ${s.offCall.formation.id} vs ${s.defCall.personnel}/${s.defCall.front?.id}/${s.defCall.coverage?.id}: ${d.slot} ${j.kind} ${j.gap}${j.side > 0 ? '+' : '-'} at y ${(d.pos.y - sim.ballY).toFixed(1)}, depth ${depth.toFixed(1)}, role ${sp.role.kind}${(sp as any).manTarget ? ' on ' + (sp as any).manTarget : ''}; gap ${dy.toFixed(1)} yd away`); }
  }
}
console.log(FIT_RULES ? 'FIT_RULES on' : 'off', 'run snaps', snaps, 'gap jobs', jobsN, 'more than 3 yd from the man:', JSON.stringify(far)); console.log(ex.join('\n'));
