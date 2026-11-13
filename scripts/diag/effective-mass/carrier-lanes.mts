/** Carrier lane switches on the dither-guard panel (Defense, report only): each tick the carrier's route evaluation
 * selects a heading; count switches (> 20 deg between evaluations), reversals (back within 0.3 s), the score margin
 * of the new lane over the held one, and whether a teammate (blocker) within 3 yd of the carrier changed its own
 * request heading > 20 deg that tick. usage: [CARRIER_COMMIT=1] [SPACING_SMOOTH=1] node --import tsx <this> */
import { readFileSync } from 'node:fs';
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>).filter(([, v]) => v === 'on').map(([k]) => k);
for (const k of stackOn) if (process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { RUN_BY_ID, SCREEN_BY_ID, PASS_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const wrap = (d: number) => Math.abs(((d * 180 / Math.PI) + 540) % 360 - 180);
let secs = 0, switches = 0, reversed = 0; const margins: number[] = []; let teamTurn = 0, blockedSw = 0;
function play(cfg: any) {
  const sim: any = new PlaySim(cfg);
  type Sel = { h: number; score: number; kept: boolean; blocked: boolean };
  let sel = null as Sel | null;
  const tc0 = sim.commandTraceFor.bind(sim);
  sim.commandTraceFor = (a: any) => { const inner = tc0(a); return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'carrier'
    ? (d: any) => { if (d?.kind === 'evaluate' && d.selected && a === sim.carrier) { const cur = d.routes?.find((r: any) => r.current); sel = { h: d.selected.heading, score: d.selected.score - (cur?.score ?? d.selected.score), kept: d.selected.keptCurrent, blocked: d.selected.blocked }; } return o?.carrier?.(d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }); };
  const hist: { t: number; h: number }[] = []; const prevReq = new Map<any, number>();
  while (sim.phase !== 'dead' && sim.t < 12) {
    sel = null as Sel | null; sim.tick();
    const c = sim.carrier; if (!c || c === sim.qb || sim.phase !== 'live') continue;
    let turnNear = false;
    for (const m of sim.offense) { const v = sim.intents[m.idx]?.vel; if (!v || Math.hypot(v.x, v.y) < 1) continue; const h = Math.atan2(v.y, v.x), p = prevReq.get(m);
      if (m !== c && p !== undefined && wrap(h - p) > 20 && Math.hypot(m.pos.x - c.pos.x, m.pos.y - c.pos.y) < 3) turnNear = true; prevReq.set(m, h); }
    const cur = sel as Sel | null; if (!cur) continue; secs += sim.dt;
    const last = hist[hist.length - 1];
    if (last && wrap(cur.h - last.h) > 20) { switches++; margins.push(cur.score); if (turnNear) teamTurn++; if (cur.blocked) blockedSw++;
      const back = hist.slice(-6).find(x => sim.t - x.t <= 0.3 && x !== last && wrap(cur.h - x.h) <= 20); if (back) reversed++; }
    hist.push({ t: sim.t, h: cur.h });
  }
}
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++)
  play({ offense: pickOffense(offense, 'ace_12' === 'ace_12' ? FORMATION_BY_ID.ace_12.personnel : '12'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_12, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' }, los: 35, ballY: 26.65, firstDownX: 45, seed });
for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen']) for (let seed = 1; seed <= 10; seed++)
  play({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: seed % 2 === 0, kind: 'pass', pass: SCREEN_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'scr' }, los: 35, ballY: 26.65, firstDownX: 45, seed });
const q = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return w.length < 3 ? '-' : [.25, .5, .75].map(p => w[Math.floor(p * (w.length - 1))].toFixed(2)).join('/'); };
console.log(`carrier lanes: ${secs.toFixed(0)} carrier-s, switches ${switches} (${(switches / secs).toFixed(3)}/s), reversed ${reversed} (${(reversed / secs).toFixed(3)}/s); new-lane margin over held ${q(margins)}; with a teammate within 3 yd turning > 20 deg that tick ${(100 * teamTurn / Math.max(1, switches)).toFixed(0)}%; into a blocked lane ${(100 * blockedSw / Math.max(1, switches)).toFixed(0)}%`);
