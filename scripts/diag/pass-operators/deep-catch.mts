// The deep catch point (Integration, 2026-11-18; Defense's deep-close.mts selection, scripts/diag/zone-yac on
// defense/zone-yac-tools a38b130b): staged throws at snap + T to each eligible receiver, kept when the ball's arrival spot
// is 15+ yd past the LOS, cover 2/3/4/6. The deep man: the defender 10+ yd past the LOS at the release nearest the arrival
// spot. Adds, per throw: the outcome (catch / interception / breakup by whom / incomplete untouched / other), the deep man
// at arrival: distance to the ball spot and to the receiver, whether he is in front of the receiver (nearer the QB) or
// trailing, his shoulders against the incoming ball (facingBall's cosine: he sees it when > -0.35), whether the ball ever
// came inside his hands' envelope (horizontal distance <= reach + 0.3 with the ball below his catch height) while in the
// air, his behavior kind and tags at arrival, and the receiver's distance to the ball spot (over / underthrow toward him).
// usage: TS=2.2,2.8 node --import tsx scripts/diag/pass-operators/deep-catch.mts SEEDS OUT.json
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { shouldersOf } = await import(`${W}/src/physics/kinematics.ts`);
const CAT: any = await import(`${W}/src/sim/catching.ts`);
const { writeFileSync } = await import('node:fs');
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(','), SEEDS = Number(process.argv[2] ?? 2);
const TS = (process.env.TS ?? '2.5').split(',').map(Number);
const out: any[] = []; let uniq = 0;
for (const coverage of COVS) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= SEEDS; seed++) for (const T of TS) {
    // DICE_UNIQUE=1: each staged play its own play seed (the same roster): the contest dice ('catch:O:<slot>') fork from the
    // play seed, so with Defense's seed = roster every throw to a slot on a seed drew the same rolls.
    const playSeed = process.env.DICE_UNIQUE === '1' ? 1000 + (uniq++) : seed;
    const setup: any = nativeTraceSetup({ coverage, concept, seed: playSeed, roster: seed, formation, flip: seed % 2 === 0 });
    let dry: any; try { dry = new PlaySim(setup); } catch { continue; }
    for (let i = 0; i < 400 && (dry.snapAt ?? -1) < 0; i++) dry.tick();
    const snap = dry.snapAt ?? 0;
    for (const slot of ['X', 'Z', 'Y', 'H', 'F']) {
      if (!dry.offense.some((o: any) => o.slot === slot && o.behavior?.route)) continue;
      let sim: any; try { sim = new PlaySim({ ...setup, stagedThrow: { at: snap + T, slot } }); } catch { continue; }
      let rel = -1, arrT = -1, dm: any = null, rec: any = null, arr: any = null, lastB: any = null, lastV: any = null; const near: Record<number, number> = {};
      // Which contest path made each pbu / interception / deflection (the calling function, from the stack).
      const why: any[] = []; const ev0 = sim.event.bind(sim), pos0 = sim.possess.bind(sim);
      const site = () => (new Error().stack ?? '').split('\n').map((l) => l.trim().split(' ')[1]).find((f) => /defenderPlay|contestHands|receiverContest|secureStep/.test(f ?? '')) ?? 'other';
      sim.event = (type: any, a?: any, b?: any, note?: any) => { if (['pbu', 'deflection', 'interception'].includes(type)) why.push({ type, a: a?.idx, site: site(), note }); return ev0(type, a, b, note); };
      sim.possess = (a: any, how: any) => { if (how === 'interception') why.push({ type: 'int', a: a?.idx, site: site() }); return pos0(a, how); };
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (sim.ball.kind === 'air' && rel < 0) { rel = sim.t; arrT = sim.ball.arrivalT; rec = sim.ball.target; }
        if (rel < 0 || arr) return;
        if (sim.ball.kind === 'air') { lastB = { ...sim.ball.flight.pos }; lastV = { ...sim.ball.flight.vel }; }
        if (sim.ball.kind === 'air') {
          const b = sim.ball.flight.pos;
          for (const d of sim.defense) { const h = Math.hypot(d.pos.x - b.x, d.pos.y - b.y);
            if (b.z <= d.profile.maxCatchHeight && h <= d.profile.reach + 0.3) near[d.idx] = Math.min(near[d.idx] ?? 9, h); }
        }
        if (sim.ball.kind !== 'air' || sim.t >= arrT - 1e-9) {
          const b = sim.ball.kind === 'air' ? sim.ball.flight.pos : lastB, bv = sim.ball.kind === 'air' ? sim.ball.flight.vel : lastV; // caught before arrT: its last airborne point
          arr = { t: sim.t, b, bv, snap: sim.defense.map((d: any) => ({ d, p: { ...d.pos }, kind: d.behavior?.kind ?? null, tags: [...(d.tags ?? [])], f: shouldersOf(d.body) })), r: rec ? { ...rec.pos } : null };
        }
      };
      try { sim.run(); } catch { continue; }
      if (rel < 0 || !arr || !arr.b) continue;
      const dir = sim.attackDir(sim.offense[0].team), los = sim.los;
      const cp = arr.b; if ((cp.x - los) * dir < 15) continue;
      const deep = arr.snap.filter((s: any) => (s.p.x - los) * dir >= 10); if (!deep.length) continue;
      const m = deep.reduce((a: any, b: any) => Math.hypot(b.p.x - cp.x, b.p.y - cp.y) < Math.hypot(a.p.x - cp.x, a.p.y - cp.y) ? b : a);
      const sp = Math.hypot(arr.bv.x, arr.bv.y) || 1, cosF = Math.cos(m.f) * (-arr.bv.x / sp) + Math.sin(m.f) * (-arr.bv.y / sp);
      const ev = sim.events; const pick = ev.find((e: any) => e.type === 'interception'), pbu = ev.find((e: any) => e.type === 'pbu'), defl = ev.find((e: any) => e.type === 'deflection');
      const outcome = pick ? 'int' : sim.stats.completed ? 'catch' : pbu ? 'pbu' : defl ? 'deflection' : 'incomplete';
      const by = pick ? pick.a : pbu ? pbu.a : defl ? defl.a : null;
      const rp = arr.r;
      out.push({ coverage, concept, formation, seed, slot, T, air: +((cp.x - los) * dir).toFixed(1),
        dArr: +Math.hypot(m.p.x - cp.x, m.p.y - cp.y).toFixed(2), dRec: rp ? +Math.hypot(m.p.x - rp.x, m.p.y - rp.y).toFixed(2) : null,
        recArr: rp ? +Math.hypot(rp.x - cp.x, rp.y - cp.y).toFixed(2) : null,
        front: rp ? (m.p.x - rp.x) * dir < 0 : null, cosF: +cosF.toFixed(2), sees: cosF > -0.35, hands: near[m.d.idx] ?? null,
        contacts: (CAT.ballContacts?.get(sim) ?? []).map((c: any) => ({ kind: c.kind, saw: c.saw, deep: c.d === m.d.idx })), kind: m.kind, tags: m.tags, looking: m.tags.includes('looking'), bs: +m.d.r('ballSkills').toFixed(2), hn: +m.d.r('hands').toFixed(2), why, deepIdx: m.d.idx, outcome, byDeep: by === m.d.idx, bySlot: by != null ? sim.agents[by]?.slot ?? null : null });
    }
  }
writeFileSync(process.argv[3], JSON.stringify(out)); console.log('rows', out.length);
