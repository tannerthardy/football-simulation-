/** Find the first few open-field DB missed/broken attempts and command-trace that DB over the 0.8 s before. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); let shown = 0; const DB = /^(CB|FS|SS|NB)/;
const f = (v: any) => `(${v.x.toFixed(1)},${v.y.toFixed(1)})`;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || shown >= 3) continue;
  const mk = () => new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup) as any;
  const s1 = mk(); const d2 = s1.attackDir(s1.offense[0].team); let hit: any = null; const ev0 = s1.event.bind(s1);
  s1.event = (type: string, a: any, b: any, note?: string) => { if (!hit && (type === 'missed_tackle' || type === 'broken_tackle')) { const d = type === 'missed_tackle' ? a : b, c = type === 'missed_tackle' ? b : a;
      if (d && c && DB.test(d.slot) && (c.pos.x - s1.los) * d2 >= 3) hit = { slot: d.slot, team: d.team, t: s1.t, type }; } return ev0(type, a, b, note); };
  s1.run(); if (!hit) continue; shown++;
  const s2 = mk(); const tr = s2.recordCommands({ actor: { team: hit.team, slot: hit.slot }, from: hit.t - 0.8, to: hit.t }); s2.run();
  console.log(`== seed ${seed} ${p.call} ${hit.slot} ${hit.type} at ${hit.t.toFixed(2)}`);
  for (const st of tr.steps) { if (!st.decision?.evaluated || !st.final) continue;
    const pr = st.pursuit?.map((r: any) => `${r.data?.kind}:${r.data?.planner ?? ''}:${(r.data?.requests ?? []).map((q: any) => q.stage).join('/')}${r.data?.distance !== undefined ? ` d${r.data.distance.toFixed(1)}` : ''}${r.data?.gather !== undefined ? ` g${r.data.gather.toFixed(2)}` : ''}`).join(' | ') ?? '-';
    console.log(`${st.stepStart.toFixed(2)} ${st.decision.owner.kind} raw=${f(st.decision.raw.vel)} final=${f(st.final.vel)} got=${f(st.endpoint.body.velocity)} rw=${st.rewrites.map((r: any) => r.stage).join(',') || '-'} [${pr}]`); }
}
