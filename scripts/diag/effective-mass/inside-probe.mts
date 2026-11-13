// How the inside move beats a tackle (Integration, 2026-11-12: with the tackle anchored and PAST_ALONG_PATH, edge
// rushers still get inside him on 18.8% of dropbacks, free 97%; NFL 6.4%, 48%). Every crossing of an edge rusher
// across his tackle's face (his width outside the tackle going from >= -0.3 to < -0.3 yd, the edge-rush.py 'inside'
// state) while the QB holds the ball, in a rep or just after one (0.3 s):
//  - the rep then: the rusher's move, whether its roll succeeded and is live (moves resolve by a rating-weighted roll,
//    resolveMove), control, the rep's end reason if it just ended;
//  - the tackle: lateral (toward the ball) requested vs achieved speed at the crossing, his leverage 0.3 s before
//    (his centre inside the rusher's by how much, along the line across the field: + = inside-half leverage);
//  - the hands joint: present, normal force (compression +), tangential force, grip (OPEN_HANDS);
//  - the rusher: his requested speed (share of his vmax), push share, the share of his request across the tackle
//    toward the ball, and his achieved speed;
//  - help: other OL/TE/RB within 2 yd of the rusher in the 0.5 s after the crossing; whether one then engages him and
//    when; whether those within 2 yd were already engaged with someone else ('did nothing' = free and not engaging).
// usage: [flags] node --import tsx scripts/diag/effective-mass/inside-probe.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const rows: any[] = []; let dropbacks = 0;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    dropbacks++;
    const pairs: any[] = []; let init = false;
    const ended = new Map<any, { t: number; why: string }>();
    const ev = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => { if (type === 'shed' && a) ended.set(a, { t: sim.t, why: note ?? '' }); return ev(type, a, b, note); };
    const hist = new Map<any, { t: number; lev: number }[]>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const qb = sim.qb; if (!qb) return;
      if (!init) {
        init = true;
        for (const tk of sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT')) {
          const out = Math.sign(tk.pos.y - sim.ballY) || 1;
          const cand = sim.defense.filter((d: any) => ['EDGE', 'DT', 'LB'].includes(d.player.position) && out * (d.pos.y - tk.pos.y) >= 0 && out * (d.pos.y - tk.pos.y) <= 4);
          if (!cand.length) continue;
          const d = cand.reduce((m: any, c: any) => out * (c.pos.y - tk.pos.y) > out * (m.pos.y - tk.pos.y) ? c : m);
          pairs.push({ tk, d, out, was: 0, done: false });
        }
      }
      if (sim.carrier !== qb || sim.throwAt >= 0) return;
      for (const pr of pairs) {
        const { tk, d, out } = pr;
        const width = out * (d.pos.y - tk.pos.y);
        if (pr.startSideIn === undefined && d.engagement && d.engagement.blocker === tk) {
          const ax = { x: qb.pos.x - d.pos.x, y: qb.pos.y - d.pos.y }, L = Math.hypot(ax.x, ax.y) || 1;
          pr.startSideIn = (ax.x / L) * d.engagement.side * (Math.sign(sim.ballY - tk.pos.y) || -out) > 0;
        }
        const h = hist.get(pr) ?? []; h.push({ t: sim.t, lev: out * (d.pos.y - tk.pos.y) }); hist.set(pr, h);
        if (!pr.done && pr.was >= -0.3 && width < -0.3 && Math.hypot(d.pos.x - tk.pos.x, d.pos.y - tk.pos.y) < 2) {
          pr.done = true;
          const e = d.engagement && d.engagement.blocker === tk ? d.engagement : null;
          const end = ended.get(d);
          const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === tk.body && j.b === d.body) || (j.a === d.body && j.b === tk.body)));
          const toBall = Math.sign(sim.ballY - tk.pos.y) || -out;
          const it = sim.intents[tk.idx];
          const before = h.find((x) => x.t >= sim.t - 0.3) ?? h[0];
          const di = sim.intents[d.idx], ds = di ? Math.hypot(di.vel.x, di.vel.y) : NaN;
          const cross = di ? (di.vel.y * toBall) / Math.max(1e-6, ds) : NaN;   // share of his request toward the ball (across the tackle)
          // His working side: inside (toward the ball, across the tackle) or outside, and whether he was in power.
          const lat = (() => { const ax = { x: qb.pos.x - d.pos.x, y: qb.pos.y - d.pos.y }, L = Math.hypot(ax.x, ax.y) || 1; return { x: -ax.y / L, y: ax.x / L }; })();
          const sideIn = e ? (lat.y * e.side * toBall > 0) : null;
          const row: any = { sideIn, startIn: pr.startSideIn ?? null, power: e ? (e.move === 'bull' || e.move === 'longarm') : null, rReq: ds / d.profile.vmax, rPush: di?.push ?? NaN, rCross: cross, rAch: Math.hypot(d.vel.x, d.vel.y), t: sim.t, engaged: !!e, move: e?.move ?? null, ok: e ? e.moveOk : null, live: e ? sim.t < e.moveUntil && e.moveOk : false,
            control: e?.control ?? NaN, ended: end && sim.t - end.t <= 0.3 ? end.why : null,
            latReq: (it?.vel.y ?? 0) * toBall, latAch: tk.vel.y * toBall, levBefore: before.lev,
            hands: !!j, N: j?.normalForce ?? 0, T: j?.tangentForce ?? 0, grip: j ? !!j.grip : null, help: null as any };
          // Help in the next 0.5 s: another blocker within 2 yd of him.
          const t0 = sim.t, others = sim.offense.filter((o: any) => o !== tk && o !== qb && ['OT', 'OG', 'C', 'TE', 'RB', 'FB'].includes(o.player.position));
          const watch = () => {
            if (sim.t - t0 > 0.5 || row.help?.engaged) return;
            for (const o of others) {
              const dist = Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y);
              if (dist > 2) continue;
              row.help ??= { first: sim.t - t0, busy: 0, free: 0, engaged: null };
              const busy = !!o.engagement && o.engagement.defender !== d && o.engagement.blocker !== d;
              if (d.engagement && (d.engagement.blocker === o || d.engagement.helpers?.includes(o))) row.help.engaged = sim.t - t0;
              else if (busy) row.help.busy++; else row.help.free++;
            }
          };
          pr.watch = watch;
          rows.push(row);
        }
        pr.watch?.();
        pr.was = width;
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
const R = rows;
console.log(`dropbacks ${dropbacks} | edge rusher crossings inside his tackle (within 2 yd): ${R.length} (${pc(R.length, dropbacks)} of dropbacks)`);
const mv: Record<string, number> = {}; for (const r of R) { const k = r.engaged ? `${r.move}${r.ok ? (r.live ? ' (won roll, live)' : ' (won roll)') : ' (lost roll)'}` : r.ended ? `rep just ended: ${r.ended}` : 'not engaged'; mv[k] = (mv[k] ?? 0) + 1; }
console.log('  at the crossing: ' + Object.entries(mv).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pc(v, R.length)}`).join(' | '));
console.log(`  tackle lateral toward the ball: requested p50 ${q(R.map((r) => r.latReq)).toFixed(2)}, achieved ${q(R.map((r) => r.latAch)).toFixed(2)} yd/s | his leverage 0.3 s before (rusher's width outside him; + = tackle inside the rusher) p25/50/75 ${q(R.map((r) => r.levBefore), .25).toFixed(2)}/${q(R.map((r) => r.levBefore)).toFixed(2)}/${q(R.map((r) => r.levBefore), .75).toFixed(2)}`);
const J = R.filter((r) => r.hands);
console.log(`  hands joint on ${pc(J.length, R.length)}: normal N p25/50/75 ${q(J.map((r) => r.N), .25).toFixed(0)}/${q(J.map((r) => r.N)).toFixed(0)}/${q(J.map((r) => r.N), .75).toFixed(0)} (compression > 50: ${pc(J.filter((r) => r.N > 50).length, J.length)}) | |T| p50 ${q(J.map((r) => Math.abs(r.T))).toFixed(0)} | grip ${pc(J.filter((r) => r.grip).length, J.length)} | control p50 ${q(R.filter((r) => r.engaged).map((r) => r.control)).toFixed(2)}`);
console.log(`  rusher at the crossing: requests ${q(R.map((r) => r.rReq)).toFixed(2)} of his vmax (p25/75 ${q(R.map((r) => r.rReq), .25).toFixed(2)}/${q(R.map((r) => r.rReq), .75).toFixed(2)}), push ${q(R.map((r) => r.rPush)).toFixed(2)}, across the tackle (toward the ball) ${q(R.map((r) => r.rCross)).toFixed(2)} of it | achieved speed p50 ${q(R.map((r) => r.rAch)).toFixed(2)} yd/s`);
const E = R.filter((r) => r.sideIn !== null);
console.log(`  his working side at the crossing (engaged): inside ${pc(E.filter((r) => r.sideIn).length, E.length)} | it was inside when the rep began ${pc(R.filter((r) => r.startIn).length, R.filter((r) => r.startIn !== null).length)} | in 'power' (last move bull/longarm) ${pc(E.filter((r) => r.power).length, E.length)}`);
const Hh = R.filter((r) => r.help);
console.log(`  help within 2 yd in the next 0.5 s: ${pc(Hh.length, R.length)} (first p50 ${q(Hh.map((r) => r.help.first)).toFixed(2)} s) | engaged him ${pc(Hh.filter((r) => r.help.engaged !== null).length, R.length)} (p50 at ${q(Hh.filter((r) => r.help.engaged !== null).map((r) => r.help.engaged)).toFixed(2)} s) | within 2 yd, free and did nothing: ${pc(Hh.filter((r) => r.help.engaged === null && r.help.free > 0).length, R.length)} | within 2 yd but busy with another man only: ${pc(Hh.filter((r) => r.help.engaged === null && r.help.free === 0).length, R.length)}`);
