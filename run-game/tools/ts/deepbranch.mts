import { Rng } from '/home/user/fs-develop/src/core/rng.js';
import { simulateGame } from '/home/user/fs-develop/src/game/game.js';
import { generateTeam } from '/home/user/fs-develop/src/league/team.js';
const rows: any[] = [];
const hooks = { playResult: (sim: any) => {
  let done = false; const hist: any[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    hist.push(sim.defense.map((d: any) => ({ ask: sim.intents[d.idx]?.vel?.x, vx: d.vel.x, b: d.behavior })));
    if (hist.length > 10) hist.shift();
    if (done || sim.ball.kind !== 'air') return; done = true;
    const r = sim.ball.target; if (!r) return;
    const dir = sim.attackDir('O');
    if ((r.pos.x - sim.los) * dir >= 6) return;
    for (const [i, d] of sim.defense.entries()) {
      if (!/^(CB|FS|SS|NB|DB)/.test(d.slot) || (d.pos.x - sim.los) * dir < 8) continue;
      if (Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y) > 9) continue;
      const b = d.behavior as any, h = hist[Math.max(0, hist.length - 4)][i];
      const inner = b?.sub ?? b?.current ?? b?.active;
      const desc = `${b?.kind}${b?.zone ? ':' + b.zone : ''}${b?.opts ? ' opts ' + Object.entries(b.opts).filter(([, v]) => v === true || typeof v === 'string').map(([k, v]) => v === true ? k : `${k}=${v}`).join(',') : ''}${b?.hipsOpen !== undefined ? ' hips ' + b.hipsOpen : ''}${b?.press ? ' press' : ''}`;
      rows.push({ desc, vx: d.vel.x * dir, ask: (h.ask ?? NaN) * dir, rvx: r.vel.x * dir, gap: (d.pos.x - r.pos.x) * dir });
    }
  };
  return sim.run(); } };
for (const seed of [101, 102, 103]) { const rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never); }
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
const by = new Map<string, any[]>(); for (const r of rows) { const k = r.desc.replace(/ hips (true|false)/, ''); by.set(k, [...(by.get(k) ?? []), r]); }
console.log(`deep DBs (8+ yd) within 9 yd of a target under 6 yd at the throw: ${rows.length}; downfield velocity ${med(rows.map(r => r.vx))}, asked 0.3 s before ${med(rows.map(r => r.ask))}`);
for (const [k, R] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 10)) console.log(`  ${String(R.length).padStart(3)}  ${k}: moving ${med(R.map(r => r.vx))}, asked ${med(R.map(r => r.ask))}, target ${med(R.map(r => r.rvx))}, cushion ${med(R.map(r => r.gap))}, hips open ${R.filter(r => / hips true/.test(r.desc)).length}`);
