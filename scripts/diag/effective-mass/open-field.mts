// Open-field contacts (Integration, 2026-11-10, GRASP_PATCH gate 3): receptions, catch then first tackler. Live games
// (seeds), every completed pass: the first defender within 1.0 yd of the catcher after the catch is the contact.
// From that tick: the catcher's speed along his travel at the contact (his travel then) at +0.1/+0.3/+0.5 s; slip
// across the line of centres at +0.1/+0.3 s and the line's turn by +0.3 s; yards after first contact (along the
// offense's direction, contact to whistle) and the time to the whistle; and while that defender's grasp is on the
// catcher, the defender's speed and his ground force against his traction limit (a holder dragged faster than his
// feet can supply shows as ground force at the limit while his speed grows). Settings at load: run per arm.
// usage: node --import tsx scripts/diag/effective-mass/open-field.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 7), games = Number(process.argv[3] ?? 4);
const rows: any[] = []; const drag: number[] = [], dragAtLimit: number[] = [];
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    let caught: any = null, c0: any = null, t0 = -1, hitter: any = null, path = 0, x0 = 0, a0 = 0; const o: any = {};
    const up = sim.attackDir('O'); const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const c = sim.carrier;
      if (!caught && c && c.team === 'O' && c !== sim.qb && sim.throwAt >= 0) caught = c;
      if (!caught || c !== caught) return;
      if (t0 < 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
        if (d) { t0 = sim.t; hitter = d; path = Math.atan2(c.vel.y, c.vel.x); x0 = c.pos.x; a0 = Math.atan2(d.pos.y - c.pos.y, d.pos.x - c.pos.x); c0 = c; } return; }
      const k = Math.round((sim.t - t0) / 0.05), ux = Math.cos(path), uy = Math.sin(path);
      const along = c.vel.x * ux + c.vel.y * uy; const nx0 = hitter.pos.x - c.pos.x, ny0 = hitter.pos.y - c.pos.y, L = Math.hypot(nx0, ny0) || 1;
      const slip = Math.abs(-(c.vel.x - hitter.vel.x) * ny0 / L + (c.vel.y - hitter.vel.y) * nx0 / L);
      if (k === 0) o.v0 = along; if (k === 2) { o.v1 = along; o.s1 = slip; } if (k === 6) { o.v3 = along; o.s3 = slip; const a = Math.atan2(ny0, nx0); o.turn = Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI; } if (k === 10) o.v5 = along;
      const held = sim.world.joints.some((j: any) => j.kind === 'grasp' && !j.broken && j.a === hitter.body && j.b === c.body);
      if (held && sim.lastStep) { const i = hitter.idx, g = sim.lastStep.groundImpulse[i], lim = sim.lastStep.groundImpulseLimit[i];
        drag.push(Math.hypot(hitter.vel.x, hitter.vel.y)); dragAtLimit.push(lim > 0 ? Math.hypot(g.x, g.y) / lim : NaN); } };
    const r = sim.run();
    if (t0 >= 0 && c0) rows.push({ ...o, yac: (c0.pos.x - x0) * up, tEnd: sim.t - t0 });
    return r; } } });
}
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
console.log(`receptions with a first tackler: n ${rows.length} (seeds ${first}..${first + 2 * (games - 1)}) | catcher speed along his travel at contact / +0.1 / +0.3 / +0.5 s: ${['v0', 'v1', 'v3', 'v5'].map(k => q(rows.map(r => r[k])).toFixed(2)).join(' / ')}`);
console.log(`  slip across at +0.1 / +0.3 s: ${q(rows.map(r => r.s1)).toFixed(2)} / ${q(rows.map(r => r.s3)).toFixed(2)} | line turned by +0.3 s ${q(rows.map(r => r.turn)).toFixed(0)} deg | yards after first contact p50 ${q(rows.map(r => r.yac)).toFixed(2)} mean ${(rows.reduce((a, r) => a + r.yac, 0) / rows.length).toFixed(2)} | contact to whistle ${q(rows.map(r => r.tEnd)).toFixed(2)} s`);
console.log(`  held tackler (ticks ${drag.length}): speed p50/p90 ${q(drag).toFixed(2)}/${q(drag, 0.9).toFixed(2)} yd/s | his ground force / traction limit p50/p90 ${q(dragAtLimit).toFixed(2)}/${q(dragAtLimit, 0.9).toFixed(2)} (at >= 0.99: ${(100 * dragAtLimit.filter(x => x >= 0.99).length / Math.max(1, dragAtLimit.length)).toFixed(0)}%)`);
