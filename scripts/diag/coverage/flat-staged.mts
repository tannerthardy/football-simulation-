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
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { FIELD_WIDTH } = await import(`${W}/src/core/field.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const rows: any[] = [];
for (const concept of concepts) for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    const arm: any = {};
    for (const on of [false, true]) {
      if (on) process.env[FLAG] = '1'; else delete process.env[FLAG];
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
      arm[on ? 'on' : 'off'] = { tgt, yards: res.yards, outcome: res.outcome, cov: sim.defCall.coverage.id };
    }
    delete process.env[FLAG];
    if (arm.off && arm.on) rows.push({ concept, coverage, formation, seed, flip, ...arm });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const cell = (t: any) => !t ? 'no throw' : t.depth < 5 && t.w < 15 && !t.ref.endsWith('1') ? 'flat / short outside' : t.ref.endsWith('1') && t.depth >= 8 ? '#1 at 8+' : 'other';
for (const fam of [['cover6', 'cover6_rev', 'cover8_trix'], ['cover2', 'cover2_match', 'tampa2']]) {
  const v = rows.filter((r) => fam.includes(r.coverage));
  console.log(`\n${fam.join('/')}: ${v.length} paired plays (${FLAG} off -> on)`);
  for (const arm of ['off', 'on']) {
    const by = new Map<string, number[]>();
    for (const r of v) { const k = cell(r[arm].tgt); (by.get(k) ?? by.set(k, []).get(k)!).push(r[arm].yards); }
    const all = v.map((r) => r[arm].yards);
    console.log(`  ${arm}: yd/play ${(all.reduce((s, x) => s + x, 0) / v.length).toFixed(2)} | ` + [...by].map(([k, ys]) => `${k} n ${ys.length} ${(ys.reduce((s, x) => s + x, 0) / ys.length).toFixed(1)} yd/att`).join(' | '));
  }
  const same = v.filter((r) => r.off.tgt?.slot === r.on.tgt?.slot && cell(r.off.tgt) === 'flat / short outside');
  console.log(`  same flat target in both arms: n ${same.length}, yards off ${(same.reduce((s, r) => s + r.off.yards, 0) / Math.max(1, same.length)).toFixed(1)} -> on ${(same.reduce((s, r) => s + r.on.yards, 0) / Math.max(1, same.length)).toFixed(1)}`);
}
