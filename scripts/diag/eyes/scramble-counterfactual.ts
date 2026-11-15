// node --import tsx scripts/diag/eyes/scramble-counterfactual.ts [seed] [games] [FLAG=value ...]
// TRACK_FEEL's scramble drop (Integration, 2026-11-14): the engine runs with TRACK_FEEL off. At every call of
// QBPass.shouldScramble, on the identical state, the lane count it makes is recomputed from both pictures of the
// rushers in front of his shoulders: the old felt() (see(), the choice-reaction picture) and TRACK_FEEL's
// (track(), 0.12 s). Nothing in the run changes (no dice drawn, same calls). Per call: lanes open under each. Per
// play: the first tick each picture would let him go. For plays where the old picture lets him go and the tracking
// picture does not (by then), the lane that decides it and the defender whose margin moved it, with both pictures.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
const [seedArg, gamesArg, ...rest] = process.argv.slice(2);
for (const kv of rest) { const [k, v] = kv.split('='); process.env[k] = v; }
process.env.TRACK_FEEL = '0';
const seed = Number(seedArg ?? 101), games = Number(gamesArg ?? 2);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { QBPass } = await import('../../../src/sim/behaviors/qb.js');
const { timeToReach } = await import('../../../src/physics/reach.js');
const HONEST = process.env.QB_HONEST_FEEL === '1';
const W = 53.333;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type Row = { t: number; panic: boolean; gate: boolean; offOpen: number; onOpen: number; need: number; detail: string };
const plays: { key: string; rows: Row[]; scrambled: boolean }[] = [];
let cur: { key: string; rows: Row[]; scrambled: boolean } | null = null, curSim: any = null;
const dm: number[] = [], dmPic: number[] = []; let picOnly = 0;
const offOpen0 = (L: any[]) => L.filter((l) => l.m > 0.35).length;
const P: any = QBPass.prototype, orig = P.shouldScramble, origFelt = P.felt;
function trackFelt(this: any, a: any, sim: any, d: any) {
  const at = HONEST ? sim.see(a, d).pos : d.pos;
  const raw = Math.atan2(at.y - a.pos.y, at.x - a.pos.x) - a.body.facing;
  const blind = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw))) > 1.8;
  return blind ? sim.see(a, d, 2.2 - 1.4 * a.r('pocketPresence')) : sim.track(a, d, 1, true);
}
function lanes(self: any, a: any, sim: any, panic: boolean, heldFrom?: any) {
  const L = [-4, -2, 0, 2, 4].map((dy) => ({ x: Math.max(a.pos.x + 4, sim.los + 1), y: clamp(a.pos.y + dy, 1, W - 1) }));
  if (panic) for (const s of [-1, 1]) L.push({ x: a.pos.x + 1, y: clamp(a.pos.y + s * 5.5, 1, W - 1) });
  const threats = sim.defense.filter((d: any) => !d.isDown(sim.t)).map((d: any) => ({ d, seen: self.felt(a, sim, d), held: heldFrom ? heldFrom.get(d) : self.held(a, d, sim) }));
  return L.map((q) => {
    const myT = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, q);
    let m = Infinity, who: any = null, seen: any = null, held = 0;
    for (const th of threats) {
      const tt = timeToReach({ pos: th.seen.pos, vel: th.seen.vel, profile: th.d.profile, speedScale: th.d.speedScale }, q, 1) + th.held;
      if (tt - myT < m) { m = tt - myT; who = th.d; seen = th.seen; held = th.held; }
    }
    return { q, m, who, seen, held };
  });
}
P.shouldScramble = function (a: any, sim: any, panic: boolean) {
  if (cur && sim === curSim) {
    const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
    const gate = panic || mobility >= 0.18;
    const off = lanes(this, a, sim, panic);
    const oldHeld = new Map(sim.defense.map((d: any) => [d, this.held(a, d, sim)]));
    this.felt = trackFelt;
    let on: any[], pic: any[]; try { on = lanes(this, a, sim, panic); pic = lanes(this, a, sim, panic, oldHeld); } finally { delete this.felt; }
    const picOpen = pic.filter((l) => l.m > 0.35).length;
    for (let i = 0; i < off.length; i++) if (Number.isFinite(off[i].m) && Number.isFinite(on[i].m) && gate) { dm.push(on[i].m - off[i].m); dmPic.push(pic[i].m - off[i].m); }
    if (gate && offOpen0(off) >= (panic ? 1 : 2) && picOpen < (panic ? 1 : 2)) picOnly++;
    const offOpen = off.filter((l) => l.m > 0.35).length, onOpen = on.filter((l) => l.m > 0.35).length, need = panic ? 1 : 2;
    let detail = '';
    if (gate && offOpen >= need && onOpen < need) {
      const flips = off.map((l, i) => ({ l, o: on[i], i })).filter(({ l, o }) => l.m > 0.35 && o.m <= 0.35);
      detail = flips.map(({ l, o, i }) => {
        const w = o.who, sOff = l.who === w ? l.seen : null;
        const tp = o.seen, tr = w.pos;
        return `lane ${i} (${(l.q.x - a.pos.x).toFixed(1)},${(l.q.y - a.pos.y).toFixed(1)}): margin ${l.m.toFixed(2)} -> ${o.m.toFixed(2)} by ${w.slot}${w.engagement ? '(engaged)' : ''} true ${Math.hypot(tr.x - a.pos.x, tr.y - a.pos.y).toFixed(1)} yd at ${Math.hypot(w.vel.x, w.vel.y).toFixed(1)} yd/s; old picture ${sOff ? `${Math.hypot(sOff.pos.x - tr.x, sOff.pos.y - tr.y).toFixed(2)} yd off, ${Math.hypot(sOff.vel.x, sOff.vel.y).toFixed(1)} yd/s, age ${(sOff.age ?? 0).toFixed(2)}` : `(other man ${l.who?.slot})`}; tracked ${Math.hypot(tp.pos.x - tr.x, tp.pos.y - tr.y).toFixed(2)} yd off, ${Math.hypot(tp.vel.x, tp.vel.y).toFixed(1)} yd/s; held ${l.held.toFixed(2)} -> ${o.held.toFixed(2)}`;
      }).join(' | ');
    }
    cur.rows.push({ t: sim.t, panic, gate, offOpen, onOpen, need, detail });
  }
  return orig.call(this, a, sim, panic);
};
// Know which PlaySim is live: wrap PlaySim.tick through the prototype.
const { PlaySim } = await import('../../../src/sim/playsim.js');
const tick0 = (PlaySim.prototype as any).tick;
(PlaySim.prototype as any).tick = function (this: any) {
  if (curSim !== this) { if (cur) plays.push(cur); curSim = this; cur = { key: `${plays.length}`, rows: [], scrambled: false }; }
  const r = tick0.call(this);
  if (this.scrambled) cur!.scrambled = true;
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as any);
if (cur) plays.push(cur);
const yes = (r: Row, k: 'offOpen' | 'onOpen') => r.gate && r[k] >= r.need;
let calls = 0, offYes = 0, onYes = 0, offOnly = 0, onOnly = 0, pPanic = 0;
const ex: string[] = []; let playsOff = 0, playsOn = 0, scr = 0, scrOnNever = 0;
for (const p of plays) {
  if (!p.rows.length) continue;
  for (const r of p.rows) { calls++; if (yes(r, 'offOpen')) offYes++; if (yes(r, 'onOpen')) onYes++;
    if (yes(r, 'offOpen') && !yes(r, 'onOpen')) { offOnly++; if (r.panic) pPanic++; } if (!yes(r, 'offOpen') && yes(r, 'onOpen')) onOnly++; }
  const fo = p.rows.find((r) => yes(r, 'offOpen')), fn = p.rows.find((r) => yes(r, 'onOpen'));
  if (fo) playsOff++; if (fn) playsOn++;
  if (p.scrambled) { scr++; if (!fn || fn.t > fo!.t) { scrOnNever++; const r = fo!; if (ex.length < 14) ex.push(`play ${p.key} t ${r.t.toFixed(2)} ${r.panic ? 'panic' : 'clock'} open ${r.offOpen} -> ${r.onOpen} (need ${r.need}); tracking picture lets him go ${fn ? `at ${fn.t.toFixed(2)}` : 'never'}\n     ${r.detail.replaceAll(' | ', '\n     ')}`); } }
}
console.log(`seed ${seed} x ${games}: plays with a scramble check ${plays.filter((p) => p.rows.length).length}, calls ${calls}`);
console.log(`calls a lane lets him go: old picture ${offYes}, tracking ${onYes}; old only ${offOnly} (panic ${pPanic}), tracking only ${onOnly}`);
console.log(`plays where some check lets him go: old ${playsOff}, tracking ${playsOn}`);
console.log(`plays he scrambled (old engine) ${scr}; of those the tracking picture would not have let him go by then ${scrOnNever}`);
const q = (v: number[], p: number) => { const w = [...v].sort((x, y) => x - y); return w[Math.floor(p * (w.length - 1))]; };
const mean = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;
console.log(`lane margin change tracking - old (s): mean ${mean(dm).toFixed(3)} p10/50/90 ${q(dm, .1).toFixed(3)}/${q(dm, .5).toFixed(3)}/${q(dm, .9).toFixed(3)} (n ${dm.length}); picture only (old hold) mean ${mean(dmPic).toFixed(3)} p50 ${q(dmPic, .5).toFixed(3)}; calls the picture alone closes ${picOnly} of ${offOnly}`);
for (const e of ex) console.log('  ' + e);
