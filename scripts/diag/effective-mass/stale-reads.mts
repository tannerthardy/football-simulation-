// Who reads a picture that is older than a second (Integration, 2026-11-16: the unbounded ageing of an unseen man's picture). Wraps PlaySim.see and PlaySim.track (no
// source change): for every read, the age of the picture it returned, the observer's role, the call site (first caller outside playsim.ts), and for the old ones how far
// the pictured position is from where the man really is. usage: [SIGHT_PURE=1] node --import tsx scripts/diag/effective-mass/stale-reads.mts FILE [max]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const [file, max] = [process.argv[2]!, Number(process.argv[3] ?? 60)];
const site = (): string => {
  const old = Error.prepareStackTrace, lim = Error.stackTraceLimit; Error.stackTraceLimit = 12; Error.prepareStackTrace = (_e, cs) => cs;
  const o: { stack?: unknown } = {}; Error.captureStackTrace(o, site);
  const cs = o.stack as { getFunctionName(): string | null; getTypeName(): string | null; getFileName(): string | null }[]; Error.prepareStackTrace = old; Error.stackTraceLimit = lim;
  for (const c of cs) {
    const file = (c.getFileName() ?? '?').replace(/.*[\\/]/, ''), fn = c.getFunctionName() ?? '<anonymous>', ty = c.getTypeName();
    if (file === 'stale-reads.mts' || (file.startsWith('playsim') && /(^|\.)(see|track|sighted)$/.test(fn))) continue;
    return `${file}:${ty && ty !== 'Object' && !fn.includes('.') ? ty + '.' : ''}${fn}`;
  }
  return '?';
};
const total = { reads: 0, old: 0, gt3: 0 }; const bySite = new Map<string, { reads: number; old: number; err: number[]; age: number[]; roles: Set<string> }>();
const proto: any = PlaySim.prototype;
for (const name of ['see', 'track'] as const) {
  const orig = proto[name];
  proto[name] = function (this: any, observer: any, target: any, ...rest: any[]) {
    const r = orig.call(this, observer, target, ...rest);
    total.reads++;
    const age = r?.age ?? 0;
    const role = observer === this.carrier ? 'carrier' : observer.team === 'D' ? 'defender' : 'offence';
    const key = `${role} ${site()}`; let s = bySite.get(key); if (!s) bySite.set(key, s = { reads: 0, old: 0, err: [], age: [], roles: new Set() });
    s.reads++;
    if (age > 1.0) { total.old++; if (age > 3) total.gt3++; s.old++; s.age.push(age); s.err.push(Math.hypot(r.pos.x - target.pos.x, r.pos.y - target.pos.y)); }
    return r;
  };
}
for (const [i, p] of (JSON.parse(readFileSync(file, 'utf8')) as any[]).entries()) { if (i >= max) break; try { new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))).run(); } catch {} }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
console.log(`${file}: ${max} plays; ${total.reads} reads; ${total.old} older than 1 s (${(100 * total.old / total.reads).toFixed(3)}%), ${total.gt3} older than 3 s`);
for (const [k, s] of [...bySite].sort((a, b) => b[1].old - a[1].old).slice(0, 14)) if (s.old) console.log(`  ${k.padEnd(52)} reads ${String(s.reads).padStart(8)} old ${String(s.old).padStart(7)} (${(100 * s.old / s.reads).toFixed(2)}%) | age p50 ${q(s.age, .5).toFixed(1)} p90 ${q(s.age, .9).toFixed(1)} max ${Math.max(...s.age).toFixed(1)} s | off the true position p50 ${q(s.err, .5).toFixed(1)} p90 ${q(s.err, .9).toFixed(1)} yd`);
