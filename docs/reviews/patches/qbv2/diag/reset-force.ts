// Reset cells, outcome per play: does the cycle reach the backside reset, who he throws, when, complete, yards.
//   CON=quick_outs WEAK=hitches COV=cover2 FORM=gun_doubles_11 node --import tsx reset-out.ts <tree>
import { PlaySim } from '../wt947/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt947/src/playbook/concepts.js';
import { HALF_BY_ID } from '../wt947/src/playbook/calls/halves.js';
import { nativeTraceSetup } from '../wt947/scripts/diag/command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
const CON = process.env.CON!, WEAK = process.env.WEAK!, COV = process.env.COV!, FORM = process.env.FORM ?? 'gun_doubles_11';
const out: any[] = [];
for (let seed = 1; seed <= 30; seed++) {
  const setup: any = nativeTraceSetup({ concept: CON, coverage: COV, seed, roster: 3, formation: FORM, flip: false });
  setup.offCall.pass = { ...(PASS_BY_ID as any)[CON], ...(CON === 'quick_outs' ? { back: 'back_flat' } : {}), weak: { ...HALF_BY_ID[WEAK].routes } };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let reset = false, thrown: any = null;
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = { t: sim.t, slot: t?.slot ?? 'away' }; return tb(q, t, ...r); };
  let patched = false; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2; if (v2 && !patched) { patched = true; const cy: any = v2.cycle, orig = cy.choose.bind(cy); cy.choose = (s: any, r: any) => { if (r.look.kind === "receiver" && r.look.ref === "W2") { const j = s.judge(r.throws[0]); if (j && !j.early) return j; } return orig(s, r); }; } if (v2 && !thrown) { const rd = v2.plan.reads[v2.cycle.readIdx]; const lr = rd ? (rd.look.kind === 'receiver' ? rd.look.ref : (rd.look.side ?? 'S')) : ''; if (lr.startsWith('W')) reset = true; } };
  let res: any = null; try { res = sim.run(); } catch {}
  if (reset) out.push({ seed, to: thrown?.slot ?? '-', t: thrown ? r2(thrown.t) : null, cmp: !!sim.stats.completed, yds: res ? r2(res.yards ?? 0) : null, sack: !!sim.stats.sacked });
}
const by: Record<string, number> = {}; for (const o of out) by[o.to] = (by[o.to] ?? 0) + 1;
const rel = out.filter((o) => o.t).map((o) => o.t).sort((a, b) => a - b);
console.log(`${CON}+${WEAK} ${COV}: resets ${out.length} to ${JSON.stringify(by)} cmp ${out.filter((o) => o.cmp).length} yds ${r2(out.reduce((s, o) => s + (o.yds ?? 0), 0))} (${r2(out.reduce((s, o) => s + (o.yds ?? 0), 0) / Math.max(1, out.length))}/play) rel p50 ${rel[rel.length >> 1] ?? '-'} sacks ${out.filter((o) => o.sack).length}`);
