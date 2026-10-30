import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const c: Record<string, number> = {}; const tag = (k: string) => c[k] = (c[k] ?? 0) + 1;
for (const seed of ['7']) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/outsideZone|wideZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    for (const o of sim.offense) {
      const b: any = o.behavior; if (!(b instanceof RunBlocker) || !b.plan.combination || b.plan.combination.released) continue;
      const e = o.engagement; if (!e || e.blocker !== o || !e.helpers.length) continue;
      tag('owner joined'); tag('kind ' + b.plan.kind); tag('surfaceAxis ' + !!e.surfaceAxis); tag('zoneRead ' + (b.zoneRead ? 'phase ' + b.zoneRead.phase + (b.zoneRead.target === e.defender.idx ? ' on man' : ' other') : 'none'));
    }
  }
}
console.log(JSON.stringify(c, null, 1));
