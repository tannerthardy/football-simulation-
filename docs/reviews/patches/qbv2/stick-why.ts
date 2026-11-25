// Stick vs cover3: V2's flat key, his picture against the true man, and the cue, every 0.1 s from the snap to the throw.
//   QB_V2=1 QB_QUICK_DRIFT=3 node --import tsx scripts/diag/qbv2/stick-why.ts cover3 1-6
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const r1 = (x: number) => Math.round(x * 10) / 10;
const [cov = 'cover3', seeds = '1-6'] = process.argv.slice(2); const [s0, s1] = seeds.split('-').map(Number);
for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept: 'stick', coverage: cov, seed, roster: 3, formation: 'gun_trips_11', flip: false });
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let last = -1, thrown: string | null = null; const rows: string[] = [];
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = `${r1(sim.t)} ${t?.slot ?? 'away'}`; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h; if (!v2 || !h || thrown) return;
    if (sim.t - last < 0.099) return; last = sim.t;
    const pic = v2.picture(h), m = v2.roles.resolve(pic, 'flat', 'S'), sg = pic.strong;
    const d = m ? sim.agents[m.id] : null, o = (y: number) => r1((y - sim.ballY) * sg);
    const S2 = v2.receiver?.(h, 'S2'), S3 = v2.receiver?.(h, 'S3');
    const p2 = S2 ? v2.seenAt(h, S2, 0.5) : null, p3 = S3 ? v2.seenAt(h, S3, 0.5) : null;
    rows.push(`${r1(sim.t)} key ${d?.slot ?? '-'} seen(${m ? r1(m.x - sim.los) + ',' + o(m.y) + ' v' + r1(m.vy * sg) : '-'}) true(${d ? r1(d.pos.x - sim.los) + ',' + o(d.pos.y) + ' v' + r1(d.vel.y * sg) : '-'}) stick+.5 ${p2 ? o(p2.y) : '-'} flat+.5 ${p3 ? o(p3.y) : '-'} cue ${JSON.stringify(Object.fromEntries(v2.cue ?? []))} st ${v2.cycle.state}/${v2.cycle.readIdx}`);
    if (sim.t > 3.5) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { rows.push('err ' + String((e as Error).message).slice(0, 100)); }
  console.log(`seed ${seed} thrown ${thrown}\n  ` + rows.filter((_, i) => i >= 4).join('\n  '));
}
