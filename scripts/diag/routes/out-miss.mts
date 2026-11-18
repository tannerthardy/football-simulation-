// Per-play trace of out / quick_out targets on staged dropbacks (route-outcome.mts's loop, keyed per play), to pair a
// flag's arms play by play: at the arrival time the QB planned, where the receiver is against the aim point (miss),
// his speed and how far his velocity points off the line from him to the aim (turn), the nearest defender to the aim,
// and the post-throw events (pbu, drop, deflection, catch, int).
//   node --import tsx scripts/diag/routes/out-miss.mts [seeds] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/routes/out-miss.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const ROUTES = new Set((process.env.ROUTES ?? 'out,quick_out').split(','));
const CONCEPTS = (process.env.CONCEPTS ?? 'double_outs,flood,hitch_out,quick_outs,sail_corner,trips_outs,trips_sail').split(',');
const rows: any[] = [];
for (const concept of CONCEPTS) for (const coverage of ['cover3', 'cover4', 'cover2', 'cover1']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const routeOf = new Map<any, string>();
    let T: any = null, route: string | null = null, aim: any = null, arr = -1, tThrow = -1, at: any = null, sepThrow = 0, nEv = 0;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.throwAt < 0) { for (const r of sim.offense) { const id = r.behavior?.route?.id; if (id) routeOf.set(r, id); } return; }
      if (!T) {
        T = sim.offense.find((r: any) => r.player.id === sim.stats.target) ?? null;
        if (!T) return;
        route = routeOf.get(T) ?? null; tThrow = sim.throwAt; nEv = sim.events.length;
        aim = sim.ball.intended; arr = sim.ball.arrivalT;
        sepThrow = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y)));
      }
      if (!at && aim && sim.t >= arr) {
        const dx = aim.x - T.pos.x, dy = aim.y - T.pos.y, n = Math.hypot(dx, dy) || 1e-9, sp = Math.hypot(T.vel.x, T.vel.y);
        const turn = sp > .3 ? Math.acos(Math.max(-1, Math.min(1, (T.vel.x * dx + T.vel.y * dy) / (n * sp)))) * 180 / Math.PI : null;
        const dAim = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - aim.x, d.pos.y - aim.y)));
        at = { miss: +n.toFixed(2), along: +((dx * T.vel.x + dy * T.vel.y) / (sp || 1)).toFixed(2), speed: +sp.toFixed(2), turn: turn == null ? null : Math.round(turn),
          dDefAim: +dAim.toFixed(2), ball: sim.ball.kind };
      }
    };
    const res = sim.run();
    const s = res.stats;
    if (!s.attempted || !route || !ROUTES.has(route)) continue;
    rows.push({ key: `${concept}|${coverage}|${formation}|${seed}|${flip ? 'F' : 'N'}`, route, comp: !!s.completed, int: !!s.interceptedBy, drop: !!s.dropped,
      yards: res.yards, tThrow: +tThrow.toFixed(2), flight: +(arr - tThrow).toFixed(2), sepThrow: +sepThrow.toFixed(2), aim: aim && { x: +aim.x.toFixed(1), y: +aim.y.toFixed(1), z: +aim.z.toFixed(1) }, at,
      ev: sim.events.slice(nEv).filter((e: any) => !/move|step/.test(e.type)).slice(0, 6).map((e: any) => `${e.t}:${e.type}${e.note ? '(' + e.note + ')' : ''}`) });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
console.log(rows.length, 'rows', rows.filter(r => r.comp).length, 'comp');
