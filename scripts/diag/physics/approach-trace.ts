/** How the first-contact defender approaches a designed run, in full games:
 * requested versus achieved velocity over the last 0.6 s before the first
 * carrier contact, in the carrier's frame (along his travel; closing on the
 * line of centers), with the defender's behavior kind. Separates a charging
 * request (controller) from an achieved charge (execution). Observation only.
 * node --import tsx scripts/diag/physics/approach-trace.ts [seed=101] [games=2]
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
type Sample = { t: number; px: number; py: number; vx: number; vy: number; rx: number; ry: number; cx: number; cy: number; cvx: number; cvy: number; kind: string; group: string };
type Row = { group: string; kind: string; ang: number; at: Map<number, { reqWith: number; actWith: number; reqClose: number; actClose: number; dist: number }> };
const rows: Row[] = [];
const hist = new WeakMap<PlaySim, { seen: number; done: boolean; buf: Map<number, Sample[]> }>();
type AnySim = PlaySim & Record<string, any>;
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: AnySim) {
  original.call(this);
  if (this.offCall?.kind !== 'run') return;
  let h = hist.get(this);
  if (!h) { h = { seen: 0, done: false, buf: new Map() }; hist.set(this, h); }
  const c = this.carrier as Agent | null;
  if (h.done || !c || c.team !== 'O' || c === this.qb || this.handoffAt < 0) { h.seen = this.events.length; return; }
  for (const d of this.defense as Agent[]) {
    if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) > 6) continue;
    const r = this.intents[d.idx]?.vel ?? { x: 0, y: 0 };
    const b = h.buf.get(d.idx) ?? [];
    b.push({ t: this.t, px: d.pos.x, py: d.pos.y, vx: d.vel.x, vy: d.vel.y, rx: r.x, ry: r.y, cx: c.pos.x, cy: c.pos.y, cvx: c.vel.x, cvy: c.vel.y,
      kind: `${d.behavior.kind}${d.engagement ? '+engaged' : ''}`, group: d.slot.replace(/[0-9_].*$/, '') });
    while (b.length && b[0].t < this.t - .7) b.shift();
    h.buf.set(d.idx, b);
  }
  const fresh = this.events.slice(h.seen); h.seen = this.events.length;
  for (const ev of fresh) if (ev.type === 'carrier_contact' && ev.a === c.idx && ev.b !== undefined) {
    h.done = true;
    const b = h.buf.get(ev.b); if (!b?.length) break;
    const last = b[b.length - 1], sp = Math.hypot(last.cvx, last.cvy);
    if (sp < 2) break;
    const ux = last.cvx / sp, uy = last.cvy / sp;
    const dx = last.px - last.cx, dy = last.py - last.cy, L = Math.hypot(dx, dy) || 1;
    const row: Row = { group: last.group, kind: b[Math.max(0, b.length - 4)].kind, ang: Math.acos(Math.max(-1, Math.min(1, (ux * dx + uy * dy) / L))) * 57.3, at: new Map() };
    for (const off of [.6, .4, .2, 0]) {
      const s = b.find((x) => x.t >= this.t - off - 1e-9); if (!s) continue;
      const ex = s.cx - s.px, ey = s.cy - s.py, E = Math.hypot(ex, ey) || 1;
      row.at.set(off, { reqWith: s.rx * ux + s.ry * uy, actWith: s.vx * ux + s.vy * uy,
        reqClose: ((s.rx - s.cvx) * ex + (s.ry - s.cvy) * ey) / E, actClose: ((s.vx - s.cvx) * ex + (s.vy - s.cvy) * ey) / E, dist: E });
    }
    rows.push(row);
    break;
  }
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g });

const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
const show = (label: string, rs: Row[]) => {
  if (!rs.length) return;
  console.log(`\n${label}: n ${rs.length}   (s before contact: requested / achieved)`);
  for (const [key, name] of [['With', 'v along carrier travel'], ['Close', 'closing on line of centers']] as const)
    console.log(`  ${name.padEnd(28)} ${[.6, .4, .2, 0].map((o) => `${o.toFixed(1)}s ${f(med(rs.map((r) => (r.at.get(o) as any)?.[`req${key}`])))} / ${f(med(rs.map((r) => (r.at.get(o) as any)?.[`act${key}`])))}`).join('  ')}`);
  console.log(`  center distance              ${[.6, .4, .2, 0].map((o) => `${o.toFixed(1)}s ${med(rs.map((r) => r.at.get(o)?.dist ?? NaN)).toFixed(2)}`).join('  ')}`);
};
show('all', rows);
for (const k of [...new Set(rows.map((r) => r.kind))]) show(`behavior ${k}`, rows.filter((r) => r.kind === k));
for (const g of [...new Set(rows.map((r) => r.group))]) show(`slot ${g}`, rows.filter((r) => r.group === g));
show('head-on (<45)', rows.filter((r) => r.ang < 45));
show('side (45-135)', rows.filter((r) => r.ang >= 45 && r.ang <= 135));
