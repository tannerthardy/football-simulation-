// Same operator as nfl_contest.py on the 732 panel; adds the event that ended the flight (pbu / drop / catch / interception).
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const out: string[] = [];
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) continue;
    const H: any[] = []; let th = -1, T: any = null, rel: any = null, arr: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick();
      H.push({ t: sim.t, s: sim.agents.map((x: any) => ({ x: x.pos.x, y: x.pos.y, f: x.body.facing })) });
      if (th < 0 && !air && sim.ball.kind === 'air') { th = H.length - 1; T = sim.ball.target; rel = sim.ballPos(); }
      if (th >= 0 && !arr && air && sim.ball.kind !== 'air') arr = H.length - 1; };
    const res: any = sim.run(); const s: any = sim.stats;
    if (th < 0 || !T || arr === null) continue;
    const A = H[arr], tp = A.s[T.idx], depth = tp.x - sim.los;
    let d: any = null, dist = Infinity; for (const x of sim.defense) { const q = A.s[x.idx], dd = Math.hypot(q.x - tp.x, q.y - tp.y); if (dd < dist) { dist = dd; d = x; } }
    const b3 = H[Math.max(0, arr - 6)]; const dist3 = Math.hypot(b3.s[d.idx].x - b3.s[T.idx].x, b3.s[d.idx].y - b3.s[T.idx].y);
    const q = A.s[d.idx], bx = rel.x - q.x, by = rel.y - q.y, L = Math.hypot(bx, by) || 1, face = (Math.cos(q.f) * bx + Math.sin(q.f) * by) / L;
    const evs = (res.events ?? []).map((e: any) => e.type).filter((t: string) => ['pbu', 'drop', 'deflection', 'interception', 'catch'].includes(t));
    out.push(JSON.stringify({ depth, sep: dist, sep3: dist3, closing: (dist3 - dist) / 0.3, face, res: s.interceptedBy ? 'IN' : s.completed ? 'C' : 'I', ev: evs[0] ?? 'none', pd: s.passDefendedBy === d.player.id })); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);
