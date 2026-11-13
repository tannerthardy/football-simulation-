// Integration's check of the step-3 rule on the line: in an engaged OL-DL block, does each man's request already point
// into his opponent, and is his push into the felt load starved there too? The same allocation measures as
// drive-alloc.mts, read on the axis from each man to his opponent instead of the runner's path:
//   cap        leg-strength budget = pushForce x force-velocity (along the delivered force) x facing x availability
//   delivered  |ground force|; "into him" = its component toward the opponent; "along request" = toward his request
//   lean       the push into the felt load (World brace); felt = sensed contact force, and its angle to "into him"
// "Opposed" ticks are the ones the proposed rule would touch: the felt load points against his request (within 45 deg).
// Every tick from 0.1 to 0.6 s after each engagement starts, on live games (both run and pass blocks), shares of each
// man's own traction limit. Diagnostic only; reads World state after each tick.
// usage: node --import tsx scripts/diag/effective-mass/drive-alloc-line.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const { directionalSpeedFactor, fatigueFactor } = await import(`${W}/src/physics/kinematics.ts`);
const first = Number(process.argv[2] ?? 7), games = Number(process.argv[3] ?? 4);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
const rows: any[] = [];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const deg = (a: number) => Math.abs(wrap(a)) * 180 / Math.PI;
function sample(sim: any, a: any, opp: any, type: string, role: string) {
  const rep = sim.lastStep, w = sim.world, k = a.idx, sup = a.body.support, dt = sim.dt ?? 0.05;
  const lim = rep.groundImpulseLimit[k] / dt, g = rep.groundImpulse[k], gx = g.x / dt, gy = g.y / dt, gm = Math.hypot(gx, gy);
  const into = Math.atan2(opp.pos.y - a.pos.y, opp.pos.x - a.pos.x);
  const dirF = gm > 1e-6 ? Math.atan2(gy, gx) : into;
  const fv = Math.min(1.2, Math.max(0, 1 - (a.vel.x * Math.cos(dirF) + a.vel.y * Math.sin(dirF)) / a.profile.vmax));
  const cap = supportParams(a.profile).pushForce * fv * directionalSpeedFactor(a.profile, wrap(dirF - a.body.facing)) * (w.alpha?.[k] ?? 1) * fatigueFactor(a.body.energy);
  const it = sim.intents?.[k]; const rv = it?.vel ?? { x: 0, y: 0 }, rs = Math.hypot(rv.x, rv.y), req = Math.atan2(rv.y, rv.x);
  const felt = Math.hypot(sup.felt.x, sup.felt.y), feltOpp = Math.atan2(-sup.felt.y, -sup.felt.x);   // where the load pushes back from
  const need = { x: rv.x - a.vel.x, y: rv.y - a.vel.y };
  rows.push({ type, role, up: sup.state === 'up', lim, cap: cap / lim, gm: gm / lim,
    into: (gx * Math.cos(into) + gy * Math.sin(into)) / lim,
    alongReq: rs > 0.2 ? (gx * Math.cos(req) + gy * Math.sin(req)) / lim : NaN,
    lean: Math.hypot(w.braceX[k], w.braceY[k]) / lim, felt: felt / lim,
    feltAng: felt > 1e-6 ? deg(feltOpp - into) : NaN,
    reqAng: rs > 0.2 ? deg(req - into) : NaN, needAng: deg(Math.atan2(need.y, need.x) - into), needMag: Math.hypot(need.x, need.y),
    gAng: gm > 1e-6 ? deg(dirF - into) : NaN, miss: gm > 1e-6 && Math.hypot(need.x, need.y) > 0.2 ? deg(dirF - Math.atan2(need.y, need.x)) : NaN, reqSpeed: rs, speed: Math.hypot(a.vel.x, a.vel.y),
    opposed: rs > 0.2 && felt / lim > 0.05 && Math.cos(feltOpp - req) > Math.cos(Math.PI / 4) });
}
for (let s = first; s < first + 2 * games; s += 2) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (!sim.lastStep) return;
      for (const e of sim.engagements ?? []) {
        if (!OL.has(e.blocker.slot) || !DL.test(e.defender.slot)) continue;
        const age = sim.t - e.start; if (age < 0.1 - 1e-9 || age > 0.6 + 1e-9) continue;
        sample(sim, e.blocker, e.defender, e.type, 'OL'); sample(sim, e.defender, e.blocker, e.type, 'DL'); } };
    return sim.run(); } } });
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const f2 = (rs: any[], k: string) => med(rs.map(r => r[k])).toFixed(2), f0 = (rs: any[], k: string) => med(rs.map(r => r[k])).toFixed(0);
const line = (label: string, rs: any[], all: number) => {
  console.log(`  ${label.padEnd(26)} ${String(rs.length).padStart(5)} (${(100 * rs.length / Math.max(1, all)).toFixed(0).padStart(3)}%) | cap ${f2(rs, 'cap')} | delivered ${f2(rs, 'gm')}, into him ${f2(rs, 'into')}, along request ${f2(rs, 'alongReq')} | lean ${f2(rs, 'lean')} felt ${f2(rs, 'felt')} at ${f0(rs, 'feltAng')} deg`);
  console.log(`  ${''.padEnd(26)}         angles to "into him" (deg): request ${f0(rs, 'reqAng')} (within 30: ${(100 * rs.filter(r => r.reqAng <= 30).length / Math.max(1, rs.length)).toFixed(0)}%), velocity change asked ${f0(rs, 'needAng')} (${f2(rs, 'needMag')} yd/s), ground force ${f0(rs, 'gAng')}, force off the asked change ${f0(rs, 'miss')} | request speed ${f2(rs, 'reqSpeed')}, speed ${f2(rs, 'speed')}`);
};
console.log(`engaged OL-DL blocks, seeds ${first}..${first + 2 * (games - 1)} (${games} games), 0.1-0.6 s after engagement; shares of each man's own traction limit`);
for (const type of ['run', 'pass']) for (const role of ['OL', 'DL']) {
  const all = rows.filter(r => r.type === type && r.role === role), up = all.filter(r => r.up);
  console.log(`${type.toUpperCase()} BLOCK, ${role} (median limit ${med(all.map(r => r.lim)).toFixed(0)} kg yd/s^2)`);
  line('up, all', up, all.length);
  line('up, load opposes request', up.filter(r => r.opposed), all.length);
  line('up, not opposed', up.filter(r => !r.opposed), all.length);
}
