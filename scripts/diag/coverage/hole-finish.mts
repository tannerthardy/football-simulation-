// Per-play trace of a hole shot (KEYS=concept|coverage|formation|seed|F/N,...): ball placement at the planned arrival
// (the receiver's distance from the aim point, ball in or out of bounds, the aim's distance from the sideline) and, after
// the catch, the half safety's path every 0.25 s (his distance to the carrier, closing speed, angle off the carrier's
// path) and the tackle events, with who makes the tackle and where.
//   KEYS=... node --import tsx scripts/diag/coverage/hole-finish.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { FIELD_WIDTH } = await import(`${W}/src/core/field.ts`);
for (const key of process.env.KEYS!.split(',')) {
  const [concept, coverage, formation, seed, fl] = key.split('|');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: +seed, roster: +seed, formation, flip: fl === 'F' }));
  let T: any = null, S: any = null, aim: any = null, arrT = -1, placed: string | null = null, nextLog = -1;
  const out: string[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0 && !T) {
      T = sim.offense.find((r: any) => r.player.id === sim.stats.target);
      const side = Math.sign(T.pos.y - sim.ballY);
      S = sim.defense.find((d: any) => /deep_half/.test(d.behavior?.zone ?? '') && (d.pos.y - sim.ballY) * side > 0);
      aim = sim.ball.intended; arrT = sim.ball.arrivalT;
    }
    if (T && !placed && sim.t >= arrT) {
      const miss = Math.hypot(aim.x - T.pos.x, aim.y - T.pos.y);
      placed = `throw ${sim.throwAt.toFixed(2)} flight ${(arrT - sim.throwAt).toFixed(2)} air ${(aim.x - sim.los).toFixed(1)} | aim ${aim.x.toFixed(1)},${aim.y.toFixed(1)} (sideline ${Math.min(aim.y, FIELD_WIDTH - aim.y).toFixed(1)} yd) | receiver at arrival ${T.pos.x.toFixed(1)},${T.pos.y.toFixed(1)}: ${miss.toFixed(2)} yd from the aim, in bounds ${T.pos.y > 0 && T.pos.y < FIELD_WIDTH} | half ${Math.hypot(S.pos.x - T.pos.x, S.pos.y - T.pos.y).toFixed(1)} yd`;
    }
    if (sim.catchAt >= 0 && S && sim.t >= nextLog && sim.phase !== 'dead') {
      nextLog = (nextLog < 0 ? sim.catchAt : nextLog) + 0.25;
      const c = sim.offense.find((r: any) => r.player.id === sim.stats.target) ?? T;
      const dx = c.pos.x - S.pos.x, dy = c.pos.y - S.pos.y, d = Math.hypot(dx, dy);
      const close = -((S.vel.x - c.vel.x) * -dx + (S.vel.y - c.vel.y) * -dy) / (d || 1);
      const off = Math.atan2(S.vel.y, S.vel.x) - Math.atan2(dy, dx);
      out.push(`  ${sim.t.toFixed(2)} carrier ${c.pos.x.toFixed(1)},${c.pos.y.toFixed(1)} v ${Math.hypot(c.vel.x, c.vel.y).toFixed(1)} | half ${S.pos.x.toFixed(1)},${S.pos.y.toFixed(1)} v ${Math.hypot(S.vel.x, S.vel.y).toFixed(1)} d ${d.toFixed(1)} closing ${close.toFixed(1)} heading-off ${Math.round(Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) * 57.3)} deg ${S.behavior?.kind ?? ''}`);
    }
  };
  const res = sim.run();
  const ev = sim.events.filter((e: any) => /tackle|miss|broken|catch|out_of_bounds|touchdown|incomplete/.test(e.type) && e.t >= sim.throwAt)
    .map((e: any) => `${e.t}:${e.type}${e.a != null ? '(' + ([...sim.offense, ...sim.defense].find((p: any) => p.idx === e.a)?.slot ?? '') + ')' : ''}`);
  console.log(`\n${key}: ${res.yards.toFixed(1)} yd, caught ${!!res.stats.completed}`);
  console.log('  ' + placed);
  console.log(out.join('\n'));
  console.log('  events: ' + ev.join(' '));
}
