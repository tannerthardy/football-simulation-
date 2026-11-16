// Redirect law (Integration, 2026-11-16, from Coverage's glance work): a receiver at ~5 yd/s on +y is asked (9.6, 0); how long until his velocity is within 30 deg of
// the request and at least 3 yd/s along it? Part 1, outside football: twelve generated WR bodies, alone, two ways: stepBody (the kinematic path the sim's command takes)
// and the World alone, each with the facing held to travel (+y) and with the facing asked at the request (+x). Request held (9.6, 0), and held (9.6, 0) for 0.3 s then
// (6, -7), the case in the play log. Part 2: the same question in play (sim-redirect.mts reads it). Reports time to the 30-degree / 3 yd/s criterion at p25 / 50 / 75 and the
// speed and heading at +0.3 / +0.6 s. usage: node --import tsx scripts/diag/route-speed/redirect-law.mts
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generatePlayer } = await import(`${W}/src/players/generator.ts`);
const { derivePhysical } = await import(`${W}/src/players/physical.ts`);
const S = await import(`${W}/src/physics/support.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const { redirects, summary, measureAt } = await import(`${W}/scripts/diag/route-speed/redirect-op.mts`);
const rng = new Rng(77); const Ps = Array.from({ length: 12 }, () => derivePhysical(generatePlayer(rng, 'WR' as any)));
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const ang = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const DT = 0.05, N = 40;
const fresh = (P: any) => ({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 5 }, facing: Math.PI / 2, energy: 1, profile: P, support: S.newSupport(0.3) }) as any;
const requests: [string, (t: number) => { x: number; y: number }][] = [
  ['(9.6, 0) held', () => ({ x: 9.6, y: 0 })],
  ['(9.6, 0) 0.3 s then (6, -7)', (t) => (t < 0.3 ? { x: 9.6, y: 0 } : { x: 6, y: -7 })],
];
for (const [rname, req] of requests) for (const faceAsk of [false, true]) for (const engine of ['stepBody', 'World']) {
  const tracks: Array<[number, number] | null>[] = [];
  const tAch: number[] = [], sp3: number[] = [], sp6: number[] = [], hd3: number[] = [], hd6: number[] = []; let down = 0;
  for (const P of Ps) {
    const b = fresh(P), w = engine === 'World' ? new World([b]) : null; let hit = NaN;
    const tr: Array<[number, number] | null> = [[0, -5], [0, -4.5], [0, -4], [0, -3.5], [0, -3], [0, -2.5], [0, -2], [0, -1.5], [0, -1], [0, -0.5], [0, 0]]; tracks.push(tr);
    for (let k = 1; k <= N; k++) {
      const t = (k - 1) * DT, r = req(t), f = faceAsk ? Math.atan2(r.y, r.x) : Math.PI / 2;
      const cmd = { vel: r, facing: f, effort: 1, push: 0, posture: 0.3 } as any;
      if (w) w.step([cmd], DT); else stepBody(b, cmd, DT);
      if (k % 2 === 0) tr.push([b.pos.x, b.pos.y]);
      const tt = k * DT, rd = Math.atan2(req(tt).y, req(tt).x), sp = Math.hypot(b.vel.x, b.vel.y), along = b.vel.x * Math.cos(rd) + b.vel.y * Math.sin(rd);
      if (Number.isNaN(hit) && ang(Math.atan2(b.vel.y, b.vel.x), rd) <= 30 && along >= 3) hit = tt;
      if (Math.abs(tt - 0.3) < 1e-6) { sp3.push(sp); hd3.push(Math.atan2(b.vel.y, b.vel.x) * 180 / Math.PI); }
      if (Math.abs(tt - 0.6) < 1e-6) { sp6.push(sp); hd6.push(Math.atan2(b.vel.y, b.vel.x) * 180 / Math.PI); }
      if (b.support?.state && b.support.state !== 'up') { down++; break; }
    }
    tAch.push(hit);
  }
  const op = tracks.flatMap((t) => { const m = measureAt(t, 10, 0.1); return m ? [{ t30: NaN, turn: 90, v0: 5, v3: NaN, v6: NaN, a3: NaN, a6: NaN, ...m }] : []; });
  console.log(`${rname.padEnd(30)} facing ${faceAsk ? 'at request' : 'on travel '} ${engine.padEnd(8)} | t to <=30 deg and >=3 yd/s along: p25/50/75 ${[.25, .5, .75].map((f) => q(tAch, f).toFixed(2)).join('/')} (never ${tAch.filter(Number.isNaN).length}/12) | +0.3 s speed ${q(sp3).toFixed(1)} heading ${q(hd3).toFixed(0)} | +0.6 s speed ${q(sp6).toFixed(1)} heading ${q(hd6).toFixed(0)} | fell ${down}`);
  console.log('    same operator as the tracking: ' + summary(`isolated ${engine}`, op));
}
console.log(`WR vmax p50 ${q(Ps.map((p: any) => p.vmax)).toFixed(2)}`);
