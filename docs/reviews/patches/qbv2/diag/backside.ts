// sf_c3: once he is on the backside read (read 1, W key), per play: when he got there, the W cue, W1/W2 judged P/risk/early
// over the read, and the truth at his last tick on it: each W receiver's separation from the nearest defender and that
// defender's distance closing; then what he threw. Observer for truth only.
import { PlaySim } from '../wt950/src/sim/playsim.js';
import { PASS_BY_ID } from '../wt950/src/playbook/concepts.js';
import { nativeTraceSetup } from '../wt950/scripts/diag/command-trace.js';
const r2 = (x: any) => typeof x === 'number' ? Math.round(x * 100) / 100 : x;
const rows: any[] = [];
for (let seed = 1; seed <= 30; seed++) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) setup.offense.QB.ratings[k] = 60; setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let on: number | null = null, off: number | null = null, thrown: any = null; const best: Record<string, any> = {};
  const tb = sim.throwBall.bind(sim); sim.throwBall = (q: any, t: any, ...r: any[]) => { if (!thrown) thrown = { t: r2(sim.t), slot: t?.slot ?? 'away' }; return tb(q, t, ...r); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const v2 = sim.qb.behavior?.v2, h = sim.qb.behavior?.v2h; if (!v2 || !h || thrown) return;
    if (v2.cycle.readIdx === 1 && on === null) on = sim.t; if (v2.cycle.readIdx >= 2 && on !== null && off === null) off = sim.t;
    if (v2.cycle.readIdx === 1) for (const ref of ['W1', 'W2']) { const j = v2.lastJudged.get(ref); const rc = v2.target(h, ref); if (!rc) continue;
      const sep = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - rc.pos.x, d.pos.y - rc.pos.y)));
      const b = best[ref]; if (j && (!b || j.P > b.P)) best[ref] = { P: r2(j.P), risk: r2(j.risk), early: j.early, at: r2(sim.t), sepTrue: r2(sep), route: rc.behavior?.route?.id }; } };
  try { sim.run(); } catch {}
  if (on === null) continue;
  rows.push({ seed, on: r2(on), off: r2(off), cue: JSON.stringify(Object.fromEntries(sim.qb.behavior?.v2?.cue ?? [])), W1: best.W1, W2: best.W2, thrown, cmp: !!sim.stats.completed });
}
for (const r of rows) console.log(JSON.stringify(r));
const bar = 0.56, rk = 0.0425;
const clr = (x: any) => x && x.P >= bar && x.risk <= rk;
console.log('reached backside', rows.length, '| W1 ever clear', rows.filter((r) => clr(r.W1)).length, 'W2 ever clear', rows.filter((r) => clr(r.W2)).length, '| thrown', JSON.stringify(rows.reduce((m: any, r) => (m[r.thrown?.slot ?? '-'] = (m[r.thrown?.slot ?? '-'] ?? 0) + 1, m), {})));
