import { readFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
for (const id of process.argv.slice(2)) {
  const [s, i] = id.slice(1).split('-').map(Number);
  const p = JSON.parse(readFileSync(`out/matched-restage/seed${s}-run.json`, 'utf8'))[i];
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
  const sim: any = new PlaySim(st); const r = sim.run();
  const ev = sim.events.filter((e: any) => !/^(read|block_contact|tick)$/.test(e.type)).map((e: any) => `${e.type}@${e.t.toFixed(2)}`);
  console.log(id, st.offCall?.label ?? '', st.offCall?.kind, st.offCall?.run?.id ?? '', 'yards', r.yards.toFixed(1), r.outcome, '|', ev.slice(0, 12).join(' '));
}
