// After the edge rusher gets past the tackle, ours, from the engine's own state (Integration, 2026-11-12; the
// geometric half is scripts/diag/pass-operators/edge-past.py, same pairing and same 'past' rule, on NFL and sim).
// Pairing as edge-probe.mts. Past: the first tick from 0.5 s, QB holding the ball, at which the rusher is more than
// 0.3 yd deeper than the tackle and not inside him. At past and at +0.3 / +0.6 / +0.9 s:
//   - the hands joint between them: present, whose hands (the tackle's or the rusher's), its normal force;
//   - the rep: engaged, the rusher's move and whether it is live (landed and in its window), holding;
//   - the tackle's hips: square (facing within 45 deg of downfield) or turned; the tackle behind the rusher's hip
//     (more than 0.3 yd shallower);
//   - the rusher's requested and achieved speed toward the QB.
// Separately, every tick with the QB holding: a tackle in the rep asking for no depth (|x| < 0.05 yd/s) and carried
// back faster than 1 yd/s -- the rusher's move then (bull/longarm vs finesse), and the joint force.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-past.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const AFTER = [0, 0.3, 0.6, 0.9];
const snaps: Record<string, any[]> = Object.fromEntries(AFTER.map((a) => [a, []]));
const carried: Record<string, { n: number; force: number[] }> = {};
let rushes = 0, past = 0;
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const dir = sim.attackDir('O'), X = (x: number) => (x - sim.los) * dir;
    let pairs: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const qb = sim.qb; if (!qb) return;
      if (!pairs) {
        pairs = [];
        const OL = sim.offense.filter((o: any) => ['OT', 'OG', 'C'].includes(o.player.position));
        if (OL.length < 5) return;
        for (const side of [-1, 1]) {
          const tk = OL.reduce((m: any, o: any) => side * (o.pos.y - sim.ballY) > side * (m.pos.y - sim.ballY) ? o : m);
          const cand = sim.defense.filter((d: any) => ['EDGE', 'DT', 'LB'].includes(d.player.position) && X(d.pos.x) <= 1.6)
            .map((d: any) => ({ d, w: side * (d.pos.y - tk.pos.y) })).filter((c: any) => c.w >= 0 && c.w <= 4);
          if (!cand.length) continue;
          const { d } = cand.reduce((m: any, c: any) => c.w > m.w ? c : m);
          pairs.push({ tk, d, side, x0: X(d.pos.x), past: -1, done: new Set(), rushing: false });
        }
      }
      if (sim.carrier !== qb || sim.throwAt >= 0) return;
      for (const pr of pairs) {
        const { tk, d, side } = pr;
        if (!pr.rushing && sim.t >= 1.0) { pr.rushing = X(d.pos.x) < pr.x0 - 1.0; if (pr.rushing) rushes++; }
        const e = d.engagement && d.engagement.blocker === tk ? d.engagement : null;
        const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === tk.body && j.b === d.body) || (j.a === d.body && j.b === tk.body)));
        // Carried back while asking to hold.
        const ti = sim.intents?.[tk.idx]?.vel;
        if (e && ti && Math.abs(ti.x * dir) < 0.05 && tk.vel.x * dir < -1) {
          const live = sim.t < e.moveUntil && e.moveOk;
          const key = `${e.move}${live ? ' (live)' : ''}`;
          (carried[key] ??= { n: 0, force: [] }).n++; carried[key].force.push(j?.normalForce ?? 0);
        }
        if (sim.t < 0.5) continue;
        const width = side * (d.pos.y - sim.ballY) - side * (tk.pos.y - sim.ballY);
        if (pr.past < 0 && X(d.pos.x) - X(tk.pos.x) < -0.3 && width >= -0.3) { pr.past = sim.t; if (pr.rushing || sim.t >= 1.0) past++; }
        if (pr.past < 0) continue;
        for (const a of AFTER) if (!pr.done.has(a) && sim.t >= pr.past + a - 1e-9) {
          pr.done.add(a);
          const down = dir > 0 ? 0 : Math.PI;
          const hipOff = Math.abs(((tk.body.facing - down) * 180 / Math.PI + 540) % 360 - 180);
          const ux = qb.pos.x - d.pos.x, uy = qb.pos.y - d.pos.y, L = Math.hypot(ux, uy) || 1;
          const di = sim.intents?.[d.idx]?.vel;
          // The joint's force on the rusher (world frame): compression (normal > 0, pushing apart) or tension, and
          // its component along his velocity (negative: retarding his motion) and along his line to the QB.
          let fv = NaN, fq = NaN, fn = NaN, fvn = NaN, fvt = NaN;
          if (j && j.normalForceOnB) {
            const sgn = j.b === d.body ? 1 : -1, t = j.tangentForceOnB ?? { x: 0, y: 0 };
            const F = { x: sgn * (j.normalForceOnB.x + t.x), y: sgn * (j.normalForceOnB.y + t.y) };
            const sp = Math.hypot(d.vel.x, d.vel.y) || 1;
            fv = (F.x * d.vel.x + F.y * d.vel.y) / sp; fq = (F.x * ux + F.y * uy) / L; fn = j.normalForce ?? NaN;
            fvn = sgn * (j.normalForceOnB.x * d.vel.x + j.normalForceOnB.y * d.vel.y) / sp; fvt = fv - fvn;
          }
          snaps[a].push({ fv, fq, fn, fvn, fvt, grab: j ? (j.hold ?? 0) > 0 : false, joint: !!j, tackleHands: j ? (j.actor ?? j.a) === tk.body : null, force: j?.normalForce ?? 0,
            engaged: !!e, move: e?.move ?? null, live: e ? sim.t < e.moveUntil && e.moveOk : false, holding: !!e?.holding,
            hips: hipOff > 45 ? 'turned' : 'square', behind: X(tk.pos.x) > X(d.pos.x) + 0.3,
            req: di ? (di.x * ux + di.y * uy) / L : NaN, ach: (d.vel.x * ux + d.vel.y * uy) / L, toQB: L });
        }
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
console.log(`edge rushes ${rushes} | got past ${past}`);
for (const a of AFTER) {
  const S = snaps[a]; if (!S.length) continue;
  const J = S.filter((s) => s.joint), B = S.filter((s) => s.behind), BJ = B.filter((s) => s.joint);
  const moves: Record<string, number> = {}; for (const s of S.filter((s) => s.engaged)) { const k = `${s.move}${s.live ? '*' : ''}`; moves[k] = (moves[k] ?? 0) + 1; }
  console.log(`+${a.toFixed(1)} s n ${S.length}: hands joint ${pc(J.length, S.length)} (tackle's hands ${pc(J.filter((s) => s.tackleHands).length, J.length)}, force p50 ${q(J.map((s) => s.force)).toFixed(0)} N)`
    + ` | engaged ${pc(S.filter((s) => s.engaged).length, S.length)}, holding ${pc(S.filter((s) => s.holding).length, S.length)}`
    + ` | tackle hips turned ${pc(S.filter((s) => s.hips === 'turned').length, S.length)} | tackle behind his hip ${pc(B.length, S.length)}, of those still joined ${pc(BJ.length, B.length)} (force p50 ${q(BJ.map((s) => s.force)).toFixed(0)} N)`
    + ` | toward the QB requested ${q(S.map((s) => s.req)).toFixed(1)} achieved ${q(S.map((s) => s.ach)).toFixed(1)} yd/s | to QB ${q(S.map((s) => s.toQB)).toFixed(1)}`
    + ` | moves (engaged; * live) ${JSON.stringify(moves)}`);
  const F = J.filter((s) => Number.isFinite(s.fn));
  if (F.length) console.log(`   joint force on the rusher (n ${F.length}): compression ${pc(F.filter((s) => s.fn > 0).length, F.length)}, tension ${pc(F.filter((s) => s.fn < 0).length, F.length)}`
    + ` | along his velocity p25/50/75 ${q(F.map((s) => s.fv), .25).toFixed(0)}/${q(F.map((s) => s.fv)).toFixed(0)}/${q(F.map((s) => s.fv), .75).toFixed(0)} N (retarding ${pc(F.filter((s) => s.fv < -50).length, F.length)}; of it from the normal p50 ${q(F.map((s) => s.fvn)).toFixed(0)} N, from the tangent (steer) p50 ${q(F.map((s) => s.fvt)).toFixed(0)} N; retarding normal force by compression ${pc(F.filter((s) => s.fvn < -50 && s.fn > 0).length, F.length)}, by tension ${pc(F.filter((s) => s.fvn < -50 && s.fn < 0).length, F.length)})`
    + ` | toward the QB p50 ${q(F.map((s) => s.fq)).toFixed(0)} N (away from the QB ${pc(F.filter((s) => s.fq < -50).length, F.length)}) | joint allows a grab (hold > 0) ${pc(F.filter((s) => s.grab).length, F.length)}`);
}
const tot = Object.values(carried).reduce((a, c) => a + c.n, 0);
console.log(`carried back (asking 0, achieved < -1 yd/s), ticks ${tot}: ` + Object.entries(carried).sort((a, b) => b[1].n - a[1].n)
  .map(([k, c]) => `${k} ${pc(c.n, tot)} (force p50 ${q(c.force).toFixed(0)} N)`).join(' | '));
