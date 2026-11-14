// BACK_CHECK review rows (Flex, 2026-11-14), seed games, BACK_CHECK as set in the environment:
// - stalls: uncounted checking backs (pass-pro, not in the protection) still standing unengaged at 2.5 s;
// - late adds: for each back added to the coordinator mid-play, how many linemen's assigned men change at the next
//   coordinator solve, against the ordinary rate of lineman assignment changes per solve;
// - the share of checking backs who end up blocking (engaged in protection at any time);
// - check routes' first target time (the throw to a back on an angle / out / checkdown), p25/50/75.
//   node --import tsx scripts/diag/eyes/back-check-trace.ts [seed] [games]
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const [seedArg, gamesArg] = process.argv.slice(2);
const seed = Number(seedArg ?? 11), games = Number(gamesArg ?? 2);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const B = await import('../../../src/sim/behaviors/blocking.js');
const { routeOfAgent } = await import('../../../src/sim/behaviors/receiver.js');
const isOL = (a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot);
const C: any = (B as any).ProtectionCoordinator.prototype, add0 = C.add, up0 = C.update;
let lateAdds = 0, lateAddChanges = 0, solves = 0, solveChanges = 0;
C.add = function (a: any) { return add0.call(this, a); };
let comesSolves = 0, comesChanges = 0;
C.update = function (sim: any) {
  const before = new Map(this.protectors.filter(isOL).map((p: any) => [p, this.assigned.get(p) ?? null]));
  const r = up0.call(this, sim); this.__started = true;
  if (this.__lastT === sim.t) return r; this.__lastT = sim.t;
  let ch = 0; for (const [p, m] of before) if ((this.assigned.get(p) ?? null) !== m) ch++;
  if (this.__keyComesTickPrev) { comesSolves++; comesChanges += ch; } else { solves++; solveChanges += ch; }
  this.__keyComesTickPrev = !!this.__keyComesTick; this.__keyComesTick = false;
  return r;
};
let checking = 0, stalls = 0, blocked = 0, blockedCame = 0; const tgt: number[] = [];
const run = (PlaySim.prototype as any).run;
(PlaySim.prototype as any).run = function (this: any) {
  const sim = this, pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen' || pass.family === 'playaction') return run.call(this);
  const backs = sim.offense.filter((o: any) => sim.offAlign.spots[o.slot]?.backfield && o !== sim.qb);
  const chk = new Set<any>(), eng = new Set<any>(), came = new Set<any>(); let t0 = -1, stalled = new Set<any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (t0 < 0) t0 = sim.t;
    for (const b of backs) { if (b.behavior?.kind === 'pass-pro') { chk.add(b); if (b.engagement) { eng.add(b); const ks = (b.behavior as any).keys as any[] | null; if (ks?.some((k: any) => k.d === b.engagement.defender && k.state === 'comes')) came.add(b); } }
      if (Math.abs(sim.t - t0 - 2.5) < sim.dt / 2 && b.behavior?.kind === 'pass-pro' && !b.engagement && !(b.behavior as any).coord?.protectors?.includes(b)) stalled.add(b); }
    if (sim.throwAt >= 0 && tgt.length >= 0 && sim.ball.kind === 'air' && !(sim as any).__tg) { (sim as any).__tg = true;
      const T = sim.ball.target; const r = T ? routeOfAgent.get(T) ?? '' : ''; if (/angle|back_out|checkdown/.test(r)) tgt.push(sim.throwAt - t0); } };
  const res = run.call(this);
  checking += chk.size; stalls += stalled.size; blocked += eng.size; blockedCame += came.size;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
tgt.sort((a, b) => a - b); const q = (f: number) => tgt.length ? tgt[Math.floor(f * (tgt.length - 1))].toFixed(2) : '-';
console.log(`BACK_CHECK=${process.env.BACK_CHECK ?? 0}: backs in pass-pro ${checking}, ended blocking ${blocked} (${(100 * blocked / Math.max(1, checking)).toFixed(0)}%; a key who came ${blockedCame}), stalled at 2.5 s ${stalls}`);
console.log(`  lineman assignment changes on the solve after a key comes: ${comesChanges} / ${comesSolves} (${(comesChanges / Math.max(1, comesSolves)).toFixed(2)} a solve) vs other solves ${(solveChanges / Math.max(1, solves)).toFixed(3)} (n ${solves})`);
console.log(`  check routes' first target time p25/50/75 ${q(.25)}/${q(.5)}/${q(.75)} s (n ${tgt.length})`);
