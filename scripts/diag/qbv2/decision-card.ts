// QB_V2 decision-and-timing scorecard (QB lane, 2026-11-24; Integration's gate for carding). Independent of catch and
// coverage outcomes: per staged play, did the passer
//   (1) pick the taught side (quick outs: the softer corner's cushion, Rules' QUICK_OUTS pick),
//   (2) throw the taught answer to what the key actually did (Rules' keyRules on read 0; the key found the taught way:
//       the first underneath defender over or outside #2 on that side, outside-in, within 7 yd; none there: 'none'),
//   (3) release on time (release minus the thrown route's break inside the band),
//   (4) not stall (a throw by 3.0 s unless sacked)?
// Truth is read here as the observer only, to say what the key did; the passer's own reads are what is scored.
// The standard is our plan's (src/playbook/read-plans.ts), which encodes one coaching school where coaches differ
// (the outside audit's §4): slant-flat and stick as key reads on the flat defender, quick outs keyed on the flat defender.
//   QB_V2=1 QB_QUICK_DRIFT=3 node --import tsx scripts/diag/qbv2/decision-card.ts quick_outs cover1 1-30 gun_doubles_11
//   node --import tsx scripts/diag/qbv2/decision-card.ts quick_outs cover1 1-30 gun_doubles_11      (the old controller)
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { READ_PLANS } from '../../../src/playbook/read-plans.js';
import { nativeTraceSetup } from '../command-trace.js';

const [concept, coverage, seedArg = '1-30', formation = 'gun_doubles_11'] = process.argv.slice(2);
const [s0, s1] = seedArg.split('-').map(Number);
const TAUGHT: Record<string, { back?: string }> = { slant_flat: { back: 'check' }, quick_outs: { back: 'back_flat' } };
const MID = { playRecognition: 60, decisionMaking: 60, awareness: 60, composure: 60, discipline: 60, anticipation: 60, consistency: 60 };
const plan = READ_PLANS[concept];
const r2 = (x: number) => Math.round(x * 100) / 100;
const mirror = (ref: string) => (ref.startsWith('S') ? 'W' + ref.slice(1) : ref.startsWith('W') ? 'S' + ref.slice(1) : ref);
type S = [number, number, number, number, number];
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
function breakAt(P: S[], stop: boolean): number | null {
  if (P.length < 8) return null;
  const sp = P.map((s) => Math.hypot(s[3], s[4]));
  if (stop) { let kp = 3; for (let k = 3; k < P.length; k++) if (sp[k] > sp[kp]) kp = k; for (let k = kp + 1; k < P.length; k++) if (sp[k] < 0.5 * sp[kp]) return P[k][0]; return null; }
  let best = 0, kb = -1;
  for (let k = 3; k < P.length - 2; k++) { if (sp[k - 2] < 2 || sp[k + 2] < 2) continue; const d = Math.abs(wrap(Math.atan2(P[k + 2][4], P[k + 2][3]) - Math.atan2(P[k - 2][4], P[k - 2][3]))); if (d > best) { best = d; kb = k; } }
  return kb >= 0 && best > 25 * Math.PI / 180 ? P[kb][0] : null;
}

for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  const t = TAUGHT[concept]; if (t) setup.offCall.pass = { ...PASS_BY_ID[concept], ...t };
  const qbP = setup.offense.QB; for (const [k, v] of Object.entries(MID)) qbP.ratings[k] = v; qbP.experience = 4;
  const sim: any = new PlaySim(setup);
  let thrown: any = null, qbb: any = null, lastT = -1; const tr: Record<number, S[]> = {}; const snaps: Record<number, any[]> = {};
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, ...rest: any[]) => {
    if (q === sim.qb && !thrown) thrown = { t: sim.t, idx: target?.idx ?? null, slot: target?.slot ?? null, rid: target?.behavior?.route?.id ?? null, away: !target };
    return tb(q, target, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b = sim.qb.behavior; if (b?.kind === 'qb-pass' && typeof b.throwAway === 'function') qbb = b;
    if (sim.t - lastT >= 0.099) {
      lastT = sim.t;
      for (const a of sim.offense) (tr[a.idx] ??= []).push([sim.t, a.pos.x, a.pos.y, a.vel.x, a.vel.y]);
      for (const d of sim.defense) (snaps[d.idx] ??= []).push({ t: sim.t, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y });
    }
    if (sim.t > 4.5) sim.phase = 'dead';
  };
  try { sim.run(); } catch { /* the row is still scored */ }
  const ev = sim.events as any[], sack = ev.some((e) => e.type === 'sack');
  const flip = !!qbb?.v2?.presnap?.flip, keySide: 'S' | 'W' = flip ? 'W' : 'S';
  const num = sim.offAlign.numbering, sideSign = (sim.offAlign.strongSign >= 0 ? 1 : -1) * (keySide === 'S' ? 1 : -1);
  const tDec = thrown ? thrown.t - 0.35 : 1.4;
  const at = (idx: number, tt: number) => { const a = snaps[idx] ?? []; return a.reduce((b: any, s: any) => (Math.abs(s.t - tt) < Math.abs(b.t - tt) ? s : b), a[0]); };
  const posOf = (ref: string, tt: number) => { const slot = num[ref]; const a = slot ? sim.offense.find((o: any) => o.slot === slot) : null; const T = a ? tr[a.idx] ?? [] : []; const s = T.reduce((b: any, s: any) => (Math.abs(s[0] - tt) < Math.abs(b[0] - tt) ? s : b), T[0]); return s ? { x: s[1], y: s[2] } : null; };
  // The key, the taught way (Rules' read-plans §conventions): underneath (inside 7 yd, not bailing) over or outside #2.
  const r0 = plan?.reads?.[0];
  let cue: string | null = null, keySlot: string | null = null;
  if (r0 && r0.look.kind === 'key') {
    const two = posOf(keySide + '2', tDec);
    const out = (y: number) => (y - sim.ballY) * sideSign;
    const cands = sim.defense.map((d: any) => ({ d, s: at(d.idx, tDec) })).filter(({ s }: any) => s && s.x - sim.los >= -1 && s.x - sim.los <= 7 && s.vx < 2.5 && two && out(s.y) >= out(two.y) - 0.5)
      .sort((a: any, b: any) => out(b.s.y) - out(a.s.y));
    const k = cands[cands.length - 1] ?? null; // innermost of those over or outside #2 is the flat defender (outside-in first underneath)
    if (!k) cue = 'none';
    else {
      keySlot = k.d.slot;
      const vOut = k.s.vy * sideSign, deep = k.s.vx;
      if (deep >= 1.5) cue = 'sinks'; else if (deep <= -1.5) cue = 'jumps'; else if (vOut >= 1.5) cue = 'widens';
      else {
        const rules = r0.keyRules ?? [], sq = rules.find((x: any) => x.cue === 'squats')?.throwTo, wd = rules.find((x: any) => x.cue === 'widens')?.throwTo;
        const pa = sq ? posOf(sq, tDec) : null, pb = wd ? posOf(wd, tDec) : null;
        cue = pa && pb ? (Math.abs(k.s.y - pa.y) < Math.abs(k.s.y - pb.y) ? 'widens' : 'squats') : 'squats';
      }
    }
  }
  const taught = cue && r0?.keyRules ? r0.keyRules.find((x: any) => x.cue === cue)?.throwTo ?? null : null;
  const thrownRef = thrown?.slot ? Object.entries(num).find(([, sl]) => sl === thrown.slot)?.[0] ?? null : null;
  const thrownCanon = thrownRef ? (flip ? mirror(thrownRef) : thrownRef) : null;
  // Timing: the thrown route's break against the release.
  let relBrk: number | null = null;
  if (thrown?.idx != null) { const P = (tr[thrown.idx] ?? []).filter((s) => s[0] <= thrown.t + 1.2); const b = breakAt(P, /hitch|stick|curl|hook|comeback/.test(String(thrown.rid))); if (b !== null) relBrk = r2(thrown.t - b); }
  // Side (quick outs, pick 'cushion'): the corner over #1 with more cushion at the snap; within 1 yd either side is right.
  let sideOk: boolean | null = null;
  if (plan?.pick === 'cushion') {
    const cush = (side: 'S' | 'W') => { const one = posOf(side + '1', 0.05); if (!one) return null; const ds = sim.defense.map((d: any) => at(d.idx, 0.05)).filter((s: any) => s && Math.abs(s.y - one.y) < 3); return ds.length ? Math.min(...ds.map((s: any) => Math.hypot(s.x - one.x, s.y - one.y))) : null; };
    const cs = cush('S'), cw = cush('W');
    if (cs !== null && cw !== null) sideOk = Math.abs(cs - cw) < 1 ? true : (cs > cw ? keySide === 'S' : keySide === 'W') || (qbb?.v2 == null && thrownRef ? (cs > cw ? thrownRef.startsWith('S') : thrownRef.startsWith('W')) : false);
  }
  const stall = !sack && (!thrown || thrown.t > 3.0);
  console.log(JSON.stringify({ concept, coverage, seed, v2: !!qbb?.v2, flip, key: keySlot, cue, taught, thrown: thrownCanon, away: thrown?.away ?? null,
    rel: thrown ? r2(thrown.t) : null, relBrk, sideOk, stall, sack, complete: !!sim.stats.completed }));
}
