// How tackled carriers go down: time from first contact to the carrier's fall,
// its cause, direction in his travel frame, and how many holders at the fall.
// usage: fallcause.ts TRACE_LABEL [N]
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { makeSim, rosters } from '../zone-lab/lab.js';
const [label, N = '300'] = process.argv.slice(2);
const rows = gunzipSync(readFileSync(`out/open-field/all/${label}.jsonl.gz`)).toString().split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !r.error);
const R = rosters();
const out: any[] = [];
for (const r of rows.slice(0, Number(N))) {
  const [concept, dir, formation, look, roster, seed] = r.id.split("/"); const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as any, R);
  let contact = -1, cv0 = { x: 0, y: 0 }, fall: any = null;
  while (sim.phase === 'live' && sim.t < 20) {
    sim.tick();
    const c = sim.carrier; if (!c) continue;
    if (contact < 0 && sim.events.some(e => e.type === 'carrier_contact')) { contact = sim.t; cv0 = { ...c.vel }; }
    const s: any = c.body.support;
    if (contact >= 0 && !fall && s?.state === 'falling') {
      const v = Math.hypot(cv0.x, cv0.y) || 1, ux = cv0.x / v, uy = cv0.y / v;
      fall = { dt: +(sim.t - contact).toFixed(2), cause: s.cause, along: +(s.fall.x * ux + s.fall.y * uy).toFixed(2),
        cs0: +v.toFixed(2), cs: +Math.hypot(c.vel.x, c.vel.y).toFixed(2), n: sim.bond?.tacklers.length ?? 0 };
    }
  }
  out.push({ id: r.id, gain: +sim.buildResult().offenseYards.toFixed(1), contact, end: +sim.t.toFixed(2), fall });
}
const q = (v: number[], f = .5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const withC = out.filter(o => o.contact >= 0);
const falls = withC.filter(o => o.fall);
console.log(`${label}: plays ${out.length} contact ${withC.length} carrier fell ${falls.length}`);
console.log(`contact->whistle p10/50/90 ${q(withC.map(o => o.end - o.contact), .1).toFixed(2)} ${q(withC.map(o => o.end - o.contact)).toFixed(2)} ${q(withC.map(o => o.end - o.contact), .9).toFixed(2)}`);
console.log(`contact->fall p10/50/90 ${q(falls.map(o => o.fall.dt), .1)} ${q(falls.map(o => o.fall.dt))} ${q(falls.map(o => o.fall.dt), .9)}`);
const by = (k: (o: any) => string) => { const m = new Map<string, number>(); for (const o of falls) m.set(k(o), (m.get(k(o)) ?? 0) + 1); return [...m].map(([a, b]) => `${a} ${b}`).join(', '); };
console.log('cause:', by(o => o.fall.cause));
console.log('direction:', by(o => o.fall.along > .5 ? 'forward' : o.fall.along < -.5 ? 'backward' : 'side'));
console.log('holders at fall:', by(o => String(o.fall.n)));
console.log('fall <0.3s by cause/dir:', by(o => o.fall.dt < .3 ? `${o.fall.cause}-${o.fall.along > .5 ? 'fwd' : o.fall.along < -.5 ? 'back' : 'side'}` : 'later'));
