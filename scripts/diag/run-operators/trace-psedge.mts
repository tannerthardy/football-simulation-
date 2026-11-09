// Zone runs: play-side edge on the line (outside the OL, no TE/wing within 1 yd), nearest OL = his blocker.
// Per 0.1 s bin 0.2-1.5: blocker forward request by stage vs achieved forward, plan kind, engaged, edge depth/forward vel.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const R: Record<string, number[]> = {}; const push = (k: string, v: number) => (R[k] ??= []).push(v);
const C: Record<string, number> = {}; const cnt = (k: string) => C[k] = (C[k] ?? 0) + 1;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
  const sch = st.offCall?.run?.scheme; const con = ['outsideZone', 'wideZone'].includes(sch) ? 'OZ' : sch === 'insideZone' ? 'IZ' : null; if (!con) continue;
  const sim: any = new PlaySim(st); sim.tick(); if (!sim.offCall.run) continue; const ps = playSideSign(sim, sim.offCall.run); const dir = sim.attackDir('O');
  const ol = sim.offense.filter((q: any) => /^(LT|LG|C|RG|RT)$/.test(q.slot)); if (ol.length !== 5) continue;
  const ys = ol.map((q: any) => q.pos.y).sort((a: number, b: number) => a - b); const cy = ys.reduce((a: number, b: number) => a + b) / 5;
  const oth = sim.offense.filter((q: any) => !ol.includes(q));
  const edges = sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir > 0 && (d.pos.x - sim.los) * dir <= 1.6
    && (d.pos.y - cy) * ps > 0 && (d.pos.y < ys[0] - .5 || d.pos.y > ys[4] + .5) && Math.abs(d.pos.y - cy) <= 6
    && !oth.some((t: any) => Math.abs(t.pos.y - d.pos.y) <= 1 && (t.pos.x - sim.los) * dir > -2));
  if (!edges.length) continue; const e = edges[0];
  const bl = ol.reduce((a: any, b: any) => Math.abs(b.pos.y - e.pos.y) < Math.abs(a.pos.y - e.pos.y) ? b : a);
  let snap: Record<string, any[]> = {}; const order: string[] = [];
  sim.responsibility = new Proxy({}, { get: (_t, k) => k === 'stageAll' ? (s: string, iv: any[]) => { if (!order.includes(s)) order.push(s); snap[s] = iv.map((x) => x?.vel ? { ...x.vel } : null); }
    : k === 'decision' ? (a: any, _o: any, c: any) => { (snap.decision ??= [])[a.idx] = { ...c.vel }; } : k === 'blockingState' ? () => undefined : () => {} });
  const t0 = sim.t; cnt(con + ' n');
  while (sim.phase === 'live' && sim.t - t0 < 1.55) { snap = {}; sim.tick(); const t = sim.t - t0; if (t < .15) continue;
    const bin = (Math.round(t * 10) / 10).toFixed(1); if (!['0.3', '0.5', '0.8', '1.0', '1.3', '1.5'].includes(bin)) continue;
    const key = `${con} ${bin}`; const eng = sim.engagements.some((g: any) => g.blocker === bl && g.defender === e);
    push(key + ' blX', (bl.pos.x - sim.los) * dir); push(key + ' edgeX', (e.pos.x - sim.los) * dir);
    push(key + ' ach', bl.vel.x * dir); push(key + ' edgeV', e.vel.x * dir); push(key + ' eng', eng ? 1 : 0);
    push(key + ' achW', bl.vel.y * ps);
    for (const s of ['decision', ...order]) { const q = snap[s]?.[bl.idx]; if (q) { push(`${key} req:${s}`, q.x * dir); push(`${key} reqW:${s}`, q.y * ps); } }
    push(key + ' face', Math.abs(Math.atan2(Math.sin(bl.facing), Math.cos(bl.facing))) * 57.3); push(key + ' spd', Math.hypot(bl.vel.x, bl.vel.y));
    if (bin === '0.5') cnt(`${con} plan ${bl.behavior.plan?.kind ?? bl.behavior.kind ?? '?'} tgt=${bl.behavior.plan?.target === e || bl.behavior.target === e}`); } }
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
for (const k of Object.keys(R).sort()) console.log(k.padEnd(34), mean(R[k]).toFixed(2), 'n', R[k].length);
console.log(C);
