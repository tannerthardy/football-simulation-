// Controlled arms on staged plays: every non-screen pass concept from two-by-two and trips sets against the Cover 2 family
// and Cover 6 calls, seeds x flips, each played twice with the same setup and seed: FLAG off, then FLAG on (the flag is
// read per call). Per throw: the target's number, depth and width at the release, the outcome and yards; then a
// per-cell comparison (all throws; flat / short outside, non-#1; #1 at 8+ yd), paired by setup.
//   FLAG=SQUAT_SINK node --import tsx scripts/diag/coverage/flat-staged.mts [seeds] [coverages] [out.jsonl]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3);
const COVS = (process.argv[3] ?? 'cover6,cover6_rev,cover8_trix,cover2,cover2_match,tampa2').split(',');
const outPath = process.argv[4] ?? 'out/diag/coverage/flat-staged.jsonl';
const FLAG = process.env.FLAG ?? 'SQUAT_SINK';
// ARMS="base;SQUAT_SINK;SQUAT_SINK,FLIGHT_BREAK": each arm is a set of flags switched on for that run (base = none).
const ARMS = (process.env.ARMS ?? `base;${FLAG}`).split(';').map((x) => (x === 'base' ? [] : x.split(',')));
const armName = (f: string[]) => (f.length ? f.join('+') : 'base');
const ALLFLAGS = [...new Set(ARMS.flat())];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { FIELD_WIDTH } = await import(`${W}/src/core/field.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const rows: any[] = [];
for (const concept of concepts) for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    const arm: any = {};
    for (const flags of ARMS) {
      for (const f of ALLFLAGS) delete process.env[f];
      for (const f of flags) process.env[f] = '1';
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { break; }
      let tgt: any = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (!tgt && sim.ball?.kind === 'air' && sim.ball.target) {
          const T = sim.ball.target, dir = sim.attackDir('O'), nr: Record<string, string> = {};
          for (const [ref, slot] of Object.entries(sim.offAlign.numbering ?? {})) if (slot) nr[slot as string] = ref;
          tgt = { slot: T.slot, ref: nr[T.slot] ?? '?', depth: (T.pos.x - sim.los) * dir, w: Math.min(T.pos.y, FIELD_WIDTH - T.pos.y), t: sim.t };
        }
      };
      let res: any; try { res = sim.run(); } catch { break; }
      arm[armName(flags)] = { tgt, yards: res.yards, outcome: res.outcome, cov: sim.defCall.coverage.id, yac: res.stats?.yac ?? null };
    }
    for (const f of ALLFLAGS) delete process.env[f];
    if (ARMS.every((f) => arm[armName(f)])) rows.push({ concept, coverage, formation, seed, flip, arms: arm });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const cell = (t: any) => !t ? 'no throw' : t.depth < 5 && t.w < 15 && !t.ref.endsWith('1') ? 'flat' : t.ref.endsWith('1') && t.depth >= 8 ? '#1 8+' : 'other';
const fams = [...new Set(rows.map((r) => r.coverage))];
for (const cov of [fams]) {
  const v = rows.filter((r) => cov.includes(r.coverage));
  console.log(`${cov.join('/')}: ${v.length} paired plays`);
  for (const f of ARMS) {
    const k = armName(f), by = new Map<string, number[]>();
    for (const r of v) { const c = cell(r.arms[k].tgt); (by.get(c) ?? by.set(c, []).get(c)!).push(r.arms[k].yards); }
    const all = v.map((r) => r.arms[k].yards), comp = v.filter((r) => r.arms[k].tgt && r.arms[k].outcome !== 'incomplete' && r.arms[k].outcome !== 'interception').length;
    console.log(`  ${k.padEnd(26)} yd/play ${(all.reduce((s, x) => s + x, 0) / v.length).toFixed(2)} | comp/throw ${(comp / Math.max(1, v.filter((r) => r.arms[k].tgt).length)).toFixed(3)} | ` + ['flat', '#1 8+', 'other', 'no throw'].map((c) => { const ys = by.get(c) ?? []; return `${c} n ${ys.length} ${(ys.reduce((s, x) => s + x, 0) / Math.max(1, ys.length)).toFixed(1)}`; }).join(' | '));
  }
}
