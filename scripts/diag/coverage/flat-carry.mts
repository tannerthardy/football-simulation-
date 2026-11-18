// node --import tsx scripts/diag/coverage/flat-carry.mts [seeds]   (LIST=1 prints the never-touched 20+ plays)
// FLAT_CARRY read: Cover 2 family staged dropbacks (cover2, cover2_match, tampa2), every non-screen non-PA concept.
// (1) never-touched 20+: completions of 20+ yards where no defender came within 1 yd of the receiver from the catch on;
// (2) throws to a receiver who started in a flat seat's area shallow and was 10+ yd deep at the catch (the turned-up
// flat): completion, yards, YAC, corner distance at the catch; (3) how often flat-carry fired.
const W = process.cwd(), seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction').map(([id]) => id);
let plays = 0, comp20 = 0, never20 = 0, fired = 0; const up: any[] = [];
for (const concept of concepts) for (const coverage of ['cover2', 'cover2_match', 'tampa2']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    let C: any = null, minD = Infinity, catchAt: any = null, cornerD: number | null = null;
    const ev0 = sim.event.bind(sim); sim.event = (type: string, a?: any, ...r: any[]) => { if (type === 'catch' && a?.team === 'O' && !C) { C = a; catchAt = { x: a.pos.x }; const cbs = sim.defense.filter((d: any) => /^CB/.test(d.slot)); cornerD = Math.min(...cbs.map((d: any) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y))); } return ev0(type, a, ...r); };
    const tick = sim.tick.bind(sim); sim.tick = () => { tick(); if (C && sim.phase === 'live') minD = Math.min(minD, ...sim.defense.map((d: any) => Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y))); if (sim.defense.some((d: any) => d.tags?.has?.('flat-carry'))) fired++; };
    let res: any; try { res = sim.run(); } catch { continue; }
    plays++;
    if (C && (res.yards ?? 0) >= 20) { comp20++; if (minD > 1) { never20++; if (process.env.LIST) console.log(`  never-touched ${concept} ${coverage} ${formation} s${seed} ${flip ? 'F' : ''}: ${C.slot} ${C.behavior?.route?.id ?? C.behavior?.fallback?.route?.id ?? '?'} catch ${((catchAt.x - sim.los) * sim.attackDir('O')).toFixed(1)} yd, ${res.yards.toFixed(0)} yd`); } }
    if (C) { const depth = (catchAt.x - sim.los) * sim.attackDir('O'); if (depth >= 10 && /flat|wheel|swing|arrow|out/.test(C.behavior?.route?.id ?? '')) up.push({ yds: res.yards ?? 0, yac: res.stats.yac ?? 0, cornerD }); }
  }
const m = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-';
console.log(`plays ${plays} | completions 20+ ${comp20}, never touched ${never20} | flat-carry ticks ${fired}`);
console.log(`turned-up flat catches (flat/wheel/swing/arrow/out route, 10+ yd deep at the catch): n ${up.length} | yd ${m(up.map(r => r.yds))} | YAC ${m(up.map(r => r.yac))} | nearest corner at catch ${m(up.map(r => r.cornerD))}`);
