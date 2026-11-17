// usage: PA_DROP=1 node --import tsx scripts/diag/pass-operators/uc-pa-depth.mts (one JSON row per staged under-centre PA play)
// Under-centre play action: the QB's depth at 2.0 s and the blocking back's distance to him, per staged play.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
for (const concept of ['pa_post_dig', 'pa_shot', 'pa_flood']) for (const formation of ['ace_11', 'ace_12', 'i_pro_21', 'ace_trips_11'])
  for (const coverage of ['cover1', 'cover3', 'cover4', 'cover2']) for (let roster = 1; roster <= 6; roster++) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false })); } catch { continue; }
    if (sim.offCall.formation.qb !== 'under') continue;
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < 2.0 && sim.throwAt < 0) sim.tick();
    if (sim.t < 1.99) continue;
    console.log(JSON.stringify({ k: `${concept}|${formation}|${coverage}|${roster}|${seed}`, qb: +((sim.los - sim.qb.pos.x) * dir).toFixed(2) }));
  }
