// Usage (from a worktree root): node --import tsx <this> — replays K01..K03 (and flipped) to the end.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { PlaySim } = await import(pathToFileURL(`${root}/src/sim/playsim.ts`).href);
const { RunBlocker } = await import(pathToFileURL(`${root}/src/sim/behaviors/blocking.ts`).href);
const inputs = JSON.parse(gunzipSync(readFileSync(`${root}/test/fixtures/puller-access-inputs.json.gz`)).toString());
for (const id of ['K01', 'K02', 'K03']) for (const flip of [false, true]) {
  const setup = structuredClone(inputs.rows.find((r: any) => r.id === id).setup);
  setup.offCall.flip = flip;
  const sim = new PlaySim(setup);
  const pullers = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull');
  const log: string[] = [], seen = new Map<string, string>();
  let firstContact: number | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const p of pullers) {
      const e = p.engagement, tgt = (p.behavior as any).plan.target;
      const k = `${p.slot}:${(p.behavior as any).plan.pullRole}:${tgt?.slot ?? '-'}:${e ? (e.blocker === p || e.helpers.includes(p) ? e.defender.slot : '?') : '-'}`;
      if (seen.get(p.slot) !== k) { seen.set(p.slot, k); log.push(`${sim.t.toFixed(2)} ${k}`); }
    }
  };
  const r = sim.run();
  const fc = r.events.find((e: any) => e.type === 'carrier_contact' || e.type === 'tackle_wrap');
  console.log(`${id}${flip ? '-flip' : ''} ${r.yards.toFixed(2)} ${r.outcome} firstContact ${fc ? fc.t.toFixed(2) + ' ' + (sim.agents[fc.b]?.slot ?? sim.agents[fc.a]?.slot ?? '') : '-'} turnups ${r.events.filter((e: any) => e.type === 'pull_turn_up').map((e: any) => e.t.toFixed(2)).join(',')}`);
  console.log('   ' + log.join(' | '));
}
