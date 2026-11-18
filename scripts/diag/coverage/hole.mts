// Hole diagnosis: for staged plays of one concept against a list of coverages, the throws to one target number. At the
// throw and at the catch: the two nearest defenders to the target (slot, rule, controller/technique, rule mode), the
// catch's air yards and the yards after it.
//   CONCEPT=drive COVS=cover4,cover6 NUM=W2 node --import tsx scripts/diag/coverage/hole.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const concept = process.env.CONCEPT!, NUM = process.env.NUM!;
const COVS = process.env.COVS!.split(',');
const who = (sim: any, d: any, t: any) => {
  const b = d.behavior; const st = b?.recordedRule ? b.recordedRule(-1) : null;
  return `${d.slot}:${b?.rule ?? b?.zone ?? '-'}/${b?.sub?.constructor?.name ?? b?.constructor?.name}/${st?.mode ?? '-'}@${Math.hypot(d.pos.x - t.pos.x, d.pos.y - t.pos.y).toFixed(1)}`;
};
const near = (sim: any, t: any) => sim.defense.slice().sort((p: any, q: any) => Math.hypot(p.pos.x - t.pos.x, p.pos.y - t.pos.y) - Math.hypot(q.pos.x - t.pos.x, q.pos.y - t.pos.y)).slice(0, 2).map((d: any) => who(sim, d, t)).join(' ');
for (const coverage of COVS) for (const formation of (process.env.FORMS?.split(',') ?? ['gun_doubles_11', 'gun_trips_11'])) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team);
  const slot = sim.offAlign.numbering[NUM] ?? (NUM === 'B' ? 'RB' : NUM);
  const T = sim.offense.find((r: any) => r.slot === slot); if (!T) continue;
  let atThrow = '', atCatch = '', air = NaN; let thrown = false, caught = false;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (!thrown && sim.throwAt >= 0) { thrown = true; atThrow = near(sim, T); }
    if (thrown && !caught && sim.ball.kind === 'held' && sim.ball.carrier === T) { caught = true; atCatch = near(sim, T); air = (T.pos.x - sim.los) * dir; }
  };
  const res = sim.run();
  if (!caught) continue;
  console.log(`${coverage} ${formation} s${seed} ${flip ? 'F' : '-'} yds ${res.yards.toFixed(1)} air ${air.toFixed(1)} yac ${(res.yards - air).toFixed(1)} | throw ${atThrow} | catch ${atCatch}`);
}
