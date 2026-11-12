// Holding by the offence, per team-game (Integration, 2026-11-12: OPEN_HANDS reads). From the engine's own records:
// attempts (the blocker chose to hang on: 'legacy-hold' foul records), achieved restraints judged by the native
// detector ('native-holding' records: violation or unresolved), and calls (the play's called penalties of kind
// holding against the offence), split by play type (run / pass), with the yards the calls cost.
// NFL 2022 for reference: offensive holding accepted about 1.1 per team-game (611 with yardage + 144 dismissed in
// nflfastR via nflpenalties.com; 581 accepted on Pro-Football-Reference; 544 team-games).
// usage: [flags] node --import tsx scripts/diag/effective-mass/holds-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const c: Record<string, number> = {};
const add = (k: string, n = 1) => { c[k] = (c[k] ?? 0) + n; };
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const res = sim.run();
    const type = sim.isPass ? 'pass' : 'run';
    add(`${type} plays`);
    const offIds = new Set(sim.offense.map((a: any) => a.player.id));
    for (const r of sim.foulRecords) {
      if (r.kind !== 'holding' || !offIds.has(r.playerId)) continue;
      if (r.id.startsWith('legacy-hold')) add(`${type} attempts (hang on)`);
      else if (r.id.startsWith('native-holding')) {
        add(`${type} achieved restraint (${r.assessment})`);
        // Why it is unresolved: an exception (inside the frame, away from the point of attack, a double, ...) or a
        // borderline restraint; a called one is a clear restraint with none.
        const f: any = (r.evidence as any)?.facts ?? {};
        const why = f.exception ? `exception: ${f.exception}` : f.judgment ? `judgment: ${f.judgment}` : 'other';
        add(`${type}   - ${r.called ? 'called' : why}`);
        // HOLD_CALL: committed / material / called (each later stage counts in the earlier ones).
        if (f.holdStage) {
          add(`${type} HOLD_CALL committed`);
          if (f.holdStage !== 'committed') add(`${type} HOLD_CALL material`);
          if (f.holdStage === 'called') add(`${type} HOLD_CALL called`);
          if (f.holdStage !== 'committed') add(`${type} HOLD_CALL material: ${f.holdPointOfAttack ? 'at the point of attack' : 'next to the ball'}`);
          if (f.holdStage !== 'committed') console.log(`  ${type} material: effect ${Number(f.holdEffectYdPerS).toFixed(2)} yd/s, traffic ${f.holdTraffic}, pSeen ${Number(f.holdPSeen).toFixed(2)}, ${f.holdStage}`);
          else add(`${type} HOLD_CALL not material: ${!f.holdTowardBall ? 'not going to the ball' : !f.holdOutsideDouble ? 'inside a double' : 'not next to the ball'}`);
        }
      }
      else add(`${type} other record`);
    }
    for (const p of sim.penalties) if (p.kind === 'holding' && p.against === 'O') { add(`${type} called`); add(`${type} called yards`, Math.abs(p.yards ?? 10)); }
    return res; } } });
}
const tg = games * 2;
console.log(`team-games ${tg}`);
for (const [k, v] of Object.entries(c).sort()) console.log(`  ${k}: ${v} (${(v / tg).toFixed(2)} per team-game)`);
