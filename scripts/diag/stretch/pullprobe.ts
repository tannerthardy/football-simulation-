/** Pullers on gap schemes, inside the sim (observation only). For every
 * pulling blocker: lateral displacement toward the play side at 0.6/1.0/1.4 s,
 * the share of his first second in which teammate spacing cut his requested
 * speed below 70%, his yaw travel in the first 1.2 s, and whether and when he
 * engaged his planned kick/trap target (or anyone) before 3 s.
 * node --import tsx scripts/diag/stretch/pullprobe.ts [concepts=power,counter,trap] [seeds=77] */
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const [concepts = 'power,counter,trap', seeds = '77'] = process.argv.slice(2);
const R = rosters();
const rows: any[] = [];
for (const concept of concepts.split(',')) for (const formation of ['i_pro_21', 'ace_12']) for (const dir of ['strong', 'weak'])
  for (const [look] of LOOK_SPECS) for (const roster of ['pair11', 'pair31']) for (const seed of seeds.split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look, roster, seed, formation } as any, R);
    const s = sim as any;
    sim.tick();
    const pullers = sim.offense.filter(o => (o.behavior as any).plan?.kind === 'pull');
    const st = pullers.map(p => ({ p, plan: (p.behavior as any).plan, y0: p.pos.y, f0: p.facing, lat: [NaN, NaN, NaN], trim: 0, n: 0, yaw: 0, fprev: p.facing, eng: -1, engT: -1, engAny: -1 }));
    const ps = Math.sign((st[0]?.plan.pullPath?.at(-1)?.y ?? 0) - (st[0]?.y0 ?? 0)) || 1;
    while (sim.phase === 'live' && sim.t < 3) {
      sim.tick();
      for (const q of st) {
        const a = q.p, side = Math.sign((q.plan.pullPath?.at(-1)?.y ?? a.pos.y) - q.y0) || ps;
        for (const [i, T] of [.6, 1.0, 1.4].entries()) if (Number.isNaN(q.lat[i]) && sim.t >= T - 1e-9) q.lat[i] = (a.pos.y - q.y0) * side;
        if (sim.t <= 1.0 && sim.t > .1) {
          const c = s.cmds[a.idx].vel, it = s.intents[a.idx].vel, cs = Math.hypot(c.x, c.y);
          if (cs > 1) { q.n++; if (Math.hypot(it.x, it.y) < .7 * cs) q.trim++; }
        }
        if (sim.t <= 1.2) { q.yaw += Math.abs(Math.atan2(Math.sin(a.facing - q.fprev), Math.cos(a.facing - q.fprev))); q.fprev = a.facing; }
        const e = a.engagement;
        if (e && q.engAny < 0) q.engAny = sim.t;
        if (e && q.engT < 0 && (e.defender === q.plan.target || e.blocker === q.plan.target)) q.engT = sim.t;
      }
    }
    while (sim.phase === 'live' && sim.t < 20) sim.tick();
    const gain = sim.buildResult().offenseYards;
    for (const q of st) rows.push({ concept, role: q.plan.pullRole, slot: q.p.slot, lat: q.lat, trim: q.n ? q.trim / q.n : 0, yaw: q.yaw * 180 / Math.PI, engT: q.engT, engAny: q.engAny, gain });
  }
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
for (const role of ['kick', 'trap', 'lead']) {
  const g = rows.filter(r => r.role === role);
  if (!g.length) continue;
  const f = (x: number) => x.toFixed(1);
  console.log(`${role.padEnd(5)} n ${g.length}: lateral yd p50 ${[0, 1, 2].map(i => f(med(g.map(r => r.lat[i])))).join('/')} at .6/1.0/1.4s | spacing-trimmed ${(100 * g.reduce((s, r) => s + r.trim, 0) / g.length).toFixed(0)}% of first second | yaw travel p50 ${f(med(g.map(r => r.yaw)))} deg, >270 ${(100 * g.filter(r => r.yaw > 270).length / g.length).toFixed(0)}% | engaged target ${(100 * g.filter(r => r.engT >= 0).length / g.length).toFixed(0)}% (t p50 ${f(med(g.filter(r => r.engT >= 0).map(r => r.engT)))}), anyone ${(100 * g.filter(r => r.engAny >= 0).length / g.length).toFixed(0)}% | gain p50 ${f(med(g.map(r => r.gain)))} neg ${(100 * g.filter(r => r.gain < 0).length / g.length).toFixed(0)}%`);
}
