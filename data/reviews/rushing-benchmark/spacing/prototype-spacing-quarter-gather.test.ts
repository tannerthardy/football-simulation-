import { describe, expect, it, vi } from 'vitest';
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Body } from '../src/physics/kinematics.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent, type StepReport } from '../src/physics/world.js';
import type { PhysicalProfile } from '../src/players/physical.js';
import type { Agent } from '../src/sim/agent.js';
import { spaceTeammates, type SpacingContext } from '../src/sim/spacing.js';

interface Peer { slot: string; radius: number; pos: { x: number; y: number }; vel: { x: number; y: number } }
interface Native { at: number; body: Body; mike: Body; request: Intent; mikeRequest: Intent; peers: Peer[] }

// Self-contained extracts of the native C2/right SS at 4.15, 4.20 and 4.25.
// Exact SS/Mike physical state and already-consumed teammate pictures;
// unrelated peer bodies/intentions are not input to this controller.
// Origin: data/reviews/alley-support-and-tail-audit/audit/six-tail-command-witnesses.json.gz
// and its source-pinned 4.15 half-gather prefix. Original engine: 601b66e;
// spacing/physics bytes stayed identical in the 3cb alley-only baseline.
const SAFETY: PhysicalProfile = {"vmax":10.071977068663916,"tau":1.3540302874708066,"brake":6.784954648526077,"lateral":6.536619047619049,"turnRate":9.15777777777778,"backpedal":0.706530612244898,"shuffle":0.6116,"massKg":87.54332741,"heightYd":1.8861111111111113,"radius":0.25181818181818183,"reach":0.9512499999999999,"maxCatchHeight":3.3240833333333337,"reactReach":2.8143611111111118,"reactionTime":0.21865306122448983,"power":63.50464434262144,"balance":0.32653061224489793,"bend":0.7706394557823131,"stepSpeed":3.861473922902495,"getUp":0.830111111111111};
const MIKE: PhysicalProfile = {"vmax":9.196341974619003,"tau":1.2851442244886193,"brake":6.347324263038549,"lateral":6.209312925170071,"turnRate":8.628888888888891,"backpedal":0.6214285714285714,"shuffle":0.5868,"massKg":107.95498406,"heightYd":2.086111111111111,"radius":0.2927272727272727,"reach":1.0291666666666666,"maxCatchHeight":3.543416666666667,"reactReach":3.062861111111111,"reactionTime":0.19881632653061226,"power":100.55235658160001,"balance":0.2653061224489796,"bend":0.5310612244897962,"stepSpeed":3.487628117913833,"getUp":0.9368888888888888};
const NATIVE: Native[] = [
  { at:4.15,
    body:{...{"pos":{"x":55.29973815870568,"y":8.538048501449406},"vel":{"x":-1.9378864972821273,"y":2.47127174351849},"facing":0.9306114659183977,"energy":0.9674793228551392,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.5313206624802592,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":4.099282924234832,"y":4.873588526445096},"tipAccel":{"x":0,"y":0}},"spin":3.0929164889897773,"squeeze":0,"sprintLoad":0,"squeezeHeading":-5.0129235878801675},profile:SAFETY},
    mike:{...{"pos":{"x":52.73955113895487,"y":14.277628954197302},"vel":{"x":3.985771006526755,"y":-5.3521349958620865},"facing":6.310248772243701,"energy":0.9589646094812061,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.44300713913164025,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":3.6411633104519567,"y":3.5483810242565386},"tipAccel":{"x":0,"y":0}},"spin":2.9135256836633636,"squeeze":0,"sprintLoad":0,"squeezeHeading":-0.15565482443575757},profile:MIKE},
    request:{"vel":{"x":3.02679321560171,"y":6.9084758670088355},"facing":1.6934030375435627,"cutSkill":1.0428571428571427,"posture":0.5377551020408163},
    mikeRequest:{"vel":{"x":9.1168447314236,"y":1.2065852051359967},"effort":1},
    peers:[{"slot":"DE_W","radius":0.3572727272727273,"pos":{"x":35.582750409279505,"y":28.404537281356934},"vel":{"x":3.1333598076881577,"y":-1.596328892239421}},{"slot":"DE_S","radius":0.30272727272727273,"pos":{"x":35.93105933428587,"y":17.164112268335327},"vel":{"x":3.004331172464436,"y":-1.390946899329779}},{"slot":"DT_S","radius":0.38,"pos":{"x":37.15089287330055,"y":23.70069666516033},"vel":{"x":2.9437860084322054,"y":-0.8106801558907831}},{"slot":"DT_W","radius":0.35909090909090907,"pos":{"x":39.66958135485401,"y":24.366425906652527},"vel":{"x":4.25573879529593,"y":-1.9085260811586513}},{"slot":"LB_M","radius":0.2927272727272727,"pos":{"x":52.73551416190656,"y":14.272250621326352},"vel":{"x":3.8242919245941502,"y":-5.56726831070007}},{"slot":"LB_W","radius":0.3,"pos":{"x":52.75922944095,"y":19.945785399568997},"vel":{"x":2.3113097427463707,"y":-6.0219211145293805}},{"slot":"CB_S","radius":0.2427272727272727,"pos":{"x":46.145772126836015,"y":12.42483690357209},"vel":{"x":5.029060390085146,"y":-0.24450329894203796}},{"slot":"CB_W","radius":0.26454545454545453,"pos":{"x":42.94268908967824,"y":40.37228915849923},"vel":{"x":2.76291175187215,"y":-3.476400708773552}},{"slot":"NB","radius":0.24727272727272726,"pos":{"x":52.170245950060675,"y":23.708943420670522},"vel":{"x":2.824840672686432,"y":-6.252068246073305}},{"slot":"FS","radius":0.2590909090909091,"pos":{"x":59.83135571397634,"y":43.32134331387096},"vel":{"x":1.0892146630871768,"y":-2.8908354135044525}}] },
  { at:4.2,
    body:{...{"pos":{"x":55.210589014302954,"y":8.663818007495813},"vel":{"x":-1.628079278826798,"y":2.5595084983377823},"facing":1.1852334195225809,"energy":0.9671998987764687,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.5312509666118441,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":5.59538350679964,"y":2.655436516833075},"tipAccel":{"x":0,"y":0}},"spin":7.0919616551775455,"squeeze":0,"sprintLoad":0,"squeezeHeading":-5.125325983680072},profile:SAFETY},
    mike:{...{"pos":{"x":52.94289725177042,"y":14.015368827563096},"vel":{"x":4.148073506095129,"y":-5.138270069506169},"facing":6.435346233663184,"energy":0.9584302307088167,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.31800713913164025,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":3.3592518525885295,"y":4.068460166033088},"tipAccel":{"x":0,"y":0}},"spin":2.0903727731159627,"squeeze":0,"sprintLoad":0,"squeezeHeading":0.13158210371991258},profile:MIKE},
    request:{"vel":{"x":3.9198037108610055,"y":6.8661862644845435},"facing":1.570122223567497,"cutSkill":1.0428571428571427,"posture":0.5377551020408163},
    mikeRequest:{"vel":{"x":8.990100596147897,"y":0.836249613950586},"facing":0.24326123774509234,"cutSkill":1.1107142857142858,"posture":0.5862244897959183},
    peers:[{"slot":"DE_W","radius":0.3572727272727273,"pos":{"x":35.7539521968929,"y":28.329774018082098},"vel":{"x":3.327143770741203,"y":-1.5289531410776247}},{"slot":"DE_S","radius":0.30272727272727273,"pos":{"x":36.099633795614835,"y":17.10009726493046},"vel":{"x":3.2491032085410576,"y":-1.317182345174767}},{"slot":"DT_S","radius":0.38,"pos":{"x":37.308613319926835,"y":23.669564230730977},"vel":{"x":3.0842012911611185,"y":-0.6853258443549385}},{"slot":"DT_W","radius":0.35909090909090907,"pos":{"x":39.89331370556227,"y":24.281006044676406},"vel":{"x":4.401677607875388,"y":-1.7751068534011927}},{"slot":"LB_M","radius":0.2927272727272727,"pos":{"x":52.93883968928121,"y":14.010022204404198},"vel":{"x":3.985771006526755,"y":-5.3521349958620865}},{"slot":"LB_W","radius":0.3,"pos":{"x":52.89089091834021,"y":19.65423152063623},"vel":{"x":2.5259229461182704,"y":-5.894692090613339}},{"slot":"CB_S","radius":0.2427272727272727,"pos":{"x":46.41115071481538,"y":12.417555681998046},"vel":{"x":5.2147346364198235,"y":-0.17858405396792285}},{"slot":"CB_W","radius":0.26454545454545453,"pos":{"x":43.09949223496739,"y":40.20022694658127},"vel":{"x":3.0116791878127223,"y":-3.4529630618307836}},{"slot":"NB","radius":0.24727272727272726,"pos":{"x":52.33082775961918,"y":23.4056318076143},"vel":{"x":3.0827043516755848,"y":-6.12817758944077}},{"slot":"FS","radius":0.2590909090909091,"pos":{"x":59.90305261864881,"y":43.168117927034984},"vel":{"x":1.3190302833285632,"y":-3.0066169623145176}}] },
  { at:4.25,
    body:{...{"pos":{"x":55.133736205187255,"y":8.784638547755078},"vel":{"x":-1.4460330858012596,"y":2.273313112032841},"facing":1.5549768629244776,"energy":0.9669319652612951,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.5311950817961101,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":4.2008859244422,"y":-3.323185405956015},"tipAccel":{"x":0,"y":0}},"spin":7.697776080898322,"squeeze":0,"sprintLoad":0,"squeezeHeading":-5.125325983680072},profile:SAFETY},
    mike:{...{"pos":{"x":53.15496194643969,"y":13.76420650048981},"vel":{"x":4.334514280675696,"y":-4.908223013425286},"facing":6.53315570862183,"energy":0.9579010285421473,"support":{"xi":{"x":0,"y":0},"state":"up","since":-Infinity,"posture":0.44300713913164025,"lean":{"x":0,"y":0},"load":{"x":0,"y":0},"felt":{"x":0,"y":0},"feetLock":0,"feetVel":{"x":0,"y":0},"fall":{"x":0,"y":0},"peak":0,"out":0,"feltTip":{"x":0,"y":0},"causes":{"contact":0,"legs":0,"overspeed":0},"accel":{"x":3.622933736286209,"y":4.4483827736059816},"tipAccel":{"x":0,"y":0}},"spin":1.8220062252298952,"squeeze":0,"sprintLoad":0,"squeezeHeading":0.09275203985471775},profile:MIKE},
    request:{"vel":{"x":4.792815493543083,"y":6.849807584009485},"facing":1.4434115466147746,"cutSkill":1.0428571428571427,"posture":0.5377551020408163},
    mikeRequest:{"vel":{"x":8.74948045055807,"y":-0.3072361279857019},"facing":0.5720013377309936,"cutSkill":1.1107142857142858,"posture":0.5862244897959183},
    peers:[{"slot":"DE_W","radius":0.3572727272727273,"pos":{"x":35.93427799628839,"y":28.259271914405964},"vel":{"x":3.513391915520284,"y":-1.4496790960409613}},{"slot":"DE_S","radius":0.30272727272727273,"pos":{"x":36.27963861508955,"y":17.041022433429585},"vel":{"x":3.483098662509865,"y":-1.2267252017366161}},{"slot":"DT_S","radius":0.38,"pos":{"x":37.47135915962445,"y":23.639639318857693},"vel":{"x":3.1980116263552776,"y":-0.6274407730954525}},{"slot":"DT_W","radius":0.35909090909090907,"pos":{"x":40.1237686278432,"y":24.202868278155194},"vel":{"x":4.539958166370904,"y":-1.6335391714165726}},{"slot":"LB_M","radius":0.2927272727272727,"pos":{"x":53.15030092707517,"y":13.758455324087787},"vel":{"x":4.148073506095129,"y":-5.138270069506169}},{"slot":"LB_W","radius":0.3,"pos":{"x":53.0325122218394,"y":19.370323465707514},"vel":{"x":2.730258362028613,"y":-5.750338095920652}},{"slot":"CB_S","radius":0.2427272727272727,"pos":{"x":46.68530977961691,"y":12.413297368623722},"vel":{"x":5.39369907616035,"y":-0.11630552964698106}},{"slot":"CB_W","radius":0.26454545454545453,"pos":{"x":43.268487118950844,"y":40.03055875476517},"vel":{"x":3.257158182383589,"y":-3.413230244824967}},{"slot":"NB","radius":0.24727272727272726,"pos":{"x":52.503819328795174,"y":23.10946380277529},"vel":{"x":3.3341223729050347,"y":-5.991632594333659}},{"slot":"FS","radius":0.2590909090909091,"pos":{"x":59.97201269136631,"y":43.00414718308273},"vel":{"x":1.3591443973428827,"y":-3.1884822401349786}}] },
];

function reflect(body: Body) {
  body.pos.y = FIELD_WIDTH-body.pos.y;
  body.vel.y *= -1;
  body.facing *= -1;
  if (body.spin !== undefined) body.spin *= -1;
  if (body.squeezeHeading !== undefined) body.squeezeHeading *= -1;
  const support = body.support!;
  for (const value of [support.xi, support.lean, support.load, support.felt, support.feetVel,
    support.fall, support.accel, support.tipAccel, support.feltTip, support.strike]) if (value) value.y *= -1;
  if (support.yaw !== undefined) support.yaw *= -1;
}

function actor(body: Body, slot: string, idx = 0): Agent {
  // The production spacing consumer uses only these actor properties.
  // These adapters make no football decisions or fresh perception calls.
  return { idx, slot, team: 'D', body, profile: body.profile, speedScale: 1,
    engagement: null, get pos() { return body.pos; }, get vel() { return body.vel; },
    isDown: () => body.support!.state !== 'up' } as unknown as Agent;
}

function scene(index: number, mirror = false) {
  const data = structuredClone(NATIVE[index]);
  if (mirror) {
    reflect(data.body); reflect(data.mike);
    for (const intent of [data.request, data.mikeRequest]) {
      intent.vel.y *= -1;
      if (intent.facing !== undefined) intent.facing *= -1;
    }
    for (const peer of data.peers) { peer.pos.y = FIELD_WIDTH-peer.pos.y; peer.vel.y *= -1; }
  }
  const a = actor(data.body, 'SS');
  const peers = data.peers.map((peer, idx) => {
    // Only radius, identity and its observed picture are used for an inactive
    // peer. Its hidden position is deliberately independent of that picture.
    const body: Body = { pos: { ...peer.pos }, vel: { ...peer.vel }, facing: 0, energy: 1,
      profile: { ...SAFETY, radius: peer.radius }, support: newSupport() };
    return actor(body, peer.slot, idx+1);
  });
  const pictures = new Map(peers.map((peer, idx) => [peer, data.peers[idx]]));
  function request(context: SpacingContext = { now: data.at }) {
    const reads: string[] = [], intents: Intent[] = [];
    intents.length = peers.length+1; intents[0] = structuredClone(data.request);
    spaceTeammates([a, ...peers], intents, (observer, target) => {
      expect(observer).toBe(a);
      reads.push(target.slot);
      return pictures.get(target)!;
    }, context);
    return { command: intents[0], reads };
  }
  return { data, a, peers, pictures, request };
}

function bounded(report: StepReport, bodies: Body[]) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  bodies.forEach((body, i) => {
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i]+1e-8);
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i]+1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i]+1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(supportParams(body.profile).traction*.05+1e-8);
    expect(body.support!.state).toBe('up');
  });
}

function heldPair(f: ReturnType<typeof scene>, command: Intent) {
  const safety = structuredClone(f.data.body), mike = structuredClone(f.data.mike);
  const start = { ...safety.pos }, world = new World([safety, mike]); world.time = f.data.at;
  const frames: Array<{ safety: Body; mike: Body }> = [];
  for (let k = 0; k < 12; k++) {
    const report = world.step([command, f.data.mikeRequest], .05);
    bounded(report, [safety, mike]);
    expect(report.contacts).toHaveLength(0);
    frames.push({ safety: structuredClone(safety), mike: structuredClone(mike) });
  }
  const speed = Math.hypot(f.data.request.vel.x, f.data.request.vel.y);
  const progress = ((safety.pos.x-start.x)*f.data.request.vel.x
    +(safety.pos.y-start.y)*f.data.request.vel.y)/speed;
  return { frames, progress };
}

/** Independent closest distance along each achieved free-motion segment.
 * Used to prove a rejected candidate overlaps an observed moving peer. */
function clearance(body: Body, samples: readonly MovementPreview.MovementSample[], peer: Peer) {
  const touch = .9*(body.profile.radius+peer.radius);
  let px = body.pos.x-peer.pos.x, py = body.pos.y-peer.pos.y;
  let closest = Math.hypot(px, py)-touch;
  for (const sample of samples) {
    const rx = sample.pos.x-peer.pos.x-peer.vel.x*sample.t;
    const ry = sample.pos.y-peer.pos.y-peer.vel.y*sample.t;
    const dx = rx-px, dy = ry-py;
    const fraction = Math.max(0, Math.min(1, -(px*dx+py*dy)/Math.max(1e-12, dx*dx+dy*dy)));
    closest = Math.min(closest, Math.hypot(px+dx*fraction, py+dy*fraction)-touch);
    px = rx; py = ry;
  }
  return closest;
}

describe('teammate gathers retain useful movement when the faster gather is unsafe', () => {
  it('executes both native slower gathers with bounded, collision-free movement and physical mirrors', () => {
    for (const index of [1, 2]) {
      const right = scene(index), left = scene(index, true);
      const r = right.request().command, l = left.request().command;
      const speed = Math.hypot(r.vel.x, r.vel.y), original = Math.hypot(right.data.request.vel.x, right.data.request.vel.y);
      expect({ ...r, vel: undefined }).toEqual({ ...right.data.request, vel: undefined });
      expect(r.vel.x).toBeCloseTo(l.vel.x, 10);
      expect(r.vel.y).toBeCloseTo(-l.vel.y, 10);
      const fast = MovementPreview.previewFreeMovement(right.a.body, right.data.request, right.data.at, 12);
      const half = MovementPreview.previewFreeMovement(right.a.body,
        { ...right.data.request, vel: { x: right.data.request.vel.x*.5, y: right.data.request.vel.y*.5 } }, right.data.at, 12);
      const actual = MovementPreview.previewFreeMovement(right.a.body, r, right.data.at, 12);
      expect(right.data.peers.some(peer => clearance(right.a.body, fast, peer) < 0)).toBe(true);
      expect(right.data.peers.some(peer => clearance(right.a.body, half, peer) < 0)).toBe(true);
      expect(actual.every(sample => sample.support === 'up')).toBe(true);
      expect(right.data.peers.every(peer => clearance(right.a.body, actual, peer) > 0)).toBe(true);
      // Retrospective held-native Mike requests are used only for this World
      // execution check; the spacing decision above never receives them.
      const rr = heldPair(right, r), ll = heldPair(left, l);
      const stopped = heldPair(right, { ...r, vel: { x: 0, y: 0 } });
      expect(rr.progress).toBeGreaterThan(stopped.progress+.1);
      expect(speed).toBeGreaterThan(0);
      expect(speed).toBeLessThan(original*.5);
      expect(rr.frames[0].safety.vel.x).toBeLessThan(0);
      expect(rr.frames[0].safety.vel.x).toBeGreaterThan(right.data.body.vel.x);
      rr.frames.forEach((frame, k) => {
        expect(frame.safety.pos.x).toBeCloseTo(ll.frames[k].safety.pos.x, 9);
        expect(frame.safety.pos.y+ll.frames[k].safety.pos.y).toBeCloseTo(FIELD_WIDTH, 9);
        expect(frame.safety.vel.x).toBeCloseTo(ll.frames[k].safety.vel.x, 9);
        expect(frame.safety.vel.y).toBeCloseTo(-ll.frames[k].safety.vel.y, 9);
      });
    }
  });

  it('preserves the earlier native half gather exactly', () => {
    const f = scene(0), command = f.request().command;
    expect(command).toEqual({ ...f.data.request,
      vel: { x: f.data.request.vel.x*.5, y: f.data.request.vel.y*.5 } });
    heldPair(f, command);
  });

  it('uses each consumed teammate picture once, with no body mutation, hidden-peer retargeting or random draws', () => {
    const f = scene(1), before = structuredClone([f.a.body, ...f.peers.map(p => p.body)]);
    const pictures = structuredClone([...f.pictures.values()]);
    const random = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const first = f.request();
      expect(first.reads).toHaveLength(f.peers.length);
      expect(new Set(first.reads).size).toBe(f.peers.length);
      expect([f.a.body, ...f.peers.map(p => p.body)]).toEqual(before);
      const mike = f.peers.find(p => p.slot === 'LB_M')!;
      mike.body.pos = { x: 10, y: 2 }; mike.body.vel = { x: -8, y: 4 };
      expect(f.request().command).toEqual(first.command);
      expect([...f.pictures.values()]).toEqual(pictures);
      expect(random).not.toHaveBeenCalled();
    } finally { random.mockRestore(); }
  });

  it('restores the ordinary request when a fresh observed crossing moves out of its attainable path', () => {
    const f = scene(1), cautious = f.request().command;
    const mike = f.peers.find(p => p.slot === 'LB_M')!, picture = f.pictures.get(mike)!;
    picture.vel = { x: -4, y: -5.35 };
    const clear = f.request().command;
    expect(Math.hypot(cautious.vel.x, cautious.vel.y)).toBeGreaterThan(0);
    expect(clear).toEqual(f.data.request);
    // No remembered freeze: the same consumed obstruction requests a gather
    // again as soon as it is the input, without a new time gate.
    picture.vel = { ...NATIVE[1].peers.find(p => p.slot === 'LB_M')!.vel };
    expect(f.request().command).toEqual(cautious);
  });

  it('rejects a smaller moving gather that would create a new trailing conflict', () => {
    for (const mirror of [false, true]) {
      const f = scene(1, mirror), side = mirror ? -1 : 1;
      const selected = f.request().command;
      const samples = MovementPreview.previewFreeMovement(f.a.body, selected, f.data.at, 12);
      // Controlled trailing picture found with the production preview:
      // ordinary clearance +.683 yd, slower -.173 yd, stop -.418 yd.
      // This is a deliberately adverse cue, not another native witness.
      const rear: Peer = { slot: 'rear', radius: MIKE.radius,
        pos: { x: f.a.pos.x-2, y: f.a.pos.y-side*2 }, vel: { x: 3, y: side*5 } };
      expect(clearance(f.a.body, samples, rear)).toBeLessThan(0);
      const original = MovementPreview.previewFreeMovement(f.a.body, f.data.request, f.data.at, 12);
      const stopped = MovementPreview.previewFreeMovement(f.a.body,
        { ...f.data.request, vel: { x: 0, y: 0 } }, f.data.at, 12);
      expect(clearance(f.a.body, original, rear)).toBeGreaterThan(0);
      expect(clearance(f.a.body, stopped, rear)).toBeLessThan(0);
      const trailing = actor({ pos: { ...rear.pos }, vel: { ...rear.vel }, facing: 0, energy: 1,
        profile: MIKE, support: newSupport() }, 'rear');
      for (const peers of [[...f.peers, trailing], [trailing, ...f.peers]]) {
        const intents: Intent[] = []; intents.length = peers.length+1; intents[0] = structuredClone(f.data.request);
        spaceTeammates([f.a, ...peers], intents, (_a, b) => b === trailing ? rear : f.pictures.get(b)!, { now: f.data.at });
        expect(intents[0]).toEqual(f.data.request);
      }
    }
  });

  it('keeps constrained, loaded and non-free-motion states out of the empty-World gather forecast', () => {
    const mutate: Array<(f: ReturnType<typeof scene>) => SpacingContext> = [
      f => ({ now: f.data.at, constrained: new Set([f.a.body]) }),
      f => { f.a.engagement = {} as NonNullable<Agent['engagement']>; return { now: f.data.at }; },
      f => { f.a.body.support!.load = { x: 1, y: 0 }; return { now: f.data.at }; },
      f => { f.a.body.support!.lean = { x: 1, y: 0 }; return { now: f.data.at }; },
      f => { f.a.body.support!.strike = { x: .2, y: 0 }; return { now: f.data.at }; },
      f => { f.a.body.squeeze = .4; return { now: f.data.at }; },
      f => { f.data.request.squeeze = .4; return { now: f.data.at }; },
      f => { f.data.request.push = 1; return { now: f.data.at }; },
      f => { f.data.request.lunge = { x: .2, y: 0 }; return { now: f.data.at }; },
      f => { f.data.request.free = true; return { now: f.data.at }; },
      f => { f.data.request.dive = { x: 1, y: 0 }; return { now: f.data.at }; },
      f => { f.a.body.support!.state = 'down'; return { now: f.data.at }; },
    ];
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      for (const change of mutate) {
        const f = scene(1), context = change(f), before = structuredClone(f.a.body);
        expect(f.request(context).command).toEqual(f.data.request);
        expect(f.a.body).toEqual(before);
      }
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });
});
