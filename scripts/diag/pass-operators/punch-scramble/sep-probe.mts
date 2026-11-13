const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { armLength } = await import(`${W}/src/sim/engagement.ts`).catch(() => ({ armLength: null }));
const rows: number[] = [], beyond: number[] = []; let outArm = 0, atAir = 0; const ext: number[] = [];
let n = 0, out = 0;
for (let seed = 1; seed <= 16; seed++) for (const concept of ['four_verts', 'smash']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  while (sim.phase === 'live' && sim.t < 3.5 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    sim.tick();
    for (const e of sim.engagements) {
      if (e.type !== 'pass') continue;
      const b = e.blocker, d = e.defender, dist = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y);
      const lim = b.profile.reach + d.profile.radius;
      const arm = b.player.measurables.armIn / 36; if (dist > b.profile.radius + d.profile.radius + arm) outArm++; if (dist - (b.profile.radius + d.profile.radius) > 0.9 * arm + 0.05) atAir++; ext.push((e.hands?.extension ?? 0) - (b.profile.radius + d.profile.radius)); n++; rows.push(dist - (b.profile.radius + d.profile.radius)); if (dist > lim) { out++; beyond.push(dist - lim); }
    }
  }
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
console.log(`engaged pass-pair ticks ${n}: gap between bodies p25/50/75 ${q(rows, .25)} / ${q(rows)} / ${q(rows, .75)} yd | centres beyond the QB's 'in contact' (blocker reach + rusher radius) ${(100 * out / n).toFixed(1)}% (by p50 ${q(beyond)} yd) | beyond the blocker's full arm from the body surfaces ${(100 * outArm / n).toFixed(1)}% | beyond lockout + 0.05 (punch 'at air') ${(100 * atAir / n).toFixed(1)}% | joint extension past the bodies p50 ${q(ext)}`);
