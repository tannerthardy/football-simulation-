// The finish, traced (Flex, 2026-11-13: after first contact, our QB throws 64-72% within 0.1 s; the NFL's 30% after
// 0.3 s; sacked 22-24% against 47%). Per dropback with first contact (a defender within 1.0 yd of the QB, ball in his
// hands, after 0.5 s): was the windup already under way (sim.windupAt >= 0) and since when; the QB's held share at
// contact and at the release; the tackle events on the QB after contact (a missed tackle, a wrap, the bond); the
// outcome (threw / sacked / escaped) and its time after contact; the contact defender's speed and angle.
// usage: [flags] node --import tsx scripts/diag/effective-mass/finish-trace.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    let c: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (c || sim.t < 0.5 || sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      const qb = sim.qb;
      for (const d of sim.defense) {
        if (Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 1.0) continue;
        const v = Math.hypot(d.vel.x, d.vel.y), gx = qb.pos.x - d.pos.x, gy = qb.pos.y - d.pos.y, gl = Math.hypot(gx, gy) || 1e-6;
        const ang = Math.atan2(d.pos.y - qb.pos.y, d.pos.x - qb.pos.x) - qb.body.facing;
        c = { t: sim.t, d, windup: sim.windupAt >= 0, windupFor: sim.windupAt >= 0 ? sim.t - sim.windupAt : null, bond: !!sim.bond,
          closing: (d.vel.x * gx + d.vel.y * gy) / gl, speed: v, offFacing: Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) * 180 / Math.PI };
        break;
      }
    };
    const r = sim.run();
    if (c) {
      const after = sim.events.filter((e: any) => e.t >= c.t - 1e-9);
      const qbIdx = sim.qb.idx;
      const thr = after.find((e: any) => e.type === 'throw');
      const sack = after.find((e: any) => e.type === 'sack');
      const missed = after.filter((e: any) => e.type === 'missed_tackle' && (e.b === qbIdx)).length;
      const wrap = after.find((e: any) => (e.type === 'tackle_wrap' || e.type === 'tackle') && e.b === qbIdx);
      rows.push({ ...c, out: sack ? 'sacked' : thr ? 'threw' : 'escaped', after: (sack ?? thr)?.t != null ? (sack ?? thr).t - c.t : null, missed, wrapAfter: wrap ? wrap.t - c.t : null,
        throwBeforeWrap: !!(thr && (!wrap || thr.t <= wrap.t)) });
    }
    return r;
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter((x) => x != null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
const pct = (R: any[], f: (r: any) => boolean) => `${(100 * R.filter(f).length / Math.max(1, R.length)).toFixed(0)}%`;
console.log(`first contacts ${rows.length}`);
for (const o of ['threw', 'sacked', 'escaped']) {
  const R = rows.filter((r) => r.out === o); if (!R.length) continue;
  console.log(`${o.padEnd(7)} n ${R.length} | after p50 ${q(R.map((r) => r.after))} s | windup already under way at contact ${pct(R, (r) => r.windup)} (for ${q(R.map((r) => r.windupFor))} s)`
    + ` | a missed tackle on the QB after contact ${pct(R, (r) => r.missed > 0)} | a wrap after ${pct(R, (r) => r.wrapAfter != null)} (at +${q(R.map((r) => r.wrapAfter))} s) | thrown before any wrap ${pct(R, (r) => r.throwBeforeWrap)}`
    + ` | contact defender speed ${q(R.map((r) => r.speed))}, closing ${q(R.map((r) => r.closing))}, off the QB's facing ${q(R.map((r) => r.offFacing))} deg`);
}
const W0 = rows.filter((r) => !r.windup);
console.log(`not yet in his windup at contact: n ${W0.length} | threw ${pct(W0, (r) => r.out === 'threw')} (after ${q(W0.filter((r) => r.out === 'threw').map((r) => r.after))} s) | sacked ${pct(W0, (r) => r.out === 'sacked')} | escaped ${pct(W0, (r) => r.out === 'escaped')} | a missed tackle ${pct(W0, (r) => r.missed > 0)}`);
