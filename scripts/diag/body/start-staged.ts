/** Staged zone plays, paired across DIR_START arms (identical until a body starts from rest differently, i.e. from the first lateral start): per play the result, YAC, missed tackles, sack, pressure, PBU, interception, time to throw.
 *   [DIR_START=1] node --import tsx scripts/diag/body/start-staged.ts OUT.jsonl [--rosters 1-3] [--seeds 1,2] [--shard 0/4] */
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const range = (s: string) => s.includes('-') ? Array.from({ length: Number(s.split('-')[1]) - Number(s.split('-')[0]) + 1 }, (_, i) => Number(s.split('-')[0]) + i) : s.split(',').map(Number);
const out = process.argv[2], rosters = range(arg('--rosters', '1-3')), seeds = range(arg('--seeds', '1,2')); const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const SET = arg('--set', 'zone');
const SETS: Record<string, { concepts: string[]; covs: string[] }> = {
  zone: { concepts: ['curl_flat', 'slant_flat', 'stick', 'mesh', 'drive', 'y_cross', 'smash', 'flood', 'quick_outs', 'hitch_cross', 'dagger', 'four_verts'], covs: ['cover2', 'cover3', 'cover4', 'cover6', 'cover2_match'] },
  man: { concepts: ['slant_flat', 'stick', 'mesh', 'drive', 'y_cross', 'quick_outs', 'hitch_cross', 'dagger', 'four_verts', 'curl_flat'], covs: ['cover1', 'cover0', 'cover2man', 'cover1_robber', 'pounder'] },
  rush: { concepts: ['four_verts', 'y_cross', 'dagger', 'flood', 'mesh', 'drive'], covs: ['cover3', 'cover1', 'cover0'] },
};

const concepts = SETS[SET].concepts, covs = SETS[SET].covs, forms = ['gun_doubles_11', 'gun_trips_11'];
const lines: string[] = []; let n = 0;
for (const formation of forms) for (const concept of concepts) for (const coverage of covs) for (const roster of rosters) for (const seed of seeds) {
  if (n++ % sn !== si) continue;
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
  const sepAt: Record<string, number[]> = { '1.0': [], '2.0': [] }; let dives = 0; const seen = new Set<number>(); const tick0 = sim.tick.bind(sim);
  let airT0 = -1, dmin = 99, dminSpeed = 0, dminT = 0, dminSlot = ''; sim.tick = () => { tick0(); if (sim.ball?.kind === 'air') { if (airT0 < 0) airT0 = sim.t; for (const d of sim.agents) if (d.team === 'D') { const q = Math.hypot(d.pos.x - sim.ball.flight.pos.x, d.pos.y - sim.ball.flight.pos.y); if (q < dmin) { dmin = q; dminSpeed = Math.hypot(d.vel.x, d.vel.y); dminT = sim.t - airT0; dminSlot = d.slot; } } } for (const tt of ['1.0', '2.0']) if (Math.abs(sim.t - Number(tt)) < 1e-6) for (const d of sim.agents) { const tg = d.team === 'D' && d.behavior?.kind === 'man' ? d.behavior.target : null; if (tg && tg.pos) sepAt[tt].push(Math.hypot(d.pos.x - tg.pos.x, d.pos.y - tg.pos.y)); } for (const a of sim.agents) { const s = a.body.support; if (a.team === 'D' && s?.state === 'falling' && s.cause === 'dive' && !seen.has(a.idx)) { seen.add(a.idx); dives++; } } };
  let res: any; try { res = sim.run(); } catch { continue; }
  const st = res.stats ?? sim.stats ?? {};
  lines.push(JSON.stringify({ k: `${formation}|${concept}|${coverage}|${roster}|${seed}`, completed: !!st.completed, yac: st.yac ?? null, sacked: !!st.sacked, pressured: !!st.pressured, pbu: !!st.passDefendedBy, int: !!st.interceptedBy, ttt: st.timeToThrow ?? null, yards: Math.round((res.yards ?? 0) * 100) / 100, missed: st.missedTackles ?? 0, sepCatch: st.separation ?? null, sep10: sepAt['1.0'].length ? sepAt['1.0'].reduce((x, y) => x + y, 0) / sepAt['1.0'].length : null, sep20: sepAt['2.0'].length ? sepAt['2.0'].reduce((x, y) => x + y, 0) / sepAt['2.0'].length : null, sep10max: sepAt['1.0'].length ? Math.max(...sepAt['1.0']) : null, td: res.outcome === 'touchdown', outcome: res.outcome, dives, dmin: dmin < 99 ? Math.round(dmin * 100) / 100 : null, dminSpeed: Math.round(dminSpeed * 100) / 100, dminT: Math.round(dminT * 100) / 100, dminSlot, flight: airT0 < 0 ? null : Math.round((sim.t - airT0) * 100) / 100 }));
}
writeFileSync(out, lines.join('\n') + '\n'); console.log(lines.length, 'plays ->', out);
