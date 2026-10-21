/** Tackle credit by defender group on lab runs (observation only), the sim side
 * of depth/tacklers.py: the whistle's tackler and assists (assist wraps before
 * it), half credit each when shared; plus run-rep endings of linemen by reason
 * and, for linemen ever in a run rep, the share credited with a tackle.
 * Flags from the environment.
 * node --import tsx scripts/diag/depth/simtacklers.ts [--formations ace_12] [--concepts iz,oz,wz] [--seeds 77,1] */
import type { Agent } from '../../../src/sim/agent.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const fam = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : s.startsWith('LB') ? 'LB' : 'DB';
const credit: Record<string, number> = { DL: 0, LB: 0, DB: 0 };
const reasons: Record<string, number> = {};
let plays = 0, blockedDL = 0, blockedDLCredited = 0;
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation } as LabCase, Rs);
      const blocked = new Set<Agent>();
      runContactObservers.set(sim, (e: any, kind: string, info: any) => {
        if (kind === 'end' && /^(DE|DT|NT)/.test(e.defender.slot)) {
          const why = String(info?.reason ?? '').split(':')[0] || 'unspecified';
          reasons[why] = (reasons[why] ?? 0) + 1;
        }
      });
      while (sim.phase === 'live' && sim.t < 20) {
        sim.tick();
        for (const d of sim.defense) if (d.engagement?.type === 'run') blocked.add(d);
      }
      const tk = sim.events.filter(e => e.type === 'tackle');
      if (!tk.length) continue;
      const last = tk[tk.length - 1], w = new Map<number, number>([[last.a!, 1]]);
      for (const e of sim.events) if (e.type === 'tackle_wrap' && e.note === 'assist' && e.t <= last.t && !w.has(e.a!)) w.set(e.a!, .5);
      if (w.size > 1) w.set(last.a!, .5);
      const total = [...w.values()].reduce((a, b) => a + b, 0);
      plays++;
      for (const [i, x] of w) credit[fam(sim.agents[i].slot)] += x / total;
      for (const d of blocked) if (/^(DE|DT|NT)/.test(d.slot)) { blockedDL++; if (w.has(d.idx)) blockedDLCredited++; }
    }
console.log(`runs with a tackle ${plays} | tackle credit share: ` + Object.entries(credit).map(([g, x]) => `${g} ${(100 * x / plays).toFixed(0)}%`).join('  '));
console.log(`DL ever in a run rep ${(blockedDL / plays).toFixed(2)}/run, credited with a tackle or assist ${(100 * blockedDLCredited / Math.max(1, blockedDL)).toFixed(1)}%`);
console.log('DL run-rep endings: ' + Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
