/** Outside zone: OL and DL lateral request vs achieved toward the play side at 0.2-1.5 s, split free (no engagement)
 * and engaged; for engaged OL, which term set the lateral (mirror of the DL vs own track). */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { playSideSign, isOL } = await import(root + '/src/sim/behaviors/blocking.ts').then(async m => ({ ...m, isOL: (await import(root + '/src/sim/behaviors/common.ts')).isOL ?? m.isOL }));
const rows: Record<string, number[][]> = {}; const push = (k: string, v: number[]) => (rows[k] ??= []).push(v);
const T = [0.2, 0.3, 0.5, 0.8, 1.0, 1.2, 1.5];
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const run = sim.offCall.run; if (!run || !/^(outsideZone|wideZone)$/.test(run.scheme)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const ps = playSideSign(sim, run);
  const ol = sim.offense.filter((o: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
  const dl = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot));
  while (sim.phase === 'live' && sim.t < 1.55) {
    sim.tick();
    const k = T.find(x => Math.abs(sim.t - x) < 1e-6); if (k === undefined) continue;
    for (const [g, list] of [['OL', ol], ['DL', dl]] as const) for (const a of list) {
      const st = a.engagement ? 'eng' : 'free';
      push(`${g} ${st} ${k.toFixed(1)}`, [sim.intents[a.idx].vel.y * ps, a.vel.y * ps, Math.hypot(sim.intents[a.idx].vel.x, sim.intents[a.idx].vel.y)]);
    }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log('OZ lateral toward play side: request / achieved (median), request speed |v| median, n');
for (const g of ['OL free', 'OL eng', 'DL free', 'DL eng']) {
  console.log(`  ${g}: ` + T.map(t => { const v = rows[`${g} ${t.toFixed(1)}`] ?? []; return v.length ? `${t.toFixed(1)}s ${md(v.map(r => r[0])).toFixed(2)}/${md(v.map(r => r[1])).toFixed(2)} |${md(v.map(r => r[2])).toFixed(1)}| n${v.length}` : `${t.toFixed(1)}s -`; }).join('  '));
}
