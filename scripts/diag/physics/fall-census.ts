/** Fall census in full games: every non-dive fall by position group, play
 * kind, cause (contact, legs, overspeed), what the player was doing in the
 * step before (ball carrier, in a tackle, engaged in a block, free), and how
 * long after the snap. Rates are per 100 player-plays. Observation only.
 * node --import tsx scripts/diag/physics/fall-census.ts [seed=101] [games=2]
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const group = (a: Agent) => {
  const s = a.slot.replace(/[0-9_].*$/, '');
  if (['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)) return 'OL';
  if (['DE', 'DT', 'NT'].includes(s)) return 'DL';
  if (s === 'LB') return 'LB';
  if (['CB', 'S', 'FS', 'SS', 'NB'].includes(s)) return 'DB';
  if (a.player.position === 'TE') return 'TE';
  if (a.player.position === 'WR') return 'WR';
  if (a.player.position === 'RB' || a.player.position === 'FB') return 'RB';
  return a.player.position;
};
type Fall = { kind: string; group: string; cause: string; context: string; t: number; peakBefore: number; closing: number; impulse: number; partner: string; lean: number; xi: number; mass: number };
type Hist = { t: number; closing: number; impulse: number; partner: string; lean: number; xi: number }[];
const hist = new WeakMap<Agent, Hist>();
const falls: Fall[] = [];
const plays = new Map<string, number>(); // kind:group -> player-plays
const seen = new WeakMap<PlaySim, { n: number; ctx: Map<number, string>; t0: number }>();
type AnySim = PlaySim & Record<string, any>;
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: AnySim) {
  const kind = this.offCall?.kind ?? '?';
  let st = seen.get(this);
  if (!st) {
    st = { n: this.events.length, ctx: new Map(), t0: this.t };
    seen.set(this, st);
    for (const a of this.agents as Agent[]) plays.set(`${kind}:${group(a)}`, (plays.get(`${kind}:${group(a)}`) ?? 0) + 1);
  }
  for (const a of this.agents as Agent[]) {
    const bond = this.bond;
    st.ctx.set(a.idx, a === this.carrier ? 'carrier' : bond?.tacklers.includes(a) ? 'tackler'
      : a.engagement ? `engaged-${a.engagement.type}` : 'free');
  }
  original.call(this);
  for (const c of (this.lastStep?.contacts ?? []) as { i: number; j: number; impulse: number; closing: number }[]) {
    for (const [x, y] of [[c.i, c.j], [c.j, c.i]]) {
      const a = this.agents[x] as Agent, h = hist.get(a) ?? [];
      h.push({ t: this.t, closing: c.closing, impulse: c.impulse, partner: `${group(this.agents[y])}${this.agents[y].team === a.team ? '(team)' : ''}`, lean: 0, xi: 0 });
      hist.set(a, h.filter((r) => r.t > this.t - .4));
    }
  }
  for (const a of this.agents as Agent[]) {
    const s = a.body.support; if (!s || s.state !== 'up') continue;
    const h = hist.get(a) ?? [];
    h.push({ t: this.t, closing: 0, impulse: 0, partner: '', lean: Math.hypot(s.lean.x, s.lean.y), xi: Math.hypot(s.xi.x, s.xi.y) });
    hist.set(a, h.filter((r) => r.t > this.t - .4));
  }
  for (const ev of this.events.slice(st.n)) {
    if (ev.type !== 'fall' || ev.a === undefined || ev.note === 'dive') continue;
    const a = this.agents[ev.a] as Agent;
    const h = hist.get(a) ?? [], top = h.reduce((m, r) => r.impulse > m.impulse ? r : m, { t: 0, closing: 0, impulse: 0, partner: 'none', lean: 0, xi: 0 });
    falls.push({ kind, group: group(a), cause: ev.note ?? '?', context: st.ctx.get(a.idx) ?? '?', t: this.t - st.t0, peakBefore: 0,
      closing: top.closing, impulse: top.impulse, partner: top.partner, lean: Math.max(0, ...h.map((r) => r.lean)), xi: Math.max(0, ...h.map((r) => r.xi)), mass: a.profile.massKg });
  }
  st.n = this.events.length;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });

const groups = ['OL', 'DL', 'LB', 'DB', 'TE', 'WR', 'RB', 'QB'];
for (const kind of ['run', 'pass']) {
  console.log(`\n== ${kind} plays: non-dive falls per 100 player-plays (contexts; causes)`);
  for (const g of groups) {
    const n = plays.get(`${kind}:${g}`) ?? 0; if (!n) continue;
    const fs = falls.filter((f) => f.kind === kind && f.group === g);
    const by = (k: keyof Fall) => [...new Set(fs.map((f) => f[k] as string))].map((v) => `${v} ${(100 * fs.filter((f) => f[k] === v).length / n).toFixed(1)}`).join(', ');
    const med = (v: number[]) => { const s = [...v].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };
    console.log(`  ${g.padEnd(3)} player-plays ${String(n).padStart(5)} | falls ${(100 * fs.length / n).toFixed(1).padStart(5)} | ${by('context')} | ${by('cause')} | median t ${med(fs.map((f) => f.t)).toFixed(2)} s`);
  }
}

console.log('\nlineman falls (OL, DL): hardest body contact in the 0.4 s before, lean and balance deviation before');
const lf = falls.filter((f) => f.group === 'OL' || f.group === 'DL');
const med = (v: number[]) => { const s = [...v].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : NaN; };
for (const ctx of [...new Set(lf.map((f) => f.context))]) {
  const fs = lf.filter((f) => f.context === ctx);
  console.log(`  ${ctx.padEnd(13)} n ${String(fs.length).padStart(3)} | contact closing median ${med(fs.map((f) => f.closing)).toFixed(2)} yd/s, impulse ${med(fs.map((f) => f.impulse)).toFixed(0)} (dv ${med(fs.map((f) => f.impulse / f.mass)).toFixed(2)} yd/s) | no body contact ${fs.filter((f) => f.impulse === 0).length} | lean ${med(fs.map((f) => f.lean)).toFixed(0)} | xi ${med(fs.map((f) => f.xi)).toFixed(2)} | partners ${[...new Set(fs.map((f) => f.partner))].map((p) => `${p} ${fs.filter((f) => f.partner === p).length}`).join(', ')}`);
}
if (process.argv.includes('--rows')) for (const f of lf) console.log(JSON.stringify(f));
