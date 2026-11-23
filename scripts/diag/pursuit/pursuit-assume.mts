// Stale-spot row (2026-11-23): for each completion, the nearest defender at the catch (D1) and the first defender in
// front: the carrier speed his pursuit forecast assumed when he first pursued (and each 0.1 s after), against the carrier's
// actual speed then and 0.5 / 1.0 s later; the stage that set his request. Uses pursuit-tap.mts (read-only trace sink).
// Usage: COVS=cover3,cover4 node --import tsx pursuit-assume.mts SEEDS OUT
const W = process.cwd();
const TAP = new URL('./pursuit-tap.mts', import.meta.url).href; const tap: any = await import(TAP); tap.install();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { readFileSync, writeFileSync, mkdtempSync } = await import('node:fs');
const SEEDS = Number(process.argv[2] ?? 1), OUT = process.argv[3];
const COVS = (process.env.COVS ?? 'cover3,cover4,cover6,tampa2').split(',');
const tmp = mkdtempSync('/tmp/pa-'); const out: any[] = [];
for (const cov of COVS) for (const concept of Object.keys(PASS_BY_ID)) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed, roster: seed, formation, flip })); sim.run(); } catch { continue; }
    if (!sim.stats.completed) continue;
    const f = `${tmp}/x.json`; tap.dump(sim, f); let J: any; try { J = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    if (J.frames.length < 3) continue;
    out.push({ key: [cov, concept, formation, seed, flip], ...J });
  }
writeFileSync(OUT, JSON.stringify(out)); console.log('rows', out.length);
