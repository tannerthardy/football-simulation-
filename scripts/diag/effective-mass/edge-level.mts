// The corner once level (Flex, 2026-11-14; Integration's four candidates for "level and stays level" under
// VERTICAL_SET). Per DE pass rep against a tackle: the first tick the rusher is level outside him (rusher's depth within
// 0.3 yd of the tackle's, outside by 0.3 yd or more) while the rep is on, then the next 0.5 s:
//   1. the strut: the load on the rusher along the tackle-to-rusher line (+ away) and across it, the tackle's hand
//      joint normal / tangential force;
//   2. his bend: his requested heading against the bearing to the QB (0 = straight at him), his achieved heading
//      against it, his speed and turn rate; his lean into the press (|support.lean|) against RUSH_LEAN_BOUND's cap
//      (intent.leanCap), and the share of ticks the cap is the binding limit (lean within 5% of it);
//   3. his hands: the move on the rep (share of ticks by move), and whether the tackle's hands are still on (joint on);
//   4. the tackle's turn: his facing off the line to the rusher, his yaw rate.
// Outcome: past outside (more than 0.3 yd deeper than the tackle, not inside) by 0.5 s.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-level.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const { padHeightAt, supportParams } = await import(`${W}/src/physics/support.ts`);
const padH = (a: any) => padHeightAt(supportParams(a.profile), a.body.support?.posture ?? 0.5);
const deg = (a: number) => Math.abs(((a * 180 / Math.PI) + 540) % 360 - 180);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const reps = new Map<any, any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
    const off = sim.attackDir('O'), qb = sim.qb;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !/^DE/.test(e.defender.slot) || !['LT', 'RT'].includes(e.blocker.slot)) continue;
      const d = e.defender, b = e.blocker, side = Math.sign(d.pos.y - sim.ballY) || 1;
      let r = reps.get(e);
      const depth = (d.pos.x - b.pos.x) * off, width = side * (d.pos.y - b.pos.y);
      if (!r) {
        if (Math.abs(depth) > 0.3 || width < 0.3) continue;
        r = { t0: sim.t, n: 0, ln: 0, lt: 0, jn: 0, jt: 0, on: 0, reqQB: 0, gotQB: 0, v: 0, lean: 0, cap: 0, capN: 0, bind: 0, offChest: 0, yaw: 0, moves: {} as Record<string, number>, h0: Math.atan2(d.vel.y, d.vel.x), past: false };
        reps.set(e, r);
      }
      if (r.done) continue;
      if (sim.t - r.t0 > 0.5) { r.done = true; r.turn = deg(Math.atan2(d.vel.y, d.vel.x) - r.h0) / 0.5; rows.push(r); continue; }
      const nx = d.pos.x - b.pos.x, ny = d.pos.y - b.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      const iv = sim.intents?.[d.idx] ?? {}, vel = iv.vel ?? { x: 0, y: 0 };
      const toQB = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x);
      let t = { x: -n.y, y: n.x }; if (d.vel.x * t.x + d.vel.y * t.y < 0) t = { x: -t.x, y: -t.y };
      const Ld = d.body.support?.load ?? { x: 0, y: 0 };
      r.ln += Ld.x * n.x + Ld.y * n.y; r.lt += -(Ld.x * t.x + Ld.y * t.y); r.n++;
      { const h = e.hands; if (h && !h.off) {
        const bodies = b.profile.radius + d.profile.radius, arm = b.player.measurables.armIn / 36;
        const gapNow = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - bodies;
        r.ext = (r.ext ?? 0) + (h.extension - bodies); r.gap = (r.gap ?? 0) + gapNow; r.armL = arm;
        r.short = (r.short ?? 0) + (h.extension - bodies - gapNow);
        const N = Math.max(0, h.normalForce ?? 0); r.Nn = (r.Nn ?? 0) + N; r.pushN = (r.pushN ?? 0) + h.push;
        if (h.push > 0 && N >= 0.95 * h.push) r.atLim = (r.atLim ?? 0) + 1;
        r.pf = b.player ? (r.pf ?? 0) + (h.push / Math.max(1e-6, 0.35 + 0.65 * Math.abs(e.control ?? 0))) : r.pf;
        r.cN = (r.cN ?? 0) + 1;
        (r.pairs ??= []).push([h.extension - bodies - gapNow, N]);
      } }
      const h = e.hands; if (h && !h.off) { r.on++; r.jn += Math.max(0, h.normalForce ?? 0); r.jt += Math.abs(h.tangentForce ?? 0); }
      if (Math.hypot(vel.x, vel.y) > 0.3) r.reqQB += deg(Math.atan2(vel.y, vel.x) - toQB);
      // His request split on the line to the tackle: into him (-n) and past him (along t), yd/s.
      r.reqInto = (r.reqInto ?? 0) - (vel.x * n.x + vel.y * n.y); r.reqPast = (r.reqPast ?? 0) + (vel.x * t.x + vel.y * t.y);
      // Does the straight line from him to the QB pass through the tackle's body (within the two radii)?
      { const ux = Math.cos(toQB), uy = Math.sin(toQB), bx = b.pos.x - d.pos.x, by = b.pos.y - d.pos.y, along = bx * ux + by * uy;
        const perp = Math.abs(-bx * uy + by * ux), Q = Math.hypot(qb.pos.x - d.pos.x, qb.pos.y - d.pos.y);
        if (along > 0 && along < Q && perp < b.profile.radius + d.profile.radius) r.through = (r.through ?? 0) + 1; }
      r.gotQB += deg(Math.atan2(d.vel.y, d.vel.x) - toQB); r.v += Math.hypot(d.vel.x, d.vel.y);
      const lean = Math.hypot(d.body.support?.lean?.x ?? 0, d.body.support?.lean?.y ?? 0); r.lean += lean;
      if (Number.isFinite(iv.leanCap)) { r.cap += iv.leanCap; r.capN++; if (lean >= 0.95 * iv.leanCap) r.bind++; }
      r.offChest += deg(Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x) - b.body.facing); r.yaw += Math.abs(b.body.spin ?? 0) * 180 / Math.PI;
      if ((e.phi ?? 0) * e.side > 0.5) r.turnedN = (r.turnedN ?? 0) + 1;
      if (e.move === 'bull' || e.move === 'longarm') r.powerN = (r.powerN ?? 0) + 1;
      // Does anything move control? Count changes over the level phase.
      if (r.lastCtl !== undefined && Math.abs((e.control ?? 0) - r.lastCtl) > 1e-9) r.ctlMoves = (r.ctlMoves ?? 0) + 1;
      r.lastCtl = e.control ?? 0; r.ctl0 ??= e.control ?? 0;
      // The press against the line of his retreat (his velocity's line): the rusher's bearing from him off that line.
      { const bvn = Math.hypot(b.vel.x, b.vel.y), Nn = Math.max(0, e.hands?.normalForce ?? 0);
        if (bvn > 0.5) { const br = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x), mv = Math.atan2(b.vel.y, b.vel.x);
          let off = deg(br - mv); off = Math.min(off, 180 - off);
          r.Ntot = (r.Ntot ?? 0) + Nn; if (off > 60) r.Nbeside = (r.Nbeside ?? 0) + Nn;
          // The tackle's own speed across the push line (his feet carrying him sideways to his press) and along it.
          const ux = (d.pos.x - b.pos.x), uy = (d.pos.y - b.pos.y), uL = Math.hypot(ux, uy) || 1;
          const across = Math.abs((b.vel.x * -uy + b.vel.y * ux) / uL), along = (b.vel.x * ux + b.vel.y * uy) / uL;
          (r.bins ??= []).push([off, Nn, across, along, Math.max(0, e.hands?.push ?? 0)]); } }
      { const bl = b.body.support?.lean ?? { x: 0, y: 0 }; r.tLeanX = (r.tLeanX ?? 0) + (-(bl.x * n.x + bl.y * n.y)); }
      { const h = e.hands; if (h && !h.off) { const bodies = b.profile.radius + d.profile.radius; const ext = h.extension - bodies;
          r.ext0 ??= ext; r.ext1 = ext; const g = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - bodies; r.gap0 ??= g; r.gap1 = g;
          r.close = (r.close ?? 0) - ((d.vel.x - b.vel.x) * n.x + (d.vel.y - b.vel.y) * n.y); r.closeN = (r.closeN ?? 0) + 1; }
        r.padD = (r.padD ?? 0) + (padH(d) - padH(b)); }
      r.ctl = (r.ctl ?? 0) + (e.control ?? 0); r.ctlPos = (r.ctlPos ?? 0) + ((e.control ?? 0) > 0 ? 1 : 0);
      r.pushI = (r.pushI ?? 0) + (iv.push ?? 0); r.post = (r.post ?? 0) + (iv.posture ?? 0);
      r.moves[e.move ?? 'none'] = (r.moves[e.move ?? 'none'] ?? 0) + 1;
      if (depth < -0.3 && width >= -0.3) r.past = true;
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5, dp = 0) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(dp) : 'nan'; };
for (const [lab, f] of [['all level', (r: any) => true], ['went past by 0.5 s', (r: any) => r.past], ['stayed level / held', (r: any) => !r.past]] as const) {
  const R = rows.filter(f); if (!R.length) continue;
  const m = (k: string, by = 'n') => R.map((r) => r[k] / Math.max(1, r[by]));
  const mv: Record<string, number> = {}; let tot = 0;
  for (const r of R) for (const [k, v] of Object.entries(r.moves as Record<string, number>)) { mv[k] = (mv[k] ?? 0) + v; tot += v; }
  console.log(`${lab.padEnd(20)} n ${String(R.length).padStart(4)} (past ${(100 * R.filter((r) => r.past).length / R.length).toFixed(0)}%)`);
  console.log(`   1 strut: load along the line p50 ${q(m('ln'))} N, across ${q(m('lt'))} N | tackle's hands on ${q(R.map((r) => 100 * r.on / Math.max(1, r.n)))}% of ticks, normal ${q(m('jn', 'on'))} N, tangential ${q(m('jt', 'on'))} N`);
  console.log(`   2 bend: request off the QB bearing p50 ${q(m('reqQB'))} deg, achieved ${q(m('gotQB'))} deg; speed ${q(m('v'), .5, 2)} yd/s; turn ${q(R.map((r) => r.turn))} deg/s | lean ${q(m('lean'))} N, cap ${q(m('cap', 'capN'))} N, cap binding ${q(R.map((r) => 100 * r.bind / Math.max(1, r.capN)))}% of capped ticks (capped on ${q(R.map((r) => 100 * r.capN / Math.max(1, r.n)))}% of ticks)`);
  console.log(`   request into the tackle p50 ${q(m('reqInto'), .5, 2)} yd/s, past him ${q(m('reqPast'), .5, 2)} yd/s | the line to the QB through the tackle's body on ${q(R.map((r) => 100 * (r.through ?? 0) / Math.max(1, r.n)))}% of ticks`);
  console.log(`   branch: turned (phi x side > 0.5) on ${q(R.map((r) => 100 * (r.turnedN ?? 0) / Math.max(1, r.n)))}% of ticks, power move ${q(R.map((r) => 100 * (r.powerN ?? 0) / Math.max(1, r.n)))}%`);
  console.log(`   joint: set extension beyond the bodies p50 ${q(m('ext', 'cN'), .5, 2)} yd, the bodies' gap ${q(m('gap', 'cN'), .5, 2)} yd (his arm ${q(R.map((r) => r.armL), .5, 2)}), driven short of it ${q(m('short', 'cN'), .5, 3)} yd | normal ${q(m('Nn', 'cN'))} N of push limit ${q(m('pushN', 'cN'))} N, at the limit on ${q(R.map((r) => 100 * (r.atLim ?? 0) / Math.max(1, r.cN)))}% of ticks | his press capacity (push / control share) ${q(m('pf', 'cN'))} N`);
  { const P = R.flatMap((r) => r.pairs ?? []); for (const [lo, hi] of [[-1, 0], [0, 0.01], [0.01, 0.03], [0.03, 0.06], [0.06, 1]]) { const S = P.filter((p: number[]) => p[0] >= lo && p[0] < hi); if (S.length) console.log(`      driven short ${lo.toFixed(2)}-${hi.toFixed(2)} yd: ${S.length} ticks, normal p50 ${q(S.map((p: number[]) => p[1]))} N`); } }
  console.log(`   the tackle's lean toward the rusher p50 ${q(m('tLeanX'))} N | the rusher's lean ${q(m('lean'))} N`);
  console.log(`   (a) the hands' length beyond the bodies at the start / after 0.5 s p50 ${q(R.map((r) => r.ext0), .5, 2)} / ${q(R.map((r) => r.ext1), .5, 2)} yd; the gap ${q(R.map((r) => r.gap0), .5, 2)} / ${q(R.map((r) => r.gap1), .5, 2)} yd; closing along the joint p50 ${q(m('close', 'closeN'), .5, 2)} yd/s | (b) his pads minus the tackle's p50 ${q(m('padD'), .5, 2)} yd`);
  console.log(`   control's sign at the hip: negative on ${q(R.map((r) => 100 * (1 - (r.ctlPos ?? 0) / Math.max(1, r.n))))}% of ticks (p50 per rep)`);
  console.log(`   rep state: control p50 ${q(m('ctl'), .5, 2)} (positive = the tackle's) on ${q(R.map((r) => 100 * (r.ctlPos ?? 0) / Math.max(1, r.n)))}% of ticks positive | his push intent ${q(m('pushI'), .5, 2)}, posture ${q(m('post'), .5, 2)}`);
  console.log(`   control: changed on ${q(R.map((r) => r.ctlMoves ?? 0), .5, 1)} ticks per rep (p50; reps with any change ${(100 * R.filter((r) => (r.ctlMoves ?? 0) > 0).length / R.length).toFixed(0)}%) | share of the press delivered with the rusher more than 60 deg off his line of retreat: ${(100 * R.reduce((a, r) => a + (r.Nbeside ?? 0), 0) / Math.max(1, R.reduce((a, r) => a + (r.Ntot ?? 0), 0))).toFixed(0)}%`);
  { const B = R.flatMap((r) => r.bins ?? []); for (const [lo, hi] of [[0, 30], [30, 60], [60, 90]]) { const S = B.filter((b: number[]) => b[0] >= lo && b[0] < hi); if (S.length) console.log(`      rusher ${lo}-${hi} deg off his retreat line: ${S.length} ticks (${(100 * S.length / B.length).toFixed(0)}%), press p50 ${q(S.map((b: number[]) => b[1]))} N of limit ${q(S.map((b: number[]) => b[4]))} N | his speed across the push line ${q(S.map((b: number[]) => b[2]), .5, 2)} yd/s, along it ${q(S.map((b: number[]) => b[3]), .5, 2)} yd/s`); } }
  console.log(`   3 hands: moves ${Object.entries(mv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / tot).toFixed(0)}%`).join(', ')}`);
  console.log(`   4 tackle: rusher off his chest p50 ${q(m('offChest'))} deg, yaw rate ${q(m('yaw'))} deg/s`);
}
