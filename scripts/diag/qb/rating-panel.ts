// QB lane 2026-11-23 (Integration + the user: the stare-down passer, the darting passer, the good one). Measurement only.
// The same staged plays with one passer at three levels of his mental ratings (playRecognition, decisionMaking,
// awareness, composure, discipline, anticipation, consistency: 35 / 60 / 88; experience 0 / 4 / 10). Arm, accuracy and
// body are his roster's and do not change, so any difference comes through how he reads (no outcome is set by rating).
// Per play: every tick while he holds the ball after the snap, his current read, his head's angle to it, his phase; his
// plant (clock origin) and stride; the throw (target, release) and outcome; the thrown receiver's break (from his track).
//   node --import tsx scripts/diag/eyes/rating-panel.ts <level 35|60|88> > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

// A level (35 / 60 / 88: every mental rating) or a mixed profile: 'stare' (slow processing, high composure and
// discipline) or 'dart' (fair processing, low composure and discipline).
const arg = process.argv[2] ?? '60';
const PROFILES: Record<string, { proc: number; calm: number; exp: number }> = { stare: { proc: 35, calm: 88, exp: 1 }, dart: { proc: 60, calm: 30, exp: 2 } };
const level: any = PROFILES[arg] ? arg : Number(arg), exp = PROFILES[arg] ? PROFILES[arg].exp : level < 50 ? 0 : level < 75 ? 4 : 10;
const MENTAL = ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency'];
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
for (const concept of ['curl_flat', 'smash', 'dagger', 'mesh', 'quick_outs', 'stick', 'flood', 'y_cross']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (const roster of [3, 9]) for (const seed of [1, 2]) for (const flip of [false, true]) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip });
    const qbP = setup.offense.QB;
    if (!qbP) continue;
    for (const k of MENTAL) qbP.ratings[k] = PROFILES[arg] ? (k === 'composure' || k === 'discipline' ? PROFILES[arg].calm : PROFILES[arg].proc) : level;
    qbP.experience = exp;
    let sim: any; try { sim = new PlaySim(setup); } catch { continue; }
    const ticks: any[] = [], track: Record<string, any[]> = {}; let release: any = null, qbb: any = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
      if (p === sim.qb && !release) release = { t: +sim.t.toFixed(2), slot: target?.slot ?? null, away: !!away || !target, route: target?.behavior?.route?.id ?? null };
      return tb(p, target, v0, intended, arrivalT, away, ...rest);
    };
    const t0 = sim.tick.bind(sim);
    sim.tick = () => {
      t0();
      for (const o of sim.offense) (track[o.slot] ??= []).push([+sim.t.toFixed(2), +o.vel.x.toFixed(2), +o.vel.y.toFixed(2)]);
      const b: any = sim.qb.behavior, qb = sim.qb;
      if (!qbb && b?.kind === 'qb-pass') qbb = b;
      if (b?.kind !== 'qb-pass' || release || sim.carrier !== qb || !b.reads) return;
      const cur = b.reads[b.readIdx] ?? null, head = qb.head ?? qb.body.facing;
      ticks.push({ t: +sim.t.toFixed(2), ph: b.phase, idx: b.readIdx, cur: cur?.slot ?? null,
        ang: cur ? +(Math.abs(wrap(head - Math.atan2(cur.pos.y - qb.pos.y, cur.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(0) : null });
    };
    try { sim.run(); } catch { continue; }
    const b: any = qbb ?? sim.qb.behavior, ev = sim.events as any[];
    console.log(JSON.stringify({ level, concept, coverage, roster, seed, flip, snapAt: b?.snapAt ?? null, dropTime: b?.drop?.time ?? null,
      stride: b?.stride ? b.stride() : null, nReads: b?.reads?.length ?? null, release, cmp: !!sim.stats.completed,
      int: ev.some((e) => e.type === 'interception'), sack: ev.some((e) => e.type === 'sack'), lookLog: b?.lookLog ?? [],
      ticks, track: release && release.slot ? track[release.slot] : null }));
  }
