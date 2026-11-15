// SPACING_HOLD and the sacks (Integration, 2026-11-15): staged pass plays against one front, the QB's pocket behaviour per play, hold off against on (run twice, SPACING_HOLD=0 / 1).
// Per play: sacked and when, when the ball left, how long the QB's behaviour was `carrier` before the throw / sack (he has left the dropback), his path, his lateral drift, the
// nearest rusher and nearest own lineman over the time he held the ball, and the same at the moment of the sack or release. Output JSON lines to OUT.
//   SPACING_HOLD=0|1 node --import tsx scripts/diag/effective-mass/qb-hold-trace.mts OUT.jsonl [seeds=20]
import { writeFileSync } from 'node:fs';
const R = process.cwd();
const { Rng } = await import(`${R}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${R}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${R}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${R}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${R}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${R}/src/sim/playsim.ts`);
const out: any[] = []; const N = Number(process.argv[3] ?? 20);
for (const concept of ['curl_flat', 'four_verts', 'y_cross', 'smash', 'flood', 'mesh', 'stick', 'comebacks', 'hitch_post', 'dagger']) for (const cov of ['cover3', 'cover1']) for (let seed = 1; seed <= N; seed++) {
  if (!PASS_BY_ID[concept]) continue;
  const offense = generateTeam(new Rng(101), 'O', 'DTO', { strength: Number(process.env.OSTR ?? .35) }), defense = generateTeam(new Rng(102), 'D', 'DTD', { strength: Number(process.env.DSTR ?? .8) });
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: cov }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
  const qb = sim.qb; const ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
  const rushers = () => sim.defense.filter((d: any) => d.player?.position && ['DT', 'DE', 'EDGE', 'DL', 'NT', 'LB'].includes(d.player.position) || ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot));
  const x0 = qb.pos.x, y0 = qb.pos.y; let carrierT = 0, path = 0, last = { ...qb.pos }, minRush = 99, minOL = 99, thrown = -1, sacked = -1, tHeld = 0, maxBack = 0, maxSide = 0, behindOL = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (sim.phase !== 'live') return;
    if (sim.ball?.kind === 'held' && sim.ball.carrier === qb) { tHeld += sim.dt; if (qb.behavior?.kind === 'carrier') carrierT += sim.dt;
      path += Math.hypot(qb.pos.x - last.x, qb.pos.y - last.y); last = { ...qb.pos };
      minRush = Math.min(minRush, ...rushers().map((d: any) => Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y)));
      minOL = Math.min(minOL, ...ol.map((a: any) => Math.hypot(a.pos.x - qb.pos.x, a.pos.y - qb.pos.y)));
      maxBack = Math.max(maxBack, x0 - qb.pos.x); maxSide = Math.max(maxSide, Math.abs(qb.pos.y - y0));
      const olx = Math.min(...ol.map((a: any) => a.pos.x)); if (qb.pos.x < olx - 0.0) behindOL += sim.dt; }
    if (thrown < 0 && sim.ball?.kind === 'air') thrown = sim.t;
    if (sacked < 0 && sim.stats?.sacked) sacked = sim.t; };
  sim.run();
  out.push({ concept, cov, seed, sacked: !!(sim.stats?.sacked) , sackT: sacked, thrownT: thrown, held: tHeld, carrierT, path, minRush, minOL, maxBack, maxSide, scramble: !!sim.stats?.scramble });
}
writeFileSync(process.argv[2], out.map(o => JSON.stringify(o)).join('\n') + '\n'); console.log(out.length, 'plays,', out.filter(o => o.sacked).length, 'sacks');
