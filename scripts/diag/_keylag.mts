/** Same operator as rgtools/keylag.py on restaged zone runs: 10 Hz true positions, central-difference lateral velocity,
 * first frame |vy| > 0.5 (frames 1..8); DL within 1.6 yd of the LOS and 4 yd of the OL centre; key = nearest OL at the
 * snap; play side = carrier's lateral travel over 1 s after the handoff. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const ON: Record<string, { f: number; s: number; ks: number; why: string }[]> = { OZ: [], IZ: [] }; const R: Record<string, any[]> = { OZ: [], IZ: [] }; const LAT: Record<string, Record<string, number[]>> = { OZ: {}, IZ: {} };
const push = (f: string, k: string, v: number) => (LAT[f][k] ??= []).push(v);
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone|inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const by = OL.reduce((s: number, o: any) => s + o.pos.y, 0) / 5;
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) <= (process.env.DLX ? +process.env.DLX : 1.6) && Math.abs(d.pos.y - by) <= 4);
  const key = new Map(DL.map((d: any) => [d, OL.reduce((b: any, o: any) => Math.abs(o.pos.y - d.pos.y) < Math.abs(b.pos.y - d.pos.y) ? o : b)]));
  const Y = new Map<any, number[]>([...DL, ...OL].map((a: any) => [a, [a.pos.y]])); const X = new Map<any, number[]>([...DL].map((a: any) => [a, [a.pos.x]])); let ho = -1, hy = 0, side = 0, k = 1; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (k <= 16 && sim.t >= 0.1 * k - 1e-6) { for (const [a, L] of Y) L.push(a.pos.y); for (const [a, L] of X) L.push(a.pos.x); k++; } };
  sim.run(); if (!side) continue;
  const first = (L: number[]) => { for (let f = 1; f <= 8; f++) { const v = (L[f + 1] - L[f - 1]) / .2; if (Math.abs(v) > .5) return [f, Math.sign(v)]; } return [0, 0]; };
  const fam = /inside/i.test(p.call) ? 'IZ' : 'OZ', lat = (L: number[], f: number) => (L[f + 1] - L[f - 1]) / .2 * side;
  for (const f of [1, 2, 3]) push(fam, `ol${f}`, OL.reduce((s: number, o: any) => s + lat(Y.get(o)!, f), 0) / 5);
  for (const d of DL) for (const f of [2, 3, 4, 6]) push(fam, `dl${f}`, lat(Y.get(d)!, f));
  for (const d of DL) { const L = Y.get(d)!; let f1 = 0, s1 = 0; for (let f = 1; f + 1 < L.length; f++) { const v = lat(L, f); if (Math.abs(v) >= 1) { f1 = f; s1 = Math.sign(v); break; } }
    const tags = [...(d.tags ?? [])].filter((t: string) => /step|squeeze|shoot|widen|zone-run|slant|angle|pinch|stunt|twist/.test(t)).sort().join('+') || 'none';
    ON[fam].push({ f: f1, s: s1, ks: first(Y.get(key.get(d))!)[1] * side, why: `${d.behavior?.kind}/${d.runFit?.kind ?? '-'}/${tags}` }); }
  for (const d of DL) { const [fd, sd] = first(Y.get(d)!), [fk, sk] = first(Y.get(key.get(d))!);
    R[/inside/i.test(p.call) ? 'IZ' : 'OZ'].push({ fd, sd: sd * side, fk, sk: sk * side, tell: d.tags?.has?.('tell-step'), lat: [1, 2, 3, 4].map(f => lat(Y.get(d)!, f)), sp: [1, 2, 3].map(f => Math.hypot(X.get(d)![f + 1] - X.get(d)![f - 1], Y.get(d)![f + 1] - Y.get(d)![f - 1]) / .2), ready: d.snapReadyAt }); }
}
for (const [fam, L] of Object.entries(R)) { const B = L.filter(r => r.fd && r.fk), n = B.length; if (!n) continue;
  const lag = B.map(r => r.fd - r.fk).sort((a, b) => a - b), pc = (f: (r: any) => boolean) => (100 * B.filter(f).length / n).toFixed(0);
  const med = (v: number[]) => v.sort((a, b) => a - b)[Math.floor(v.length / 2)] / 10;
  console.log(`${fam} tell ${(100 * L.filter(r => r.tell).length / L.length).toFixed(0)}% DL n ${L.length} both move ${n} | DL first-move p50 ${med(L.filter(r => r.fd).map(r => r.fd))}s key ${med(L.filter(r => r.fk).map(r => r.fk))}s | lag p25/50/75 ${lag[n >> 2]}/${lag[n >> 1]}/${lag[(3 * n) >> 2]} fr | before ${pc(r => r.fd < r.fk)}% same ${pc(r => r.fd === r.fk)}% after ${pc(r => r.fd > r.fk)}% | with key ${pc(r => r.sd === r.sk)}% | DL play side ${pc(r => r.sd === 1)}% key ${pc(r => r.sk === 1)}% | first&with ${pc(r => r.fd <= r.fk && r.sd === r.sk)}% first&against ${pc(r => r.fd <= r.fk && r.sd !== r.sk)}%`); }
for (const [fam, M] of Object.entries(LAT)) { const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
  console.log(`${fam} DL lateral to play side 0.2/0.3/0.4/0.6 s: ${[2, 3, 4, 6].map(f => md(M[`dl${f}`])).join(' / ')} | OL mean 0.1/0.2/0.3: ${[1, 2, 3].map(f => md(M[`ol${f}`])).join(' / ')}`); }
for (const [fam, L] of Object.entries(R)) { const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
  for (const [nm, G] of [['tell steppers', L.filter(r => r.tell)], ['early movers', L.filter(r => r.fd && r.fk && r.fd <= r.fk && r.sd === r.sk)]] as const)
    if (G.length) console.log(`${fam} ${nm} n ${G.length} get-off ${md(G.map(r => r.ready))}: lateral 0.1/0.2/0.3/0.4 ${[0, 1, 2, 3].map(i => md(G.map(r => r.lat[i]))).join(' / ')} | speed 0.1/0.2/0.3 ${[0, 1, 2].map(i => md(G.map(r => r.sp[i]))).join(' / ')}`); }
// Run Game's front operator: onset = first frame |vy| >= 1 yd/s (0.2 s central difference) within 1.5 s, signed to the play side.
for (const fam of ['OZ', 'IZ']) { const O = ON[fam]; if (!O.length) continue; const tw = O.filter(o => o.s === 1).map(o => o.f).sort((a, b) => a - b);
  console.log(`${fam} onset>=1 n ${O.length}: toward ${(100 * tw.length / O.length).toFixed(0)}% (p50 ${(tw[tw.length >> 1] / 10).toFixed(1)} s) away ${(100 * O.filter(o => o.s === -1).length / O.length).toFixed(0)}% never ${(100 * O.filter(o => !o.s).length / O.length).toFixed(0)}% | away by role: ${Object.entries(O.filter(o => o.s === -1).reduce((m: any, o) => (m[o.why] = (m[o.why] ?? 0) + 1, m), {})).map(([k, v]) => `${k} ${v}`).join(', ')}`); }
for (const fam of ['OZ', 'IZ']) for (const ks of [1, -1, 0]) { const G = ON[fam].filter(o => o.ks === ks); if (!G.length) continue;
  console.log(`${fam} key first ${ks === 1 ? 'toward' : ks === -1 ? 'away' : 'none'} ${(100 * G.length / ON[fam].length).toFixed(0)}% n ${G.length}: DL onset toward ${(100 * G.filter(o => o.s === 1).length / G.length).toFixed(0)}% away ${(100 * G.filter(o => o.s === -1).length / G.length).toFixed(0)}% never ${(100 * G.filter(o => !o.s).length / G.length).toFixed(0)}%`); }
