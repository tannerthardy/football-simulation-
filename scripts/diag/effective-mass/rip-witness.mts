// RIP_CLEAR's witnesses (Integration, 2026-11-14). Per DE pass rep against a tackle (ball still in): the rips (each
// handForce the rusher puts on the tackle's hand), and for each: the tackle's arm extension at the rip (bodies' gap
// over his arm length: 1 = full extension), whether within 0.4 s the hand slid more than half the torso half-width,
// came off (off, or one hand of two), and when it was back (both hands, offset 0); whether the rusher went past the
// tackle (more than 0.3 yd deeper, outside) within 0.6 s. By extension: tight (< 0.6), mid, full (>= 0.9).
// usage: [flags] node --import tsx scripts/diag/effective-mass/rip-clear.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rips: any[] = []; let reps = 0;
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const seen = new Set<any>(), open: any[] = [];
  const hf = sim.world.handForce.bind(sim.world);
  sim.world.handForce = (jt: any, from: any, f: any, t0: number, t1: number) => {
    const e = sim.engagements.find((x: any) => x.hands === jt && x.defender.body === from && /^DE/.test(x.defender.slot) && ['LT', 'RT'].includes(x.blocker.slot));
    if (e && sim.throwAt < 0) {
      const b = e.blocker, d = e.defender;
      const gap = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - b.profile.radius - d.profile.radius;
      const H = sim.world.handHold(jt), steerPart = Math.max(0, jt.steer), press = Math.max(0, jt.lastN ?? 0);
      open.push({ F: Math.hypot(f.x, f.y), H, steerPart, press, e, jt, t: sim.t, ext: gap / Math.max(1e-6, b.player.measurables.armIn / 36), slid: false, off: false, back: null as number | null, past: false });
    }
    return hf(jt, from, f, t0, t1);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const e of sim.engagements) if (e.type === 'pass' && !seen.has(e) && /^DE/.test(e.defender.slot) && ['LT', 'RT'].includes(e.blocker.slot)) { seen.add(e); reps++; }
    const off = sim.attackDir('O');
    for (const r of open) {
      if (r.done) continue;
      const dt = sim.t - r.t, jt = r.jt, b = r.e.blocker, d = r.e.defender, side = Math.sign(d.pos.y - sim.ballY) || 1;
      if (dt <= 0.4) {
        if (Math.abs(jt.handOffset ?? 0) > 0.5 * b.profile.radius) r.slid = true;
        if (jt.off || (jt.handsOn ?? 2) < 2) r.off = true;
      }
      if (r.off && r.back === null && !jt.off && (jt.handsOn ?? 2) === 2) r.back = dt;
      if (dt <= 0.6 && (d.pos.x - b.pos.x) * off < -0.3 && side * (d.pos.y - b.pos.y) >= -0.3) r.past = true;
      if (dt > 1.5 || sim.phase !== 'live') { r.done = true; rips.push(r); }
    }
  };
  const res = sim.run();
  for (const r of open) if (!r.done) rips.push(r);
  return res;
} } });
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
console.log(`DE reps against a tackle ${reps}; rips ${rips.length} (${(rips.length / Math.max(1, reps)).toFixed(2)} a rep)`);
for (const [lab, f] of [['all', (r: any) => true], ['tight (< 0.6 of his arm)', (r: any) => r.ext < 0.6], ['mid', (r: any) => r.ext >= 0.6 && r.ext < 0.9], ['full extension (>= 0.9)', (r: any) => r.ext >= 0.9]] as const) {
  const R = rips.filter(f); if (!R.length) continue;
  const off = R.filter((r) => r.off);
  console.log(`   rip force p50 ${q(R.map((r) => r.F))} N vs the hand's hold ${q(R.map((r) => r.H))} N (steer ${q(R.map((r) => r.steerPart))} N, press under it ${q(R.map((r) => r.press))} N)`);
  console.log(`${lab.padEnd(26)} n ${String(R.length).padStart(4)}: slid past half ${pc(R.filter((r) => r.slid).length, R.length)}, came off ${pc(off.length, R.length)} (back p50 ${q(off.filter((r) => r.back !== null).map((r) => r.back))} s, not back in 1.5 s ${pc(off.filter((r) => r.back === null).length, off.length)}) | past within 0.6 s: cleared ${pc(off.filter((r) => r.past).length, off.length)}, not ${pc(R.filter((r) => !r.off && r.past).length, R.filter((r) => !r.off).length)}`);
}
