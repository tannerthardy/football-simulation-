// Probe (Defense): which path drives the backside end on zone runs 0.5-1.5 s; tags, engagement, request vs achieved.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const ZONE = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone', 'stretch', 'toss']);
const C: Record<string, number> = {}; const fac: number[][] = []; const sp: number[][] = []; let n = 0;
const fired = new WeakMap<any, string>(); const wk = new WeakMap<any, string>();
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) { const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit' ? (t: any, d: any) => { fired.set(a, d?.kind); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any; };
const run0 = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, call = sim.offCall; if (!(call?.kind === 'run' && ZONE.has(call.run?.scheme))) return run0.call(this);
  let end: any = null, side = 0; const tick = sim.tick.bind(sim);
  sim.tick = () => {
    if (!end) { const dir = sim.attackDir(sim.offense[0].team); side = (call.run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
      const line = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * dir) < 1.5 && d.behavior?.kind === 'rush');
      end = line.filter((d: any) => Math.sign(d.pos.y - sim.ballY) === -side).sort((p: any, q: any) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY))[0] ?? null;
      if (end) { const ol = sim.offense.filter((o: any) => Math.abs((o.pos.x - sim.los) * dir) < 2 && o.slot && /^(LT|LG|C|RG|RT)$/.test(o.slot)); const out = Math.max(...ol.map((o: any) => -side * (o.pos.y - sim.ballY)));
        const off = -side * (end.pos.y - sim.ballY) - out; wk.set(end, (end.setStance === 'up' ? 'up' : 'down') + (off >= 1.0 ? '-wide' : '-tight')); } }
    for (const a of sim.agents) { fired.delete(a); a.tags.delete('backside-chase'); a.tags.delete('end-chase'); }
    tick();
    if (!end || sim.t < 0.5 || sim.t > 1.5 || sim.phase !== 'live') return;
    n++;
    const it = sim.intents[end.idx]; const key = [end.engagement ? 'engaged' : 'free', end.runFit?.kind ?? 'nofit', fired.get(end) ? 'pursuit:' + fired.get(end) : '', end.tags.has('backside-chase') ? 'chase-open' : '', end.tags.has('end-chase') ? 'end-chase' : '', wk.get(end), sim.carrier && sim.carrier !== sim.qb ? 'handed' : 'premesh'].filter(Boolean).join(' ');
    C[key] = (C[key] ?? 0) + 1;
    if (!end.engagement) { const f = Math.abs((((end.body.facing - Math.atan2(end.vel.y, end.vel.x)) * 180 / Math.PI) % 360 + 540) % 360 - 180); const fi = it.facing === undefined ? NaN : Math.abs((((it.facing - Math.atan2(it.vel.y, it.vel.x)) * 180 / Math.PI) % 360 + 540) % 360 - 180); fac.push([f, fi, end.tags.has('backside-chase') ? 1 : 0]); } if (!end.engagement) sp.push([Math.hypot(it.vel.x, it.vel.y), Math.hypot(end.vel.x, end.vel.y), side * it.vel.y, side * end.vel.y]);
  };
  return run0.call(this);
};
if (process.argv[2] === 'fixed') {
  const { readFileSync } = await import('node:fs'); const { restoreSetup } = await import('../saved-play.js'); PlaySim.recordedSingleStream = true;
  for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) { if (p.pass) continue;
    const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue; new PlaySim(st).run(); }
} else {
const rng = new Rng(101); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < 2; g++) simulateGame(leagueSample(home, 101 + g), leagueSample(away, 101 + g), { seed: 101 + g, record: false });
}
const q = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(p => w[Math.floor(p * (w.length - 1))].toFixed(1)).join('/'); };
console.log('ticks', n); for (const [k, v] of Object.entries(C).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${(100 * v / n).toFixed(0)}%  ${k}`);
console.log('free: requested speed', q(sp.map(s => s[0])), 'achieved', q(sp.map(s => s[1])), '| toward play requested', q(sp.map(s => s[2])), 'achieved', q(sp.map(s => s[3])));
console.log('free: body facing off his velocity', q(fac.map(f => f[0])), '| requested facing off requested velocity', q(fac.filter(f => Number.isFinite(f[1])).map(f => f[1])), '| chase-open', (100 * fac.filter(f => f[2]).length / fac.length).toFixed(0) + '%', '| facing off velocity when chase-open', q(fac.filter(f => f[2]).map(f => f[0])));
