/** Census of label-free run-fit jobs on a paired-replay capture (every scrimmage snap's setup).
 *   npx tsx scripts/diag/paired/fit-reach.ts out/paired-e111/path-<id> [more dirs] > out/fr-on.json
 *   FIT_REACH=0 npx tsx ... > out/fr-off.json      (FIT_RULES=0 for the faithful path)
 * Prints JSON: per snap, whether it is a called run, the unowned gaps, a job signature, and each job whose gap lies
 * more than 3 yd from the man (with where it comes from: on the line or off it, and his coverage role). */
import { deserialize } from 'node:v8';
import { readdirSync, readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ScoutingReport } from '../../../src/sim/recognition.js';
import { CoverageScouting } from '../../../src/sim/qbmind.js';
import { buildRunFits } from '../../../src/sim/run-fits.js';
import { runFitJobs } from '../../../src/playbook/ir/fits.js';
import { describeDefense } from '../../../src/playbook/ir/describe.js';
import { gapY } from '../../../src/playbook/alignment.js';
const rows: unknown[] = [];
for (const dir of process.argv.slice(2)) for (const f of readdirSync(dir).filter((x) => x.startsWith('setups-')).sort()) {
  (deserialize(readFileSync(`${dir}/${f}`)) as Buffer[]).forEach((b, i) => {
    const s = deserialize(b);
    if (s.scouting) Object.setPrototypeOf(s.scouting, ScoutingReport.prototype);
    if (s.coverageScouting) Object.setPrototypeOf(s.coverageScouting, CoverageScouting.prototype);
    const sim = new PlaySim(s), jobs = buildRunFits(sim);
    const full = sim.defDesc ?? describeDefense(sim.defCall);
    const players = sim.defense.map((a) => full.players.find((p) => p.who.slot === a.slot)).filter((p): p is NonNullable<typeof p> => !!p);
    const pos = Object.fromEntries(sim.defense.map((a) => [a.slot, a.pos]));
    const res = runFitJobs({ ...full, players }, sim.defAlign, sim.offAlign, { pos, labelFree: true });
    const far: string[] = [];
    for (const [d, j] of jobs) {
      if (j.kind === 'alley' || j.kind === 'force') continue;
      const dy = Math.abs(gapY(sim.offAlign, j.gap, j.side) - d.pos.y);
      if (dy <= 3) continue;
      const sp = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]!, depth = (sp.pos.x - sim.los) * sim.attackDir('O');
      far.push(`${j.kind} ${depth < 2 ? 'on-line' : 'off'} ${sp.role.kind}`);
    }
    rows.push({ key: `${dir}/${f}#${i}`, run: s.offCall.kind === 'run', unowned: res.unowned.length,
      sig: [...jobs].map(([d, j]) => `${d.slot}:${j.kind}${j.gap}${j.side}${j.inside ? j.inside.gap + j.inside.side : ''}`).sort().join(' '), far });
  });
}
process.stdout.write(JSON.stringify(rows));
