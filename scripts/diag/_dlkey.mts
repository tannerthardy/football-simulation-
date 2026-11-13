/** OZ/IZ DL pre-contact reaction chain: get-off time (snapReadyAt), first tick whose request goes >0.5 yd/s toward the
 * play side, first tick the keyed man's seen lateral exceeds 0.3 toward it, and the true OL first lateral > 0.3.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone|inside zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s));
  const near = new Map(DL.map((d: any) => [d, OL.reduce((b: any, o: any) => Math.abs(o.pos.y - d.pos.y) < Math.abs(b.pos.y - d.pos.y) ? o : b)]));
  const log = new Map<any, any[]>(DL.map((d: any) => [d, [] as any[]])); let ho = -1, hy = 0, side = 0; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    if (sim.t > 0.8) return;
    for (const d of DL) { const o: any = near.get(d); const seen = sim.see(d, o, 0.5);
      log.get(d)!.push({ t: sim.t, oCmd: sim.intents[o.idx]?.vel.y ?? 0, req: sim.intents[d.idx]?.vel.y ?? 0, v: d.vel.y, oTrue: o.vel.y, oSeen: seen.vel.y, ready: d.snapReadyAt, beh: d.behavior?.kind, eng: !!d.engagement }); } };
  sim.run(); if (!side) continue;
  for (const [d, L] of log) { const first = (f: (x: any) => boolean) => L.find(f)?.t ?? NaN;
    R.push({ fam: /inside/i.test(p.call) ? 'IZ' : 'OZ', ready: L[0]?.ready, req: first(x => x.req * side > .5), oTrue: first(x => x.oTrue * side > .3), oSeen: first(x => x.oSeen * side > .3), contact: first(x => x.eng), oCmd: first(x => x.oCmd * side > .5), v: first(x => x.v * side > .3) }); }
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
for (const fam of ['OZ', 'IZ']) { const S = R.filter(r => r.fam === fam);
  console.log(`${fam} DL n ${S.length} | p50: get-off ${q(S.map(r => r.ready))} | key OL cmd>0.5 ${q(S.map(r => r.oCmd))} lateral >0.3 true ${q(S.map(r => r.oTrue))} seen ${q(S.map(r => r.oSeen))} | DL request >0.5 to play side ${q(S.map(r => r.req))} | DL moving >0.3 ${q(S.map(r => r.v))} | engaged ${q(S.map(r => r.contact))} | never requested by 0.8 ${(100 * S.filter(r => !Number.isFinite(r.req)).length / S.length).toFixed(0)}%`); }
