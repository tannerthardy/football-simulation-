// Same operators as nfl_start.py on the saved panel (non-PA dropbacks, dice-shifted).
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const G: Record<string, number[]> = {}, S: Record<string, number[]> = {}, A: Record<string, number[]> = {};
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; const sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const dice = sim.dice.bind(sim), made = new Set<string>();
    (sim as any).dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) return;
    const P = (a: any) => a.player.position as string; const cy = sim.ballY; const outside = new Set<number>();
    for (const side of [1, -1]) { const W = sim.offense.filter(o => P(o) === 'WR' && (o.pos.y - cy) * side > 0).sort((a, b) => Math.abs(b.pos.y - cy) - Math.abs(a.pos.y - cy));
      W.forEach((o, r) => (A[`WR #${r + 1} from sideline`] ??= []).push(sim.los - o.pos.x)); if (W[0] && ['go', 'fade', 'post', 'corner'].includes((W[0].behavior as any).route?.id)) outside.add(W[0].idx); }
    for (const o of sim.offense) if (P(o) === 'TE') (A.TE ??= []).push(sim.los - o.pos.x);
    const groups = new Map<number, string[]>();
    for (const o of sim.offense) { const g: string[] = []; if (o.behavior instanceof RouteRunner) { if (P(o) === 'WR') g.push('WR route'); else if (P(o) === 'TE') g.push('TE route'); else if (['RB', 'FB'].includes(P(o))) g.push('RB route'); } if (outside.has(o.idx)) g.push('outside vertical'); if (g.length) groups.set(o.idx, g); }
    for (const d of sim.defense) { const g: string[] = []; if (['rush', 'blitz'].includes((d.behavior as any).kind) && ['DE', 'DT', 'NT', 'OLB', 'EDGE', 'DL'].includes(P(d))) g.push('pass rusher'); if (P(d) === 'CB') g.push('CB'); if (g.length) groups.set(d.idx, g); }
    const x0 = new Map(sim.agents.map(a => [a.idx, { ...a.pos }])); const vt = new Map<number, any[]>(); const tick = sim.tick.bind(sim); const G0: any[] = [];
    (sim as any).tick = () => { tick(); if (sim.throwAt >= 0) return;
      for (const t of [0.5, 1.0]) if (Math.abs(sim.t - t) < 1e-6) for (const [i, gs] of groups) { const a = sim.agents[i], o = x0.get(i)!; for (const g of gs) G0.push([g, t, Math.hypot(a.pos.x - o.x, a.pos.y - o.y)]); }
      if (sim.t >= 1.0 - 1e-9 && sim.t <= 2.0 + 1e-9 && Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6) for (const i of outside) (vt.get(i) ?? vt.set(i, []).get(i)!).push({ ...sim.agents[i].pos, s: Math.hypot(sim.agents[i].vel.x, sim.agents[i].vel.y) }); };
    sim.run(); if (sim.throwAt < 0) return;
    for (const [g, t, v] of G0) (G[`${g}|${t}`] ??= []).push(v);
    if (sim.throwAt >= 2.0) for (const [i, tr] of vt) if (tr.length >= 11) { const a = sim.agents[i]; (S.st ??= []).push(tr.reduce((s: number, x: any) => s + x.s, 0) / tr.length / a.profile.vmax);
      let path = 0; for (let j = 1; j < tr.length; j++) path += Math.hypot(tr[j].x - tr[j - 1].x, tr[j].y - tr[j - 1].y); (S.str ??= []).push(Math.hypot(tr[tr.length - 1].x - tr[0].x, tr[tr.length - 1].y - tr[0].y) / path); (S.top ??= []).push(a.profile.vmax); } }); }
const q = (v: number[] = [], x: number) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(x * (v.length - 1))].toFixed(2) : '-';
for (const g of ['WR route', 'outside vertical', 'TE route', 'RB route', 'pass rusher', 'CB']) console.log(`sim ${g.padEnd(16)} ground from snap p50 at 0.5 s ${q(G[g + '|0.5'], .5)} (n ${G[g + '|0.5']?.length ?? 0}) | 1.0 s ${q(G[g + '|1'], .5)}`);
console.log(`sim outside vertical 1.0-2.0 s: speed / own top p25/50/75 ${q(S.st, .25)}/${q(S.st, .5)}/${q(S.st, .75)} | straightness p50 ${Number(q(S.str, .5)).toFixed(3)} | top speed p50 ${q(S.top, .5)} yd/s (n ${S.top?.length ?? 0})`);
for (const a of Object.keys(A).sort()) console.log(`sim align ${a.padEnd(20)} depth behind ball line p25/50/75 ${q(A[a], .25)}/${q(A[a], .5)}/${q(A[a], .75)} (n ${A[a].length})`);
