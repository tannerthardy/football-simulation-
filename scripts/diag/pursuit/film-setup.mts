// Film-room play setup capture and replay (2026-11-23), for running one film play on another engine build.
//   capture: node --import tsx film-setup.mts capture KEYS.json F09 OUT.bin   (engine the keys were cut on)
//   replay:  node --import tsx film-setup.mts replay OUT.bin                  (any build; prints the play's result)
// The PlaySetup handed to the engine for that play is captured through simulateGame's playSetup hook (v8 serialised).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const v8 = await import('node:v8'); const { readFileSync, writeFileSync } = await import('node:fs');
const mode = process.argv[2];
if (mode === 'capture') {
  const [, , , KEYS, ID, OUT] = process.argv;
  const { Rng } = await import(`${W}/src/core/rng.ts`);
  const { generateTeam } = await import(`${W}/src/league/team.ts`);
  const { simulateGame } = await import(`${W}/src/game/game.ts`);
  const k = JSON.parse(readFileSync(KEYS, 'utf8')).find((x: any) => x.f === ID);
  const rng = new Rng(101);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let last: Buffer | null = null;
  const setups: { bytes: Buffer; los: number; cov: string; form: string }[] = [];
  const res = simulateGame(home, away, { seed: 101 + k.game, record: true, recordLevel: 'light', hooks: {
    playSetup: (s: any) => { last = v8.serialize(s); },
    playResult: (sim: any) => { if (last) setups.push({ bytes: last, los: sim.los, cov: sim.defCall?.coverage?.id, form: sim.offCall?.formation?.id }); last = null; return undefined; } } });
  const p = res.log[k.index];
  // the log entries with a plan in order against the captured scrimmage setups in order
  let j = 0, hit: any = null;
  for (const q of res.log) { if (!q.replay || !q.plan) continue;
    for (let i = j; i < setups.length; i++) { const s = setups[i];
      if (Math.abs(s.los - q.replay.los) < 0.01 && s.form === q.plan.formation && s.cov === q.plan.coverage) { j = i + 1; if (q === p) hit = s; break; } } }
  if (!hit) throw new Error('no setup for ' + ID);
  writeFileSync(OUT, hit.bytes); console.log(ID, p.text);
} else {
  const s = v8.deserialize(readFileSync(process.argv[3]));
  // v8 serialisation keeps data, not classes: give the two scouting reports their classes back.
  const { ScoutingReport } = await import(`${W}/src/sim/recognition.ts`); const { CoverageScouting } = await import(`${W}/src/sim/qbmind.ts`);
  if (s.scouting) Object.setPrototypeOf(s.scouting, ScoutingReport.prototype);
  if (s.coverageScouting) Object.setPrototypeOf(s.coverageScouting, CoverageScouting.prototype);
  if (process.argv[4]) { const T = await import(process.argv[4]); T.install?.(); }
  const sim = new PlaySim(s); const r = sim.run();
  if (process.argv[4]) { const T = await import(process.argv[4]); T.dump?.(sim, process.argv[5]); }
  console.log(JSON.stringify({ yards: r.yards ?? r.gain, completed: sim.stats.completed, events: sim.events.filter((e: any) => /tackle|missed|out_of_bounds|touchdown/.test(e.type)).map((e: any) => [Math.round(e.t * 100) / 100, e.type, sim.agents[e.a]?.slot]) }));
}
