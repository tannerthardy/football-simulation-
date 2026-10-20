/** Where teammate spacing throttles players (observation only). For free,
 * standing players asking for > 1 yd/s, a tick is throttled when the intent
 * after spacing keeps < 70% of the request's progress along its direction.
 * Grouped by role; for each throttle: the nearest teammate ahead (within 45
 * deg of the request, 2.5 yd), whether he was actually separating (true
 * relative velocity along the line of centers opening), and whether the
 * blocked request pointed straight at him (within 20 deg).
 * node --import tsx scripts/diag/stretch/spaceprobe.ts [concepts] [seeds] [until] */
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const [concepts = 'iz,oz,power,counter,trap', seeds = '77', until = '3'] = process.argv.slice(2);
const R = rosters();
type G = { ticks: number; thr: number; lost: number; sep: number; head: number; none: number };
const groups = new Map<string, G>();
const g = (k: string) => groups.get(k) ?? (groups.set(k, { ticks: 0, thr: 0, lost: 0, sep: 0, head: 0, none: 0 }), groups.get(k)!);
let plays = 0;
for (const concept of concepts.split(',')) for (const formation of ['i_pro_21', 'ace_12']) for (const dir of ['strong', 'weak'])
  for (const [look] of LOOK_SPECS) for (const seed of seeds.split(',').map(Number)) {
    const sim = makeSim({ concept, dir, look, roster: 'pair31', seed, formation } as any, R);
    const s = sim as any; plays++;
    while (sim.phase === 'live' && sim.t < Number(until)) {
      sim.tick();
      for (const a of sim.agents) {
        const c = s.cmds[a.idx]?.vel, it = s.intents[a.idx]?.vel;
        if (!c || !it || a.engagement || a.isDown(sim.t) || sim.bond?.tacklers.includes(a) || sim.bond?.carrier === a) continue;
        const cs = Math.hypot(c.x, c.y);
        if (cs < 1) continue;
        const b: any = a.behavior, job = a === sim.carrier ? 'carrier' : b.plan ? `${b.kind}/${b.plan.kind}${b.plan.pullRole ? ':' + b.plan.pullRole : ''}` : a.runFit ? `${b.kind}/${a.runFit.kind}` : b.kind;
        const key = `${a.team === sim.offense[0].team ? 'O' : 'D'} ${job}`;
        const G = g(key); G.ticks++;
        const ux = c.x / cs, uy = c.y / cs, prog = (it.x * ux + it.y * uy) / cs;
        if (prog >= .7) continue;
        G.thr++; G.lost += 1 - Math.max(0, prog);
        let best: any = null, bd = Infinity;
        for (const m of sim.agents) {
          if (m === a || m.team !== a.team) continue;
          const dx = m.pos.x - a.pos.x, dy = m.pos.y - a.pos.y, d = Math.hypot(dx, dy);
          if (d > 2.5 || (dx * ux + dy * uy) / d < Math.cos(Math.PI / 4)) continue;
          if (d < bd) { bd = d; best = m; }
        }
        if (!best) { G.none++; continue; }
        const dx = best.pos.x - a.pos.x, dy = best.pos.y - a.pos.y, d = Math.hypot(dx, dy);
        const opening = ((best.vel.x - a.vel.x) * dx + (best.vel.y - a.vel.y) * dy) / d;
        if (opening > .3) G.sep++;
        if ((dx * ux + dy * uy) / d > Math.cos(Math.PI / 9)) G.head++;
      }
    }
  }
console.log(`${plays} plays, first ${until} s; throttled = intent keeps <70% of requested progress`);
console.log('role'.padEnd(30) + 'moving ticks  throttled  mean progress lost  | teammate ahead separating  head-on  no teammate ahead');
for (const [k, v] of [...groups].sort((p, q) => q[1].thr - p[1].thr)) if (v.thr >= 20)
  console.log(`${k.padEnd(30)}${String(v.ticks).padStart(8)}  ${(100 * v.thr / v.ticks).toFixed(1).padStart(8)}%  ${(100 * v.lost / v.thr).toFixed(0).padStart(10)}%          | ${(100 * v.sep / v.thr).toFixed(0).padStart(8)}%  ${(100 * v.head / v.thr).toFixed(0).padStart(8)}%  ${(100 * v.none / v.thr).toFixed(0).padStart(8)}%`);
