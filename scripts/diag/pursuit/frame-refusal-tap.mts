// BLOCK_FRAME refusals (2026-11-24), measurement only: which re-blocks the frame rule turns into a grab or no block, and
// where. Needs defense/block-frame (setBlockFrameSink). For each re-block of a released defender from outside the frame:
// play type, the defender's group and speed, the blocker's bearing off the defender's travel and off his facing (deg),
// which half failed (behind his travel / outside his facing / both), whether he is square to the blocker (facing within
// 45 deg of him) yet moving away, his depth past the LOS, distance to the carrier and playside (toward the carrier's
// lateral side of the ball), and the blocker's choice (grab / no block).
// Usage: BLOCK_FRAME=1 node --import tsx frame-refusal-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { setBlockFrameSink } = (await import(`${W}/src/sim/engagement.ts`)) as any;
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const deg = (a: number) => Math.round(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI);
const r2 = (v: number) => Math.round(v * 100) / 100;
const GRP: Record<string, string> = { DE: 'DL', DT: 'DL', NT: 'DL', EDGE: 'DL', LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB' };
const rows: any[] = [];
setBlockFrameSink((sim: any, b: any, d: any, type: string, grab: boolean) => {
  const toB = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x), sp = Math.hypot(d.vel.x, d.vel.y);
  const path = sp > 1 ? Math.atan2(d.vel.y, d.vel.x) : d.body.facing;
  const offTravel = deg(toB - path), offFacing = deg(toB - d.body.facing);
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const dir = sim.attackDir(sim.offense[0].team);
  rows.push({ type, ptype: sim.offCall?.kind ?? null, grp: GRP[d.player.position] ?? 'DB', bslot: b.slot, speed: r2(sp), offTravel, offFacing,
    failed: offTravel > 90 && offFacing > 90 ? 'both' : offTravel > 90 ? 'behind his travel' : 'outside his facing',
    squareMovingAway: offFacing <= 45 && offTravel > 90, depth: r2((d.pos.x - sim.los) * dir),
    carrierDist: c ? r2(Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y)) : null,
    playside: c ? Math.sign(d.pos.y - sim.ballY) === Math.sign(c.pos.y - sim.ballY) : null, grab, t: r2(sim.t) });
});
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} refusals`); }
writeFileSync(OUT, JSON.stringify(rows)); console.log('refusals', rows.length);
const C = (f: (r: any) => any, X = rows) => X.reduce((m: any, r: any) => (m[String(f(r))] = (m[String(f(r))] ?? 0) + 1, m), {});
const R = rows.filter(r => r.ptype === 'run');
console.log('run plays:', R.length, '| group', C(r => r.grp, R), '| failed half', C(r => r.failed, R), '| square to him but moving away', C(r => r.squareMovingAway, R),
  '| depth past LOS', C(r => r.depth < 0 ? 'behind LOS' : r.depth < 3 ? '0-3' : '3+', R), '| playside', C(r => r.playside, R), '| choice', C(r => r.grab ? 'grab' : 'no block', R),
  '| blocker', C(r => r.bslot, R));
