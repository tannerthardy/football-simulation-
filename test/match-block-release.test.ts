import { vi, describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { MatchRule, ZoneId } from '../src/playbook/types.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; });

function stage(rule: MatchRule, zone: ZoneId) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(101), 'O', 'PO1'), '11'),
    defense: pickDefense(generateTeam(new Rng(102), 'D', 'PD1'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 8101,
  });
  const a = sim.slot(rule === 'q_safety' ? 'SS' : 'LB_M')!, r = sim.slot(sim.offAlign.numbering.S2!)!;
  const b = new CoverageDefender(a, sim, rule, zone, 'match', 'B', sim.offAlign.strongSign);
  a.behavior = b; a.recog!.read = 'pass'; a.body.pos = { x: rule === 'q_safety' ? 52 : 46, y: r.pos.y+1 };
  let picture: Perceived = { pos: { x: 41, y: r.pos.y }, vel: { x: .8, y: 0 },
    stance: 'low', facing: 0, age: .2, carrying: false };
  const see = sim.see.bind(sim);
  sim.see = (observer,target,scale) => target === r ? picture : see(observer,target,scale);
  const update = (t: number) => { sim.t=t; return b.update(a,sim); };
  const block = () => { update(.6); update(.7); return update(.8); };
  const release = () => {
    picture = { ...picture, pos: { x: 48, y: r.pos.y }, vel: { x: 6.5, y: 0 }, stance: null };
    update(1); update(1.1); return update(1.2);
  };
  return { sim,a,r,b,update,block,release,setPicture:(p: Perceived)=>{picture=p;},picture:()=>picture };
}
const roles = [
  ['q_safety','quarter_s_in','man'],
  ['c3_curl_flat','curl_flat_s','man'],
  ['q_apex','hook_s','wall'],
] as const;

describe('acquired entry into a rule-based man technique', () => {
  it('does not initialize from hidden live receiver positions', () => {
    const one=stage('c3_curl_flat','curl_flat_s'), two=stage('c3_curl_flat','curl_flat_s');
    for (const f of [one,two]) f.setPicture({ ...f.picture(),pos:{x:45,y:f.r.pos.y},vel:{x:6,y:0},stance:null });
    for(const t of [1,1.1,1.2,1.25]) {
      two.r.body.pos={x:85,y:2};two.r.body.vel={x:-9,y:8};
      for(const f of [one,two]) f.sim.perception.record(f.sim.agents);
      expect(two.update(t)).toEqual(one.update(t));
      expect(two.b.recordedMan()).toEqual(one.b.recordedMan());
      expect(two.sim.rng).toEqual(one.sim.rng);
    }
    expect(one.b.job).toBe(`man:${one.r.slot}`);
    expect(one.b.recordedMan()?.initialCushion).toBe(1);
    const before=one.update(1.3);
    one.setPicture({ ...one.picture(),pos:{x:46,y:one.picture().pos.y} });
    const fresh=one.update(1.4);
    expect(fresh.vel.x).toBeGreaterThan(before.vel.x);
    expect(one.b.recordedMan()?.initialCushion).toBe(1); // Entry only; do not restart a continuing technique.
  });
});

describe('blocking is provisional evidence for an uncommitted match key', () => {
  it.each(roles)('%s restores its installed #2 duty after an acquired vertical release', (rule,zone,technique) => {
    const f=stage(rule,zone);f.block();
    expect(f.b.recordedRule(.8).reads.find(rd=>rd.target===f.r.idx)?.release).toBe('block');
    f.release();
    expect(f.b.recordedRule(1.2).reads.find(rd=>rd.target===f.r.idx)?.release).toBe('vertical');
    expect(f.b.job).toBe(`${technique}:${f.r.slot}`);
    if(rule==='q_safety') expect(f.b.recordedRule(1.2).mode).toBe('two');
  });

  it.each(roles)('%s retains its block response while no release has been acquired', (rule,zone) => {
    const f=stage(rule,zone);const command=f.block();
    f.r.body.pos={x:85,y:2}; f.r.body.vel={x:9,y:0};
    f.sim.perception.record(f.sim.agents);
    expect(f.update(.9)).toEqual(command);
    expect(f.b.job).not.toBe(`man:${f.r.slot}`);
    expect(f.b.job).not.toBe(`wall:${f.r.slot}`);
  });

  it.each(roles)('%s preserves a genuine acquired flat/under exchange', (rule,zone) => {
    for (const release of ['flat', 'under'] as const) {
      const f=stage(rule,zone),sign=f.sim.offAlign.strongSign*(release==='flat'?1:-1);
      // The inward shallow is beyond line contact; turning toward a nearby
      // defender at x=41 legitimately presents blocking evidence instead.
      f.setPicture({ ...f.picture(),pos:{...f.picture().pos,x:release==='under'?43:41},
        vel:{x:0,y:sign*5},facing:sign*Math.PI/2,stance:null });
      f.block();
      expect(f.b.recordedRule(.8).reads.find(rd=>rd.target===f.r.idx)?.release).toBe(release);
      const job=f.b.job;f.release();
      // A genuine shallow earns zone-off. Quarter-flat instead owns the
      // acquired outward route, including a subsequent wheel. Deep judgment
      // may still rescue a vertical without rewriting its installed branch.
      if(rule!=='q_safety') expect(f.b.job).toBe(job);
      expect(f.b.recordedRule(1.2).mode).toBe(rule==='q_safety'?'one':rule==='q_apex'&&release==='flat'?'flat':'zoned');
    }
  });
});
