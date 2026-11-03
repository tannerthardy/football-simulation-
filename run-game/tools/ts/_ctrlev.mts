import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { runReadObservers } = await import(`${W}/src/sim/run-read-observer.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; const gaps: number[] = [], offs: number[] = [];
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'counter') continue;
    const sim: any = new PlaySim(st); const ps = playSideSign(sim, sim.offCall.run), lat = (y: number) => (y - sim.ballY) * ps;
    let done = false;
    runReadObservers.set(sim, (e: any) => { if (done || e.phase !== 'aim' || !e.candidates?.length) return;
      const pref = lat(e.preferred); const chosen = e.candidates.reduce((b: any, q: any) => q.score < b.score ? q : b);
      if (lat(chosen.entry.y) >= pref - 1) return; done = true;
      const near = e.candidates.reduce((b: any, q: any) => Math.abs(lat(q.entry.y) - pref) < Math.abs(lat(b.entry.y) - pref) ? q : b);
      const who: string = near.parts?.who ?? ''; if (!who.includes('*')) { inc('closer not engaged'); return; }
      const d = sim.defense.find((x: any) => x.slot === who.split('*')[0]); const a = sim.agents[e.actor];
      const s = sim.see(a, d); const P = near.entry;
      if (Math.hypot(s.pos.x - P.x, s.pos.y - P.y) <= d.profile.radius + a.profile.radius) { inc('closer standing IN the entry'); return; }
      const bl = d.engagement.blocker, bs = sim.see(a, bl);
      const gap = Math.hypot(bs.pos.x - s.pos.x, bs.pos.y - s.pos.y) - bl.profile.radius - d.profile.radius; gaps.push(gap);
      if (gap > .15) { inc('seen blocker beyond contact range (+.15)'); return; }
      const off = (s.pos.y - bs.pos.y) * ps, side = Math.sign((P.y - bs.pos.y) * ps); offs.push(off * side);
      if (Math.abs(off) < .25) inc('squared up (|off|<.25)'); else if (Math.sign(off) === side) inc('defender on the entry side of his blocker'); else inc('far side (should be blocked)');
    });
    try { sim.run(); } catch {}
  }
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(2) : 'nan'; };
console.log(C); console.log('contact gap p25/med/p75', q(gaps, .25), q(gaps, .5), q(gaps, .75), '| off toward entry side p25/med/p75', q(offs, .25), q(offs, .5), q(offs, .75));
