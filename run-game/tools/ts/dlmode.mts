/** Engaged run DL (single blocker) by time: which depth mode his command comes from, and the OL's normal request. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runContactObservers } = await import(root + '/src/sim/run-contact-observer.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
const acc: Record<string, Record<string, number>> = {};
const put = (bin: string, k: string, v = 1) => { const a = (acc[bin] ??= {}); a[k] = (a[k] ?? 0) + v; };
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted || !sim.offCall.run) continue;
  const dir = sim.attackDir('O');
  runContactObservers.set(sim, (e: any, kind: string, data: any) => {
    if (e.helpers.length || !/^(DT|DE|NT)/.test(e.defender.slot)) return;
    const bin = sim.t < 1 ? 'a <1s' : sim.t < 2 ? 'b 1-2s' : sim.t < 3 ? 'c 2-3s' : 'd 3s+';
    if (kind === 'defender-movement') {
      const d = e.defender, c = sim.carrier;
      const past = !!(c && c.team === 'O' && c !== sim.qb && (c.pos.x - d.pos.x) * dir > 0);
      const mode = data.workOff ? (data.exitAim ? 'shed toward runner' : past ? 'shed across face, runner past' : 'shed across face, runner not past') : data.declared ? 'declared: aim at runner' : d.runFit?.technique === 'attack' ? 'attack/hold' : 'hold contact depth';
      put(bin, 'n'); put(bin, mode); put(bin, 'DL req toward own goal', data.command.vel.x * dir);
      if (c && c.team === 'O' && c !== sim.qb) put(bin, 'runner past DL depth', (c.pos.x - d.pos.x) * dir > 0 ? 1 : 0);
    }
    if (kind === 'movement') { put(bin, 'nOL'); put(bin, 'OL normal request (into DL)', data.normalRequest); if (data.anchored) put(bin, 'OL anchored'); }
  });
  while (sim.phase === 'live' && sim.t < 3.5) sim.tick();
}
for (const [bin, a] of Object.entries(acc).sort()) {
  const n = a.n;
  console.log(bin, `DL ticks ${n}:`, Object.entries(a).filter(([k]) => !['n','nOL','DL req toward own goal','OL normal request (into DL)','OL anchored'].includes(k)).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join('; '),
    `| DL depth request toward own goal ${(a['DL req toward own goal'] / n).toFixed(2)} | OL normal request ${(a['OL normal request (into DL)'] / a.nOL).toFixed(2)}, anchored ${(100 * (a['OL anchored'] ?? 0) / a.nOL).toFixed(0)}%`);
}
