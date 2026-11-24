/**
 * Type-aware scan for decision code reading another player's true state.
 *
 * A player decides from what he has perceived (`sim.see`, delayed and dead-reckoned), his own
 * body, and what he was told before the snap. Reading another Agent's body, velocity, facing,
 * engagement, intent or recognition directly, or the play's private clocks and tallies on
 * `sim`, is information he does not have. The scan reports every such read by file and line.
 *
 *   node --import tsx scripts/diag/information-guard-scan.ts [--list]
 *
 * Rule `agent`: a property of an `Agent`-typed expression that is not the acting agent. The
 *   actor is the enclosing function's first Agent-typed parameter, or `a`, `this.agent`.
 * Rule `sim`:   a play-truth property of a `PlaySim`-typed expression.
 * Rule `behavior`: a member of ANOTHER player's behaviour object (a class that `implements Behavior`: `RouteRunner.breakTime`, the receiver's private start delay and
 *   true stem speed) read from a file other than the class's own. Reaching into another agent's behaviour instance is a true-state read by construction. The member is
 *   reported as `Class.member`; the members of the `Behavior` interface itself (`kind`, `command`) are the published surface and are not.
 * Perceived values (`Perceived` from `sim.see`) are not Agents and are never reported.
 */
import { relative, resolve } from 'node:path';
import ts from 'typescript';

/** True state of another player. Reading it skips perception. */
export const AGENT_HIDDEN = new Set([
  'pos', 'vel', 'facing', 'speed', 'body', 'engagement', 'isDown', 'timeUntilUp', 'runFit', 'passSet', 'recog', 'eyes',
  'behavior', 'readAt', 'snapReadyAt', 'shedBy', 'downUntil', 'nextTackleAt', 'noCatchUntil', 'missedTackles', 'speedScale',
  'keyStep', 'mind',
]);

/** The play's private state: who holds the ball, its true path, clocks, and tallies. */
export const SIM_TRUTH = new Set([
  'ball', 'ballPath', 'carrier', 'scrambled', 'scrambleDrill', 'catchAt', 'handoffAt', 'throwAt', 'catchX', 'crossedLOS',
  'stats', 'engagements', 'bond', 'intents', 'endSpot', 'outcome', 'possession', 'firstContactX', 'deliveryAt', 'touchedAt',
  'lastStep', 'scoreKind', 'segments', 'presentedFakeRunners', 'windupAt', 'windupEndAt', 'qbEyes',
]);

/**
 * Files where reading true state is the job: the referee, the physics that resolves contact, the
 * play's owner and recording. Everything else under src/sim is decision code.
 */
export const EXEMPT: Record<string, string> = {
  'src/sim/playsim.ts': 'owner of the state',
  'src/sim/telemetry.ts': 'recording',
  'src/sim/command-trace.ts': 'recording',
  'src/sim/responsibility-ledger.ts': 'recording',
  'src/sim/responsibility-views.ts': 'recording',
  'src/sim/run-contact-observer.ts': 'recording',
  'src/sim/run-read-observer.ts': 'recording',
  'src/sim/counterfactual.ts': 'analysis',
  'src/sim/types.ts': 'declarations',
  'src/sim/agent.ts': 'declares the state',
  'src/sim/ball-estimate.ts': 'perception producer: turns the true ball into each player\'s own delayed, noisy estimate (BALL_EST samples the ball as it was one perception delay ago); consumers read the estimate, never the ball',
};

/**
 * Referee and contact-resolution files may read bodies, positions and contact (that is what
 * resolving a contact is) but not a player's intent or belief: only those members are scanned.
 */
export const PHYSICS: Record<string, string> = {
  'src/sim/tackle.ts': 'referee and contact resolution',
  'src/sim/contact-legality.ts': 'referee',
  'src/sim/contact-holding.ts': 'referee',
  'src/sim/pass-interference.ts': 'referee',
  'src/sim/pass-legality.ts': 'referee',
  'src/sim/team-contact-rules.ts': 'referee',
  'src/sim/catching.ts': 'catch resolution (hands meet ball)',
  'src/sim/engagement.ts': 'hand-fight and block-lifecycle physics',
};
/**
 * Rule `capacity` (believed body, Flex 2026-11-24; docs/reviews/2026-11-24-believed-body.md): another player's true physical
 * capacity, `other.profile.<capacity>`, or his whole profile escaping (passed on, returned, assigned or aliased). A player knows another man's
 * capacities only as he believes them (build, film, what he saw or felt); his visible build (mass, height, radius, reach) is
 * not reported. Referee and contact-resolution files may read capacities (resolving a contact is their job).
 */
export const CAPACITY = new Set(['vmax', 'tau', 'brake', 'lateral', 'power', 'press', 'turnRate', 'backpedal', 'shuffle', 'balance', 'bend',
  'stepSpeed', 'getUp', 'reactionTime', 'maxCatchHeight', 'reactReach']);
/** A man's build as seen (size, height, arm length): visible, not a hidden capacity. His catch heights are not: they carry his
 * vertical jump (height x 1.33 + vertical; the outside audit, 2026-11-24, row 3). */
export const VISIBLE_BUILD = new Set(['massKg', 'heightYd', 'radius', 'reach']);
export const INTENT = new Set(['behavior', 'passSet', 'runFit', 'recog', 'mind', 'eyes', 'keyStep', 'readAt', 'snapReadyAt', 'shedBy']);

/** The files that own a published field: its own record may read it (the passer's windup and eyes are qb.ts's). */
export const SIM_OWNERS: Record<string, string[]> = {
  windupAt: ['src/sim/behaviors/qb.ts'],
  windupEndAt: ['src/sim/behaviors/qb.ts'],
  qbEyes: ['src/sim/behaviors/qb.ts'],
};

export interface Read { file: string; line: number; rule: 'agent' | 'sim' | 'behavior' | 'capacity'; member: string; receiver: string; text: string }

/** The actor rule that counts a method's first Agent parameter as another player (default on; STRICT_ACTOR=0 is the 2026-11-13 rule). */
export const STRICT_ACTOR = process.env.STRICT_ACTOR !== '0';
const isAgentType = (t: ts.Type, name: string) => (t.symbol?.name ?? t.aliasSymbol?.name) === name;

export function scan(root: string): Read[] {
  const cfg = ts.readConfigFile(resolve(root, 'tsconfig.json'), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(cfg.config, ts.sys, root);
  const files = parsed.fileNames.filter(f => /\/src\/sim\/.*\.ts$/.test(f));
  const program = ts.createProgram(parsed.fileNames.filter(f => /\/src\//.test(f)), parsed.options);
  const checker = program.getTypeChecker();
  const out: Read[] = [];
  // Behaviour classes (`implements Behavior`), by name, with the file that owns them.
  const behaviorClass = new Map<string, string>();
  for (const f of program.getSourceFiles()) {
    if (!/\/src\//.test(f.fileName)) continue;
    ts.forEachChild(f, function find(n) {
      if (ts.isClassDeclaration(n) && n.name && n.heritageClauses?.some(h => h.token === ts.SyntaxKind.ImplementsKeyword && h.types.some(t => t.expression.getText(f) === 'Behavior')))
        behaviorClass.set(n.name.text, relative(root, f.fileName).split('\\').join('/'));
      ts.forEachChild(n, find);
    });
  }
  const BEHAVIOR_PUBLIC = new Set(['kind', 'command']);
  for (const path of files) {
    const rel = relative(root, path).split('\\').join('/');
    if (rel in EXEMPT) continue;
    const physics = rel in PHYSICS;
    const sf = program.getSourceFile(path);
    if (!sf) continue;
    const actors: Array<Set<string>> = [];
    const visit = (n: ts.Node) => {
      const isFn = ts.isFunctionLike(n) && 'parameters' in n;
      if (isFn) {
        const names = new Set<string>(['a', 'this', 'this.agent']);
        const first = (n as ts.SignatureDeclaration).parameters.find(p => ts.isIdentifier(p.name) && isAgentType(checker.getTypeAtLocation(p), 'Agent'));
        // The actor is the behaviour's owner. Inside a method of a class, `this` is the owner and an Agent parameter that is not `a` is another player (`ready(r: Agent, sim)`
        // reads the receiver r, it is not r's decision); only in a free function is the first Agent parameter the actor by convention (`(d: Agent, ...)`).
        let inClass = false; for (let up: ts.Node | undefined = n.parent; up; up = up.parent) if (ts.isClassLike(up)) { inClass = true; break; }
        if (first && ts.isIdentifier(first.name) && !(STRICT_ACTOR && inClass)) names.add(first.name.text);
        actors.push(names);
      }
      if (ts.isPropertyAccessExpression(n)) {
        const t = checker.getTypeAtLocation(n.expression);
        const member = n.name.text;
        const decl = checker.getSymbolAtLocation(n.name)?.declarations?.[0]?.parent;
        const declaredOn = decl && ts.isClassDeclaration(decl) ? decl.name?.text : undefined;
        const receiver = n.expression.getText(sf);
        const where = sf.getLineAndCharacterOfPosition(n.name.getStart(sf)).line + 1;
        const text = n.parent.getText(sf).split('\n')[0]!.slice(0, 110);
        const cls = t.symbol?.name;
        // Rule `capacity`: `X.profile.<capacity>` or `X.profile` passed on whole, X another player's Agent.
        const profileOf = (e: ts.Expression): string | null => ts.isPropertyAccessExpression(e) && e.name.text === 'profile'
          && isAgentType(checker.getTypeAtLocation(e.expression), 'Agent') ? e.expression.getText(sf) : null;
        const capOwner = CAPACITY.has(member) ? profileOf(n.expression) : null;
        // The whole profile escaping (passed, returned, assigned, aliased): any `X.profile` not read for one member here. A
        // capacity member is reported above; a visible-build member (his size, seen) is not a read of hidden capacity.
        const next = ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n ? n.parent.name.text : null;
        const wholeOwner = member === 'profile' && (next === null || (!CAPACITY.has(next) && !VISIBLE_BUILD.has(next))) ? profileOf(n) : null;
        if ((capOwner || wholeOwner) && !physics && !(actors[actors.length - 1] ?? new Set(['a'])).has((capOwner ?? wholeOwner)!)) {
          out.push({ file: rel, line: where, rule: 'capacity', member: capOwner ? `profile.${member}` : 'profile', receiver: (capOwner ?? wholeOwner)!, text });
        }
        if (cls && behaviorClass.has(cls) && behaviorClass.get(cls) !== rel && !BEHAVIOR_PUBLIC.has(member) && receiver !== 'this' && !receiver.startsWith('this.') && !physics) {
          out.push({ file: rel, line: where, rule: 'behavior', member: `${cls}.${member}`, receiver, text });
        } else if (AGENT_HIDDEN.has(member) && (isAgentType(t, 'Agent') || declaredOn === 'Agent')) {
          const mine = actors[actors.length - 1] ?? new Set(['a']);
          if (!mine.has(receiver) && (!physics || INTENT.has(member))) out.push({ file: rel, line: where, rule: 'agent', member, receiver, text });
        } else if (SIM_TRUTH.has(member) && (isAgentType(t, 'PlaySim') || declaredOn === 'PlaySim') && !physics && !SIM_OWNERS[member]?.includes(rel)) {
          out.push({ file: rel, line: where, rule: 'sim', member, receiver, text });
        }
      }
      ts.forEachChild(n, visit);
      if (isFn) actors.pop();
    };
    visit(sf);
  }
  return out;
}

const WHY: Record<string, string> = {
  'agent.pos': "another player's true position; read it through sim.see(a, other)",
  'agent.vel': "another player's true velocity; read it through sim.see(a, other)",
  'agent.facing': "another player's true facing; body facing is not gaze",
  'agent.body': "another player's true body state",
  'agent.speed': "another player's true speed",
  'agent.engagement': 'whether another player is engaged and with whom; he sees contact only through his own pictures',
  'agent.isDown': "another player's true off-feet state; sim.see(...).pose is the delayed cue",
  'agent.timeUntilUp': "another player's true recovery time",
  'agent.speedScale': "another player's true fatigue; a defender sees a fade, not the tank",
  'agent.behavior': "another player's assignment or intent, which is private until he shows it",
  'agent.passSet': "another blocker's true pass-set state",
  'agent.runFit': "another defender's true run-fit job",
  'agent.recog': "another player's true run/pass belief",
  'agent.mind': "another player's private decision state",
  'agent.eyes': "another player's true gaze keys",
  'agent.downUntil': 'scenario parking time',
  'sim.ball': 'the true ball state and flight; the ball is seen in flight, delayed, through possession-read and ball-tracking',
  'sim.ballPath': "the ball's true future path; a defender estimates it from what he saw of the throw",
  'sim.carrier': 'the true holder',
  'sim.scrambled': "the play's private scramble flag",
  'sim.bond': 'the true tackle bond',
  'sim.stats': "the play's private tally",
  'sim.deliveryAt': "the passer's private release clock",
  'sim.handoffAt': "the play's private handoff clock",
  'sim.engagements': 'the true engagement list',
  'sim.scrambleDrill': 'a scenario flag',
};
const OWNER = (file: string): string => {
  if (/contact-|pass-interference|pass-legality|team-contact/.test(file)) return 'Rules+Coaching';
  if (/engagement\.ts/.test(file)) return 'Flex';
  if (/tackle\.ts/.test(file)) return 'Defense';
  if (/catching\.ts/.test(file)) return 'Coverage';
  if (/behaviors\/defense\.ts|run-fits|run-read|breakdown/.test(file)) return 'Defense';
  if (/behaviors\/carrier\.ts/.test(file)) return 'Run Game';
  if (/behaviors\/receiver\.ts/.test(file)) return 'Rules+Coaching';
  if (/behaviors\/common\.ts/.test(file)) return 'Defense';
  if (/\/assign\.ts/.test(file)) return 'Flex';
  if (/\/coverage\/|coverage-|catch-|possession-read|throw-sight|open-to-ball|called-drop/.test(file)) return 'Coverage';
  if (/behaviors\/qb\.ts|qbmind/.test(file)) return 'QB';
  if (/blocking|screen|space-block|block-look|snap-count|motion\.ts|screen-spot/.test(file)) return 'Flex';
  return 'Integration';
};

export function emitAllowlist(reads: Read[], since: string): string {
  const by = new Map<string, Read[]>();
  for (const r of reads) by.set(`${r.file} ${r.rule}.${r.member}`, [...(by.get(`${r.file} ${r.rule}.${r.member}`) ?? []), r]);
  const rows = [...by].sort().map(([k, v]) => {
    const [file, key] = k.split(' ');
    return `  { file: '${file}', key: '${key}', reads: ${v.length}, class: 'unreviewed', owner: '${OWNER(file!)}', since: '${since}', why: ${JSON.stringify(WHY[key!] ?? 'true state')} },`;
  });
  return rows.join('\n');
}

export function emitMarkdown(reads: Read[], since: string, classOf: (file: string, key: string) => string = () => 'unreviewed'): string {
  const owners = new Map<string, Map<string, Read[]>>();
  for (const r of reads) {
    const o = OWNER(r.file);
    const m = owners.get(o) ?? new Map<string, Read[]>();
    m.set(r.file, [...(m.get(r.file) ?? []), r]);
    owners.set(o, m);
  }
  const out = [`# Reads of true state in decision code (${since})`, '',
    `Generated by \`node --import tsx scripts/diag/information-guard-scan.ts --markdown ${since}\`. ${reads.length} reads in ${new Set(reads.map(r => r.file)).size} files. Each is information the player does not have; the guard test (\`test/decision-information-scan.test.ts\`) holds the counts. Lines go stale as files change: rerun the command.`, ''];
  for (const [owner, files] of [...owners].sort()) {
    const n = [...files.values()].reduce((s, v) => s + v.length, 0);
    out.push(`## ${owner} (${n} reads)`, '');
    for (const [file, rs] of [...files].sort()) {
      out.push(`- \`${file}\``);
      const byKey = new Map<string, Read[]>();
      for (const r of rs) byKey.set(`${r.rule}.${r.member}`, [...(byKey.get(`${r.rule}.${r.member}`) ?? []), r]);
      for (const [k, v] of [...byKey].sort()) out.push(`  - \`${k}\` [${classOf(file, k)}] x${v.length}: ${v.map(r => r.line).join(', ')}`);
    }
    out.push('');
  }
  out.push('## Known holes (leaks this scan cannot see)', '',
    '- A helper that takes an Agent and returns a plain number reads true state out of sight of the caller; only the helper body is scanned.',
    '- (Fixed 2026-11-15) The actor used to be the enclosing function\'s first Agent parameter, which hid `r.*` in `ready(r: Agent, sim)`; inside a class the owner is `this`/`a` and an Agent parameter is another player. Members of another player\'s behaviour object are rule `behavior`.',
    '- Referee and contact files are scanned for intent and belief only, so decisions that sit inside them (the QB escape check `seesIt` in tackle.ts, the engaged rusher\'s aim at the true QB in engagement.ts) are in `docs/reviews/2026-11-13-information-leak-sweep.md` (#691) and not here.', '');
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(new URL('../..', import.meta.url).pathname);
  const reads = scan(root);
  const by = new Map<string, number>();
  for (const r of reads) by.set(`${r.file} ${r.rule}.${r.member}`, (by.get(`${r.file} ${r.rule}.${r.member}`) ?? 0) + 1);
  if (process.argv.includes('--markdown')) {
    const { INFORMATION_DEBT } = await import('../../test/information-guard-allowlist.js');
    const cls = new Map<string, string>();
    for (const d of INFORMATION_DEBT) cls.set(`${d.file} ${d.key}`, [...new Set([...(cls.get(`${d.file} ${d.key}`)?.split('+') ?? []), d.class])].join('+'));
    console.log(emitMarkdown(reads, process.argv[process.argv.indexOf('--markdown') + 1] ?? '2026-11-13', (f, k) => cls.get(`${f} ${k}`) ?? 'unlisted'));
    process.exit(0);
  }
  if (process.argv.includes('--emit')) { console.log(emitAllowlist(reads, process.argv[process.argv.indexOf('--emit') + 1] ?? '2026-11-13')); process.exit(0); }
  if (process.argv.includes('--list')) for (const r of reads) console.log(`${r.file}:${r.line} ${r.rule}.${r.member} <- ${r.receiver} | ${r.text}`);
  else for (const [k, v] of [...by].sort()) console.log(v, k);
  const files = new Set(reads.map(r => r.file));
  console.log(`${reads.length} reads in ${files.size} files`);
}
