/** Close re-steer split (Defense, report only; for Rules+Coaching's 1a', the tackle window). Pursuers in chase()
 * whose picture puts the carrier 1.5-3 yd away. A re-steer is a change of more than 20 deg in his final request
 * heading between two ticks, both requests over 1 yd/s. Each is charged to the first chase stage whose own command
 * turned by more than 20 deg (from chase's command trace, passive):
 *   handover      - chase switched between the close gather and the planned approach (planner flipped);
 *   close-gather  - inside the close gather, its own command turned (the near picture / gather weight);
 *   pursuit-aim   - the intercept sprint (pursuitPoint) turned;
 *   gather-blend  - the approach-and-gather blend turned while the sprint did not;
 *   around-bodies - only PURSUE_AROUND's bend turned;
 *   after:<stage> - chase's command held but a later pipeline stage turned his request (the first that did, from a
 *                   passive stub of the responsibility ledger: containment, orientation, open-to-ball, dive/lunge,
 *                   engagement, tackle bond, spacing, snap guard);
 *   none          - nothing above turned more than 20 deg (sum of small turns).
 * Also: share of in-band chase ticks that re-steer, and share of pursuers with any re-steer in the band.
 * usage: node --import tsx scripts/diag/effective-mass/close-resteer.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 2), seed0 = Number(process.argv[3] ?? 101);
const LO = 1.5, HI = 3, TURN = 20;
const chaseRec = new WeakMap<any, any>();
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: any, d: any) => { if (d?.kind === 'chase') chaseRec.set(a, d); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any;
};
const head = (v: any) => v && Math.hypot(v.x, v.y) > 1 ? Math.atan2(v.y, v.x) : null;
const turn = (a: number | null, b: number | null) => {
  if (a === null || b === null) return false;
  let d = Math.abs((a - b) * 180 / Math.PI) % 360; if (d > 180) d = 360 - d; return d > TURN;
};
const counts: Record<string, number> = {}; let ticks = 0, resteers = 0;
const pursuers = new Map<string, boolean>();
const prev = new WeakMap<any, any>();
const stageH = new WeakMap<any, Record<string, number>>();
const ORDER = ['containment', 'coverage-orientation', 'open-to-ball', 'technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard'];
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; for (const a of sim.agents) { chaseRec.delete(a); stageH.delete(a); }
  if (!sim.__stub) { sim.__stub = true; const was = sim.responsibility;
    const stageAll = (name: string, intents: any[], ...x: any[]) => { for (const a of sim.agents) { const v = intents?.[a.idx]?.vel; if (!v || Math.hypot(v.x, v.y) < 1) continue; const m = stageH.get(a) ?? {}; m[name] = Math.atan2(v.y, v.x); stageH.set(a, m); } return was?.stageAll?.(name, intents, ...x); };
    sim.responsibility = new Proxy({}, { get: (_o, k) => k === 'stageAll' ? stageAll : was && typeof was[k] === 'function' ? was[k].bind(was) : was ? was[k] : () => undefined }); }
  tick0.call(this);
  if (sim.phase !== 'live') return;
  for (const d of sim.defense) {
    const r = chaseRec.get(d), it = sim.intents?.[d.idx], P = prev.get(d);
    prev.delete(d);
    if (!r || !it || r.distance < LO || r.distance > HI) continue;
    const stages: Record<string, number | null> = {};
    for (const q of r.requests ?? []) stages[q.stage] = head(q.command?.vel);
    const last = (r.requests ?? []).at(-1);
    const cur = { final: head(it.vel), chaseOut: head(last?.command?.vel), planner: r.planner, stages, pipe: { ...(stageH.get(d) ?? {}) } };
    prev.set(d, cur);
    if (!P || cur.final === null || P.final === null) continue;
    ticks++;
    const key = `${sim.__playId ?? ''}:${d.idx}`; if (!pursuers.has(key)) pursuers.set(key, false);
    if (!turn(cur.final, P.final)) continue;
    resteers++; pursuers.set(key, true);
    const st = (s: string) => turn(cur.stages[s] ?? null, P.stages[s] ?? null);
    const src = cur.planner !== P.planner ? 'handover'
      : cur.planner === 'bypassed-close-gather' ? (st('close-gather') || turn(cur.chaseOut, P.chaseOut) ? 'close-gather' : 'after-chase')
      : st('intercept-sprint') ? 'pursuit-aim' : st('approach-and-gather') ? 'gather-blend' : st('around-bodies') ? 'around-bodies'
      : !turn(cur.chaseOut, P.chaseOut) ? 'after-chase' : 'none';
    const firstPipe = () => ORDER.find((k) => turn(cur.pipe[k] ?? null, P.pipe[k] ?? null)) ?? 'unstaged';
    const label = src === 'after-chase' ? `after:${firstPipe()}` : src;
    counts[label] = (counts[label] ?? 0) + 1;
  }
};
const run0 = PlaySim.prototype.run; let playNo = 0;
PlaySim.prototype.run = function (this: any) { this.__playId = ++playNo; return run0.call(this); };
const rng = new Rng(seed0);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g });
const anyShare = [...pursuers.values()].filter(Boolean).length / Math.max(1, pursuers.size);
console.log(`chase ticks at ${LO}-${HI} yd: ${ticks}; re-steers (> ${TURN} deg): ${resteers} (${(100 * resteers / Math.max(1, ticks)).toFixed(1)}% of ticks); pursuers with any: ${(100 * anyShare).toFixed(1)}% of ${pursuers.size}`);
for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(14)} ${String(n).padStart(5)}  ${(100 * n / Math.max(1, resteers)).toFixed(1)}%`);
