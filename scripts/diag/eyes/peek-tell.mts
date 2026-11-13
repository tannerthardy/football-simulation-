// The deep defender's tell over each vertical on four verts (as nfl_peek_tell.py measures the NFL): at 2.0/2.2/2.4 s,
// for each go/seam, the defender deeper than him with the smallest lateral distance (< 10 yd): depth over, lateral
// offset (+ toward the middle), lateral velocity relative to the receiver (+ away), facing bin (to the ball at the snap),
// his depth past the LOS; outcome: separation at 2.85 s (or at the throw if earlier) >= 2.5 yd; target / completed.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const MID = 53.33 / 2;
for (const coverage of ['cover2', 'cover4', 'cover3', 'cover6', 'cover1']) for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip }));
  const dir = sim.attackDir('O'), los = sim.los, ballY = sim.ballY;
  const verts = () => sim.offense.filter((a: any) => ['go', 'seam'].includes(a.behavior?.route?.id) || (a.behavior?.kind === 'track' && a.slot !== 'RB'));
  const vlist: any[] = []; const snaps: any = {}; let thrT: number | null = null, target: string | null = null, sep: any = {};
  const prev = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    for (const d of sim.defense) prev.set(d, { x: d.pos.x, y: d.pos.y, t: sim.t });
    tick();
    if (!vlist.length && sim.t > 0.5) for (const a of sim.offense) if (['go', 'seam'].includes(a.behavior?.route?.id)) vlist.push(a);
    for (const T of [2.0, 2.2, 2.4]) if (!snaps[T] && sim.t >= T - 1e-9 && sim.ball.kind === 'held') {
      snaps[T] = vlist.map((r: any) => {
        let best: any = null;
        for (const d of sim.defense) {
          const over = (d.pos.x - r.pos.x) * dir, dy = Math.abs(d.pos.y - r.pos.y);
          if (over > 0 && dy < 10 && (!best || dy < best.dy)) best = { d, over, dy };
        }
        if (!best) return { slot: r.slot, none: true };
        const d = best.d, p = prev.get(d), dt = sim.t - p.t || sim.dt;
        const vy = (d.pos.y - p.y) / dt, ry = r.vel.y;
        const towardMid = Math.sign(MID - r.pos.y) || 1;
        const away = Math.sign(d.pos.y - r.pos.y) || towardMid;
        const toBall = Math.atan2(ballY - d.pos.y, los - d.pos.x);
        const fa = Math.abs(Math.atan2(Math.sin(d.body.facing - toBall), Math.cos(d.body.facing - toBall))) * 180 / Math.PI;
        return { slot: r.slot, over: +best.over.toFixed(2), lat: +((d.pos.y - r.pos.y) * towardMid).toFixed(2), vlat: +(((vy - ry) * away)).toFixed(2),
          facing: fa < 45 ? 'qb' : fa <= 135 ? 'turned' : 'away', defDepth: +((d.pos.x - los) * dir).toFixed(1) };
      });
    }
    if (thrT === null && was !== 'air' && sim.ball.kind === 'air') { thrT = sim.t; target = sim.ball.target?.slot ?? null; }
    const tSep = thrT !== null && thrT < 2.85 ? thrT : 2.85;
    if (!sep.done && sim.t >= tSep - 1e-9) { for (const r of vlist) sep[r.slot] = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))); sep.done = true; }
  };
  sim.run();
  const caught = !!sim.stats.completed;
  for (const r of vlist) console.log(JSON.stringify({ coverage, seed, flip, slot: r.slot, open: (sep[r.slot] ?? 0) >= 2.5, sep: +(sep[r.slot] ?? 0).toFixed(2), target: target === r.slot, caught: target === r.slot && caught,
    t: Object.fromEntries(Object.entries(snaps).map(([k, v]: any) => [k, v.find((x: any) => x.slot === r.slot)])) }));
}
