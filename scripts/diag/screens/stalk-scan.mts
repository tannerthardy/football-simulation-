// Stalk-close scene scan (Run Game, 2026-11-25), measurement only: test/stalk-close.test.ts's play (wide now screen, gun
// doubles, nickel Over, SCREEN_QB=1, MATCH_DECLARE=0 as the file pins; LANE_LEVERAGE at its default unless set), per
// coverage and seed: whether the stalk engages his man before the play is over, from behind, and how close the man came.
// Run once per STALK_CLOSE arm (flags are read at load). Usage: STALK_CLOSE=0|1 node --import tsx stalk-scan.mts COVS SEEDS
const COVS = (process.argv[2] ?? 'cover3,cover3_cloud,cover4').split(','), SEEDS = Number(process.argv[3] ?? 8);
const W = process.cwd();
const { CENTER_Y } = await import(`${W}/src/core/field.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { SCREEN_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const out: any[] = [];
for (const cov of COVS) for (let seed = 1; seed <= SEEDS; seed++) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: SCREEN_BY_ID.wide_now_screen, label: 'now' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
  if (sim.offCall.pass?.id !== 'wide_now_screen') { out.push({ cov, seed, skip: 'killed' }); continue; }
  sim.tick();
  const b = sim.offense.find((a: any) => a.behavior?.kind === 'screen-block' && a.behavior.job === 'stalk');
  if (!b) { out.push({ cov, seed, skip: 'no stalk' }); continue; }
  let got = false, behind = false, man: string | null = null;
  while (sim.phase !== 'dead' && sim.t < 5 && !got) {
    sim.tick();
    const e = b.engagement;
    if (e) { got = true; const d = e.defender === b ? e.blocker : e.defender; man = d.slot;
      const rel = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x) - d.body.facing;
      behind = Math.abs(Math.atan2(Math.sin(rel), Math.cos(rel))) >= (2 * Math.PI) / 3; }
  }
  out.push({ cov, seed, engaged: got, behind, man });
}
console.log(JSON.stringify(out));
