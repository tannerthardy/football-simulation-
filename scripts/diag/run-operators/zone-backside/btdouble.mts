// BT_CLIMB cases: backside tackle installed to climb to a backer. Per 0.3 s to 1.8 s: distance to that backer, tackle and backer
// play-side / upfield position change since the snap, tackle speed, his plan kind and target still that backer?
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const R: Record<string, number[]> = {}; const C: Record<string, number> = {}; const push = (k: string, v: number) => (R[k] ??= []).push(v); const inc = (k: string) => C[k] = (C[k] ?? 0) + 1;
const TS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!(process.env.CON ? process.env.CON.split(',') : ['insideZone', 'outsideZone', 'wideZone']).includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir('O'); sim.tick(); if (!sim.offCall.run) continue; const ps = playSideSign(sim, sim.offCall.run);
  const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)).sort((a: any, b: any) => (a.pos.y - b.pos.y) * ps);
  const bt = ol[0], pl = bt.behavior?.plan; if (!pl?.combination || pl.kind === "combo" || !pl.target) continue; const lb = pl.target; const bg = ol[1];
  const b0 = { ...bt.pos }, l0 = { ...lb.pos }; let i = 0; inc('n');
  while (sim.phase === 'live' && i < TS.length) { sim.tick(); if (sim.t >= TS[i] - 1e-9) { const t = TS[i++];
    push(`d ${t}`, Math.hypot(bt.pos.x - lb.pos.x, bt.pos.y - lb.pos.y)); push(`bx ${t}`, (bt.pos.x - b0.x) * dir); push(`by ${t}`, (bt.pos.y - b0.y) * ps);
    push(`lx ${t}`, (lb.pos.x - l0.x) * dir); push(`ly ${t}`, (lb.pos.y - l0.y) * ps); push(`v ${t}`, Math.hypot(bt.vel.x, bt.vel.y)); const cm = sim.cmds[bt.idx]?.vel ?? { x: 0, y: 0 }; push(`rq ${t}`, Math.hypot(cm.x, cm.y)); const fc = sim.cmds[bt.idx]?.facing; if (fc !== undefined) push(`fv ${t}`, Math.abs(((fc - Math.atan2(bt.vel.y, bt.vel.x)) * 180 / Math.PI + 540) % 360 - 180)); push(`bf ${t}`, Math.abs(((bt.body.facing - Math.atan2(bt.vel.y, bt.vel.x)) * 180 / Math.PI + 540) % 360 - 180)); push(`rqa ${t}`, (cm.y * ps)); push(`aca ${t}`, bt.vel.y * ps); push(`dh ${t}`, Math.abs(((Math.atan2(cm.y, cm.x) - Math.atan2(bt.vel.y, bt.vel.x)) * 180 / Math.PI + 540) % 360 - 180)); push(`vm ${t}`, bt.profile.vmax); push(`g ${t}`, Math.hypot(bg.pos.x - lb.pos.x, bg.pos.y - lb.pos.y));
    const q = bt.behavior?.plan; inc(`${t} ${q?.kind}${q?.target === lb ? '' : '->other'}${bt.engagement ? '+engaged' : ''}`); } } }
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[s.length >> 1]; };
console.log("n", C.n); for (const t of TS) console.log(`${t}s dist ${med(R[`d ${t}`]).toFixed(2)} | BT up ${med(R[`bx ${t}`]).toFixed(2)} across ${med(R[`by ${t}`]).toFixed(2)} speed ${med(R[`v ${t}`]).toFixed(2)} req ${med(R[`rq ${t}`]).toFixed(2)} (across ${med(R[`rqa ${t}`]).toFixed(2)} vs achieved ${med(R[`aca ${t}`]).toFixed(2)}) heading diff ${med(R[`dh ${t}`]).toFixed(0)} facing-req vs travel ${R[`fv ${t}`] ? med(R[`fv ${t}`]).toFixed(0) : "-"} body facing vs travel ${med(R[`bf ${t}`]).toFixed(0)} vmax ${med(R[`vm ${t}`]).toFixed(2)} | DL-BG dist ${med(R[`g ${t}`]).toFixed(2)} DL up ${med(R[`lx ${t}`]).toFixed(2)} across ${med(R[`ly ${t}`]).toFixed(2)} | ` + Object.keys(C).filter((k) => k.startsWith(`${t} `)).map((k) => `${k.slice(String(t).length + 1)} ${C[k]}`).join(', '));
