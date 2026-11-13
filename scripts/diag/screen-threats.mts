/**
 * Screen threats: why did the first defender to reach the screen carrier get
 * there? For each completed screen in the lab matrix (screen-lab.mts), the
 * first defender within 1.5 yd of the carrier after the catch is classified:
 *   shed       a ScreenBlocker engaged him before he arrived
 *   chosen     a ScreenBlocker targeted him in the last 1.5 s but never engaged
 *   unchosen   no ScreenBlocker targeted him; what the blockers were doing instead
 *   rush       he was a down lineman (excluded from out/up/crack/stalk pools)
 *
 *   tsx scripts/diag/screen-threats.mts [--seeds 8] [--only rb_slip_screen] [--verbose]
 */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const arg = (name: string, d: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : d; };
const SEEDS = Number(arg('--seeds', '8'));
const ONLY = arg('--only', '').split(',').filter(Boolean);
const VERBOSE = process.argv.includes('--verbose');
const FORMATION: Record<string, string> = {
  rb_slip_screen: 'gun_doubles_11', te_screen: 'gun_trey_11', bubble_screen: 'gun_trips_11',
  bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11', wide_now_screen: 'gun_doubles_11',
};
const DEFENSES = [
  { label: 'C3', front: 'over', coverage: 'cover3', pressure: null },
  { label: 'C1', front: 'over', coverage: 'cover1', pressure: null },
  { label: 'C2', front: 'over', coverage: 'cover2', pressure: null },
  { label: 'C1 Mike A', front: 'over', coverage: 'cover1', pressure: 'mike_a' },
];
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const tally: Record<string, Record<string, number>> = {};
const f1 = (v: number) => v.toFixed(1);

for (const concept of SCREEN_CONCEPTS) {
  if (ONLY.length && !ONLY.includes(concept.id)) continue;
  const formation = FORMATION_BY_ID[FORMATION[concept.id]];
  for (const def of DEFENSES) for (let seed = 1; seed <= SEEDS; seed++) {
    const sim: any = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: concept, label: concept.name },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[def.front], coverage: COVERAGE_BY_ID[def.coverage],
        pressure: def.pressure ? PRESSURE_BY_ID[def.pressure] : null, label: def.label },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7,
    });
    const blockers: any[] = [];
    const jobs = new Map<any, string>();
    // Per tick: each blocker's target and engagement.
    const log: { t: number; tgt: Map<any, any>; eng: Map<any, any>; pos: Map<any, any> }[] = [];
    let catchT: number | null = null, carrier: any = null, first: any = null, firstT = 0, throwT: number | null = null;
    const snapAt: Map<any, any> = new Map();
    while (sim.phase === 'live' && sim.t < 12) {
      sim.tick();
      const tgt = new Map(), eng = new Map(), pos = new Map();
      for (const a of sim.offense) if (a.behavior?.kind === 'screen-block' && !jobs.has(a)) { blockers.push(a); jobs.set(a, `${a.slot}/${a.behavior.job}`); }
      for (const b of blockers) {
        tgt.set(b, b.behavior?.kind === 'screen-block' ? b.behavior.target ?? null : null);
        eng.set(b, b.engagement?.defender ?? null);
      }
      for (const a of sim.agents) pos.set(a, { ...a.pos });
      log.push({ t: sim.t, tgt, eng, pos });
      if (throwT === null && sim.events.some((e: any) => e.type === 'throw')) {
        throwT = sim.t;
        for (const a of sim.agents) snapAt.set(a, { ...a.pos });
      }
      if (catchT === null) {
        const c = sim.events.find((e: any) => e.type === 'catch');
        if (c) { catchT = c.t; carrier = sim.agents[c.a]; }
      } else if (!first && carrier && sim.carrier === carrier) {
        for (const d of sim.defense) if (Math.hypot(d.pos.x - carrier.pos.x, d.pos.y - carrier.pos.y) <= 1.5) { first = d; firstT = sim.t; break; }
      }
      if (first) break;
    }
    // Target switches per screen blocker between the throw and the end (a decision beat that changes his man).
    if (throwT !== null) {
      let sw = 0, n = 0;
      for (const b of blockers) {
        let prev: any = undefined;
        n++;
        for (const r of log) { if (r.t < throwT) continue; const t = r.tgt.get(b); if (t && prev && t !== prev) sw++; if (t) prev = t; }
      }
      const tl0 = tally[concept.id] ??= {};
      tl0.switches = (tl0.switches ?? 0) + sw; tl0.blockerPlays = (tl0.blockerPlays ?? 0) + n;
    }
    if (catchT === null || !first) continue;
    // Was he engaged by a screen blocker before arriving? Targeted?
    const engagedBy = new Set<any>(), targetedBy = new Set<any>();
    for (const r of log) {
      if (r.t > firstT) break;
      for (const b of blockers) {
        if (r.eng.get(b) === first) engagedBy.add(b);
        if (r.t > firstT - 1.5 && r.tgt.get(b) === first) targetedBy.add(b);
      }
    }
    const rush = /^(DE|DT|NT|EDGE)/.test(first.slot) || ['DE', 'DT', 'NT'].some(s => first.slot.startsWith(s));
    let cls = engagedBy.size ? 'shed' : targetedBy.size ? 'chosen, not reached' : rush ? 'unchosen rusher' : 'unchosen';
    const tl = tally[concept.id] ??= {};
    tl[cls] = (tl[cls] ?? 0) + 1;
    tl.n = (tl.n ?? 0) + 1;
    if (cls === 'chosen, not reached' && process.argv.includes('--chosen')) {
      // For each blocker who chose him: since when, and the geometry at catch and arrival.
      for (const b of targetedBy) {
        const since = log.find(r => r.tgt.get(b) === first)?.t ?? NaN;
        const at = (t: number) => log.reduce((p, r) => Math.abs(r.t - t) < Math.abs(p.t - t) ? r : p);
        const g = (r: any) => {
          const bp = r.pos.get(b), dp = r.pos.get(first), cp = r.pos.get(carrier);
          const bd = Math.hypot(bp.x - dp.x, bp.y - dp.y), dc = Math.hypot(dp.x - cp.x, dp.y - cp.y), bc = Math.hypot(bp.x - cp.x, bp.y - cp.y);
          // Leverage: is the blocker on the defender's side of the carrier (closer to the carrier along the defender's line)?
          const ux = (cp.x - dp.x) / (dc || 1), uy = (cp.y - dp.y) / (dc || 1);
          const along = (bp.x - dp.x) * ux + (bp.y - dp.y) * uy, off = Math.abs(-(bp.x - dp.x) * uy + (bp.y - dp.y) * ux);
          return `b-d ${f1(bd)} d-c ${f1(dc)} b-c ${f1(bc)} along ${f1(along)} off ${f1(off)}`;
        };
        const still = log.filter(r => r.t > since && r.t <= firstT).every(r => r.tgt.get(b) === first);
        console.log(`${concept.id.padEnd(17)} ${def.label.padEnd(9)} s${seed} ${first.slot.padEnd(5)} by ${jobs.get(b)} since ${f1(since - catchT)}s ${still ? 'held' : 'switched'} | catch: ${g(at(catchT))} | arrive +${f1(firstT - catchT)}: ${g(at(firstT))}`);
      }
    }
    if (VERBOSE || cls.startsWith('unchosen')) {
      // What were the blockers doing when he arrived?
      const r = log[log.length - 1];
      const at = snapAt.get(first);
      const doing = blockers.map((b: any) => {
        const e = r.eng.get(b), t = r.tgt.get(b);
        const who = e ?? t;
        const dist = who ? f1(Math.hypot(who.pos.x - carrier.pos.x, who.pos.y - carrier.pos.y)) : '-';
        return `${jobs.get(b)} ${e ? 'ENG' : t ? 'tgt' : 'none'} ${who?.slot ?? ''}@${dist}`;
      }).join(' | ');
      console.log(`${concept.id.padEnd(17)} ${def.label.padEnd(9)} s${seed} ${cls.padEnd(20)} first ${first.slot.padEnd(5)} +${f1(firstT - catchT)}s (at throw x${at ? f1(at.x - sim.los) : '?'} y${at ? f1(at.y - carrier.pos.y) : '?'} rel carrier) | ${doing}`);
    }
  }
}
console.log('\nfirst defender to the carrier, by cause:');
for (const [k, v] of Object.entries(tally)) console.log(`${k.padEnd(18)} ${JSON.stringify(v)}`);
