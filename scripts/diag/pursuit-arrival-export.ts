/** Adapt this bounded experiment to Measurin's existing movement-window panel.
 * These are isolated responses, not controller replays of the whole snap. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { arrivalJson, compareBundle, parseArrivalJson, type ArrivalBundle, type TrialRow } from './pursuit-arrival.js';

export function movementPanel(bundle: ArrivalBundle, result: ReturnType<typeof compareBundle>) {
  const arms = ['held-original', 'held-candidate', 'seek-candidate', 'seek-estimator-effort'];
  const cases: any[] = [], trials: any[] = [];
  const snapshot = (row: TrialRow) => ({ body: { position: row.body.pos, velocity: row.body.vel,
    facing: row.body.facing, energy: row.body.energy, spin: row.body.spin,
    support: row.body.support ? { state: row.body.support.state, deviation: row.body.support.xi, lean: row.body.support.lean } : null },
    engagement: null, tackleBond: null, lastStepContacts: [] }); // exactly one isolated body, no joints
  for (const c of bundle.cases) {
    const ts = [...result.trials, ...result.effortTrials].filter(t => t.caseId === c.id);
    const armFor = (t: typeof ts[number]) => t.requestEnvelope.mode === 'estimator-full-effort' ? 'seek-estimator-effort' : t.policy;
    const groups = [...new Set(ts.map(t => `${t.objective.id}:${t.shifted ? 'shifted' : 'sampled'}`))];
    for (const group of groups) {
      const selected = ts.filter(t => `${t.objective.id}:${t.shifted ? 'shifted' : 'sampled'}` === group);
      const example = selected[0], objective = example.objective;
      const id = `${c.id}:${group}`;
      cases.push({ id, category: c.source.kind === 'synthetic' ? c.id : c.intercept ? 'native-frozen-free-response' : 'native-close-gather-control',
        actor: c.actor, window: [c.clock, c.clock + objective.horizon], inputSha256: c.source.setupSha256,
        source: { ...c.source, bodySha256: c.bodySha256, experiment: 'isolated-response-not-a-full-play-counterfactual' },
        desiredDirection: { vector: { x: objective.point.x - example.rows[0].body.pos.x,
          y: objective.point.y - example.rows[0].body.pos.y }, source: 'Frozen sampled forecast objective, not recorded future runner' },
        objective: { point: objective.point, at: c.clock + objective.horizon,
          source: `${objective.information}; ${objective.horizon}s relative to ${c.clock}s live step-start; radius=${objective.radius}yd` },
        inactiveArms: c.intercept ? [] : arms.slice(1), inactiveReason: c.intercept ? null : 'planner-bypassed-close-gather' });
      for (const arm of arms) {
        const t = selected.find(t => armFor(t) === arm)
          ?? (arm === 'held-original' ? ts.find(t => t.policy === arm && t.objective.id === objective.id) : undefined);
        if (!t) continue; // intentionally inactive, retained as missing in panel exposure
        const trace = { version: 1, meta: { ...result.execution, input: { kind: 'isolated-frozen-arrival',
          case: c.id, original: c.source, bodySha256: c.bodySha256 }, selection: { actor: c.actor, from: c.clock, to: c.clock + objective.horizon } },
          verification: { setupSha256: c.source.setupSha256, nativeCaptureReplay: c.source.kind === 'native' ? 'exact-at-freeze' : 'not-applicable',
            wholePlayCounterfactual: 'not-performed', firstNativeStepDifference: t.firstNativeStepDifference,
            heldCommandPreviewDifference: t.heldCommandPreviewDifference },
          requestEnvelope: t.requestEnvelope,
          steps: t.rows.slice(0, -1).map((row, k) => ({ stepStart: row.t, endpointTime: t.rows[k + 1].t, actor: c.actor,
            start: snapshot(row), endpoint: snapshot(t.rows[k + 1]),
            decision: { evaluated: false, owner: { controller: 'OfflineArrivalExperiment', kind: arm }, raw: t.rows[k + 1].command },
            rewrites: [], final: t.rows[k + 1].command,
            prediction: k === 0 ? c.intercept?.prediction ?? { status: 'bypassed-close-gather' } : { status: 'not-reevaluated-held-experiment' } })) };
        trials.push({ caseId: id, arm, inputSha256: c.source.setupSha256, trace });
      }
    }
  }
  const selection = { schema: 'movement-window-panel-v1', selection: 'TKL-2 frozen inputs; isolated held vs fixed-goal seek responses; no production policy intervention',
    arms, cases };
  const bytes = JSON.stringify(selection, null, 2) + '\n';
  return { selection: bytes, trials: { inputSha256: createHash('sha256').update(bytes).digest('hex'), trials },
    recordedPairTrials: result.recordedPairTrials,
    manifest: { schema: 'pursuit-arrival-manifest-v1', fixtureSha256: result.fixtureSha256, execution: result.execution,
      operatorSha256: result.operatorSha256, worldSourceSha256: result.worldSourceSha256,
      recordedPairFile: 'recorded-pair-trials.json',
      recordedPairCases: result.recordedPairTrials.map(p => ({ caseId: p.trial.caseId, sourceDecision: p.sourceDecision,
        cueAvailableAtBodyClock: p.cueAvailableAtBodyClock, objectiveAbsoluteTime: p.objectiveAbsoluteTime,
        policy: p.trial.policy, objective: p.trial.objective, bodyClock: p.trial.clocks.start })),
      limitations: ['single-body unloaded response, not an optimal reachable set', 'future runner diagnostic only, no counterfactual runner reaction',
        'body facing is not travel or gaze', '50ms sampled radius entry, not a contact/grip guarantee',
        'native whole-play equality checked during freeze; isolated panel verification is distinct',
        'close-gather alternative arms intentionally inactive; missing panel rows are retained'],
      cases: cases.map(({ id, actor, window, source, objective, inactiveArms }) => ({ id, actor, window, source, objective, inactiveArms })) } };
}

function main() {
  const { values: v } = parseArgs({ options: { input: { type: 'string' }, results: { type: 'string' },
    out: { type: 'string', default: 'out/arrival/panel' } } });
  if (!v.input || !v.results) throw new Error('Use --input frozen.json --results comparison.json [--out DIRECTORY]');
  const output = movementPanel(parseArrivalJson(readFileSync(v.input, 'utf8')), parseArrivalJson(readFileSync(v.results, 'utf8')));
  mkdirSync(v.out!, { recursive: true });
  writeFileSync(`${v.out}/selection.json`, output.selection);
  writeFileSync(`${v.out}/trials.json`, JSON.stringify(output.trials) + '\n');
  writeFileSync(`${v.out}/manifest.json`, JSON.stringify(output.manifest, null, 2) + '\n');
  writeFileSync(`${v.out}/recorded-pair-trials.json`, arrivalJson(output.recordedPairTrials));
  console.log(`Panel input (${output.trials.trials.length} trials): ${v.out}; native vs isolated verification remain distinct.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
