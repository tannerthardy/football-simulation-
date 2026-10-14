#!/usr/bin/env python3
"""Build a standalone Ace film from saved packets; never import/run the engine.

Default inputs live in sibling diagnostic worktrees. Override their paths when
moving the saved evidence. --self-check checks extraction/provenance only.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import time


BASELINE = "4ded6b600fd3785e65034aa5623d7a9f8f3c5db1"
ISOLATED_SOURCE = "c6b2c179a896aa1c9593def9af01c4869306a63bba9196a04e450e53f55d1904"
IDS = ("uc12-wz-s3", "uc12-wz-s3-mirror", "uc12-wz-weak-s3")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def packet(path: Path) -> tuple[dict, dict]:
    raw = path.read_bytes()
    decoded = gzip.decompress(raw) if path.suffix == ".gz" else raw
    value = json.loads(decoded)
    return value, {"path": str(path.resolve()), "bytes": len(raw),
                   "sha256": sha(raw), "protocol": value.get("protocol"),
                   "producerCommit": value.get("commit", value.get("provenance", {}).get("commit")),
                   "producerSourceSha256": value.get("provenance", {}).get("sourceSha256"),
                   "producerProbeSha256": value.get("provenance", {}).get("probeSha256", value.get("collectorSha256", value.get("scriptSha256")))}


def vector(v: dict | None) -> list[float] | None:
    return None if v is None else [v["x"], v["y"]]


def body(v: dict, radius: float) -> dict:
    support = v.get("support", {})
    return {"p": vector(v["pos"]), "v": vector(v["vel"]), "f": v["facing"],
            "r": radius, "spin": v.get("spin"), "pose": support.get("state"),
            "posture": support.get("posture"), "energy": v.get("energy")}


def nearest_time(frame: dict) -> int:
    return round(frame["t"] * 1000)


def snap_jobs(panel: dict) -> dict:
    """Preserve declared jobs from the baseline, rather than infer proximity."""
    return {str(a["id"]): a["work"] for a in panel["frames"][0]["agents"] if a.get("work")}


def first_contact(panel: dict, slots: dict[int, str]) -> dict | None:
    if "firstContact" in panel:
        return panel["firstContact"]
    event = next((e for e in panel["events"] if e["type"] == "carrier_contact"), None)
    if event is None:
        return None
    return {"t": event["t"], "opponent": slots[event["b"]], "note": event.get("note"),
            "depth": event.get("pos", {}).get("x", 40) - 40,
            "depthSource": "event position; see original receipt for exact firstContactX"}


def extract(panel: dict, arm: str, players: list[dict], prefix: dict | None) -> dict:
    slots = {p["id"]: p["slot"] for p in players}
    radii = {p["id"]: p["profile"]["radius"] for p in players}
    raw_by_tick: dict[int, dict[int, dict]] = {}
    if prefix is not None:
        for write in prefix["writes"]:
            if "spaceTeammates" not in write.get("caller", ""):
                raw_by_tick.setdefault(nearest_time(write), {})[write["actor"]] = write
    frames = []
    for frame in panel["frames"]:
        physics = frame["worldInput"] if arm == "isolated" else frame["physicsInput"]
        before = physics["beforeBodies"]
        duration = frame["after"] - frame["t"]
        assert duration > 0
        agents = []
        for a in frame["agents"]:
            i = a["id"]
            after = a["body"] if arm == "isolated" else a
            item = {"id": i, **body(before[i], radii[i]),
                    "afterP": vector(after["pos"]), "afterV": vector(after["vel"]),
                    "afterF": after["facing"], "afterPose": after["support"]["state"],
                    "command": vector(a.get("requested", {}).get("vel")),
                    "delivered": vector(physics["intents"][i].get("vel")),
                    "achieved": [(after["pos"][axis] - before[i]["pos"][axis]) / duration for axis in ("x", "y")],
                    "tags": a.get("tags", []), "zone": a.get("zone"),
                    "fit": a.get("fit"), "read": a.get("read")}
            write = raw_by_tick.get(nearest_time(frame), {}).get(i)
            if write:
                item["raw"] = vector(write["intent"].get("vel"))
                item["rawCaller"] = write.get("caller", "").split(" (")[0].removeprefix("at ")
            agents.append(item)
        outputs = physics.get("jointOutputsAtWorldEnd", physics.get("jointOutputs", frame.get("jointOutputs", [])))
        inputs = physics["jointInputs"]
        # Outputs are the end of World.step, before later tackle events can
        # delete block joints. World sums impulses over substeps and divides
        # by dt: stored forces/moments are signed tick averages.
        joints = []
        for j in outputs:
            request = next((q for q in inputs if q["kind"] == j["kind"] and q["a"] == j["a"] and q["b"] == j["b"]), {})
            joints.append({k: j[k] for k in ("kind", "a", "b", "normalForce", "tangentForce", "forceOnB", "momentOnA", "momentOnB", "force") if k in j}
                          | {"actor": request.get("actor"), "push": request.get("push"),
                             "hold": request.get("hold"), "steer": request.get("steer"),
                             "extension": request.get("extension")})
        report = frame["report"] if arm == "isolated" else physics["report"]
        frames.append({"t": frame["t"], "after": frame["after"], "carrier": frame.get("carrier"),
                       "agents": agents, "joints": joints,
                       "collisions": report["contacts"], "blocks": frame.get("blocks"),
                       "hash": panel["hashes"][len(frames)],
                       "prefixRawAvailable": prefix is not None and len(frames) < len(prefix["frames"])})
    contact = first_contact(panel, slots)
    summary = []
    cutoff = contact["t"] if contact else panel["endTime"]
    for defender in (p for p in players if p["team"] == "D"):
        i = defender["id"]
        loaded = []
        acquisitions = []
        distances = []
        for f in frames:
            if f["t"] <= cutoff:
                rb, d = f["agents"][6], f["agents"][i]
                distances.append((math.dist(rb["p"], d["p"]), f["t"]))
            for j in f["joints"]:
                if j["kind"] == "hands" and i in (j["a"], j["b"]):
                    other = j["a"] if j["b"] == i else j["b"]
                    if players[other]["team"] == "O":
                        acquisitions.append((f["t"], slots[other]))
                        if abs(j.get("normalForce") or 0) + abs(j.get("tangentForce") or 0) > 1e-6:
                            loaded.append((f["t"], slots[other]))
        closest = min(distances) if distances else None
        summary.append({"id": i, "slot": slots[i],
                        "firstAcquiredJointOutput": list(acquisitions[0]) if acquisitions else None,
                        "firstLoadedHandOutput": list(loaded[0]) if loaded else None,
                        "loadedOpponents": sorted({o for _, o in loaded}),
                        "closestRBThroughFirstContact": {"distanceYd": closest[0], "t": closest[1]} if closest else None,
                        "firstCarrierContact": contact is not None and contact["opponent"] == slots[i]})
    crossing = panel.get("crossing")
    if arm == "baseline":
        crossing = next((f["after"] for f in frames if f["carrier"] == 6 and f["agents"][6]["afterP"][0] >= 40), None)
    return {"input": panel["input"], "arm": arm, "endTime": panel["endTime"],
            "outcome": panel["outcome"], "censored": panel.get("censored", panel.get("live", False)),
            "gain": panel["gain"], "crossing": crossing,
            "firstContact": contact, "observerNeutral": panel["observerNeutral"],
            "frames": frames, "events": panel["events"], "defenderAccess": summary}


HTML = r'''<!doctype html><html lang="en"><meta charset="utf-8">
<title>Saved Ace offensive-line film</title><style>
body{margin:20px;background:#10171c;color:#e1edf2;font:15px system-ui;max-width:1600px}a{color:#8bd5ff}button,select,input{font:inherit}button,select{padding:7px;background:#21323d;color:inherit;border:1px solid #58707d;border-radius:4px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.boards{display:grid;grid-template-columns:1fr 1fr;gap:16px}svg{width:100%;background:#153e30;border:1px solid #3b7363;max-height:610px}h1{font-size:24px}h2{font-size:17px}p{max-width:1150px;line-height:1.5}.muted{color:#a4bcc8}.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:14px}.line{display:inline-block;width:20px;border-top:3px solid}.tables{display:grid;grid-template-columns:1fr 1fr;gap:16px}table{border-collapse:collapse;font-size:12px;width:100%}td,th{border-bottom:1px solid #344752;padding:5px;text-align:left}pre{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;background:#19272f;padding:12px}details{margin:15px 0}.warning{padding:9px;background:#393120}.slot{cursor:pointer}#time{font-variant-numeric:tabular-nums;width:100px}.status{min-height:3.6em}@media(max-width:900px){.boards,.tables{grid-template-columns:1fr}}
</style><h1>Saved Ace offensive-line film</h1>
<p>Three declared under-center singleback controls, two attached tight ends. Historical baseline versus the isolated experimental hand law with legacy movement. Every frame is a saved native state; this viewer advances zero simulation ticks. The historical law and current <code>develop</code> remain separate.</p>
<p class="warning">“mirror” changes which tight end is on the playside; it is not a full geometric reflection. Both strong calls run rightward (decreasing field y). The weak call runs leftward against the same asymmetric Over front. No ending is an acceptance target.</p>
<div class="toolbar"><select id="case"></select><button id="play">Play</button><button id="back">− frame</button><button id="next">+ frame</button><input id="scrub" type="range" min="0" value="0" style="flex:1;min-width:250px"><span id="time"></span><select id="focus"></select><label><input id="zoom" type="checkbox" checked>Line view</label><label><input id="vectors" type="checkbox" checked>Vectors</label><label><input id="jobs" type="checkbox">Snap jobs</label><label><input id="forces" type="checkbox">Hand force</label></div>
<div class="legend"><span><i class="line" style="color:#9ecaff"></i> Stored movement command</span><span><i class="line" style="color:#e69fff"></i> Raw technique request (traced prefix)</span><span><i class="line" style="color:#ffe788"></i> World movement target</span><span><i class="line" style="color:#fff"></i> Achieved COM displacement / dt</span></div>
<p class="muted">Velocity arrows share a 0.35 s scale. Body circles use the saved radius; short rays show body facing, not gaze. Gray dashed links are acquired joints; orange loaded links carry nonzero average hand force, without certifying continuous contact or protection. Force arrows use a separate 0.001 scale (kg·yd/s²), averaged over the World interval, and start at the body glyph to show direction, not the physical application point; baseline packets do not serialize a force vector. Snap-job links are declared historical baseline responsibilities, not acquired contact or a live candidate assignment.</p>
<p class="muted">Timing: bodies are drawn at step entry t; post-step fields are at t+.05. Native runner-contact events use entry t although collision/grasp was resolved within [t,t+.05]; the displayed contact interval preserves that stamp. Native block-contact events explicitly stamp interval end t+.05. Neither stamp identifies a precise substep collision time. Closest-runner table measurements stop at contact interval entry, before its resolved contact movement.</p>
<div class="boards"><section><h2>Historical baseline <code>4ded6b6</code></h2><p id="status0" class="status"></p><svg id="field0"></svg></section><section><h2>Isolated hand law / legacy movement <code>c6b2c179…</code></h2><p id="status1" class="status"></p><svg id="field1"></svg></section></div>
<div class="tables"><div><h2>Selected body: baseline</h2><pre id="body0"></pre></div><div><h2>Selected body: isolated</h2><pre id="body1"></pre></div></div>
<details open><summary>Defender access through first runner contact</summary><p>“No loaded hands” does not mean “unassigned.” Loaded contacts may occur after the first contact; inspect the film at the relevant arrival. Closest distances are descriptive COM geometry, not lawful interception predictions.</p><div class="tables"><div id="access0"></div><div id="access1"></div></div></details>
<details><summary>Exact evidence pins, inputs, flags and limitations</summary><pre id="provenance"></pre></details>
<script id="film-data" type="application/json">__DATA__</script><script>
const D=JSON.parse(document.getElementById('film-data').textContent),$=id=>document.getElementById(id);
const option=(v,t)=>{const e=document.createElement('option');e.value=v;e.textContent=t;return e};
D.cases.forEach((c,i)=>$('case').append(option(i,c.id)));D.players.forEach(p=>$('focus').append(option(p.id,p.slot)));$('focus').value=2;
let playing=false,timer;const fnum=v=>v==null?'—':(+v).toFixed(3),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pos=(p)=>`${p[0]},${p[1]}`;
function arrow(p,v,color,scale=.35){if(!v)return '';const q=[p[0]+v[0]*scale,p[1]+v[1]*scale],angle=Math.atan2(q[1]-p[1],q[0]-p[0]),r=.16;return `<path d="M ${pos(p)} L ${pos(q)} M ${q[0]-r*Math.cos(angle-.5)},${q[1]-r*Math.sin(angle-.5)} L ${pos(q)} L ${q[0]-r*Math.cos(angle+.5)},${q[1]-r*Math.sin(angle+.5)}" fill="none" stroke="${color}" stroke-width=".045"/>`}
function draw(svg,film,index,caseData){const f=film.frames[Math.min(index,film.frames.length-1)],focus=+$('focus').value;svg.setAttribute('viewBox',$('zoom').checked?'33 15 18 27':'30 0 30 53.3333');let s='<g>';
for(let x=30;x<=60;x+=5)s+=`<path d="M${x},0 V53.3333" stroke="${x===40?'#8ff5de':'#517a68'}" stroke-width="${x===40?.12:.045}"/><text x="${x+.08}" y="15.4" font-size=".45" fill="#bcd9cc">${x===40?'LOS':x}</text>`;
const trail=film.frames.slice(0,Math.min(index+1,film.frames.length)).map(q=>pos(q.agents[focus].p)).join(' ');s+=`<polyline points="${trail}" fill="none" stroke="#bdefff" stroke-width=".07" opacity=".7"/>`;
if($('jobs').checked)for(const [a,j] of Object.entries(caseData.snapJobs)){const b=j.target?.agent;if(b!=null)s+=`<path d="M${pos(f.agents[+a].p)} L${pos(f.agents[b].p)}" stroke="#82acbe" stroke-width=".035" stroke-dasharray=".15 .13" opacity=".6"/>`;}
for(const j of f.joints){const loaded=Math.abs(j.normalForce||0)+Math.abs(j.tangentForce||0)>1e-6;s+=`<path d="M${pos(f.agents[j.a].p)} L${pos(f.agents[j.b].p)}" stroke="${j.kind==='hands'?(loaded?'#ff9d49':'#aaa'):'#fa6a8a'}" stroke-width="${loaded?.08:.04}" stroke-dasharray="${loaded?'0':'.14 .12'}"/>`;if($('forces').checked&&j.forceOnB)s+=arrow(f.agents[j.b].p,[j.forceOnB.x,j.forceOnB.y],'#ff9d49',.001);}
for(const a of f.agents){const p=D.players[a.id],fill=a.id===f.carrier?'#e9dc56':p.team==='O'?'#7ebcf3':'#f18183',facing=[Math.cos(a.f)*a.r*1.8,Math.sin(a.f)*a.r*1.8];s+=`<g class="slot" data-id="${a.id}"><circle cx="${a.p[0]}" cy="${a.p[1]}" r="${a.r}" fill="${fill}" stroke="${a.id===focus?'white':'#18271f'}" stroke-width="${a.id===focus?.10:.03}"/><path d="M${pos(a.p)} l${pos(facing)}" stroke="#15251d" stroke-width=".055"/><text x="${a.p[0]+a.r+.06}" y="${a.p[1]-.08}" font-size=".34" fill="#fff">${p.slot}</text></g>`;if($('vectors').checked&&a.id===focus){s+=arrow(a.p,a.command,'#9ecaff')+arrow(a.p,a.raw,'#e69fff')+arrow(a.p,a.delivered,'#ffe788')+arrow(a.p,a.achieved,'#fff');}}
svg.innerHTML=s+'</g>';svg.querySelectorAll('[data-id]').forEach(e=>e.onclick=()=>{$('focus').value=e.dataset.id;render()});return f;}
function accessTable(film){return '<table><thead><tr><th>Defender</th><th>First loaded hand</th><th>Loaded opponents</th><th>Closest RB before arrival</th></tr></thead><tbody>'+film.defenderAccess.map(a=>`<tr><td>${a.slot}${a.firstCarrierContact?' ★':''}</td><td>${a.firstLoadedHandOutput?`${fnum(a.firstLoadedHandOutput[0])} (${a.firstLoadedHandOutput[1]})`:'None in film'}</td><td>${a.loadedOpponents.join(', ')||'—'}</td><td>${fnum(a.closestRBThroughFirstContact?.distanceYd)} yd @ ${fnum(a.closestRBThroughFirstContact?.t)}</td></tr>`).join('')+'</tbody></table>'}
function render(){const c=D.cases[+$('case').value],i=+$('scrub').value,t=i*.05;$('scrub').max=Math.max(...c.films.map(f=>f.frames.length))-1;$('time').textContent=t.toFixed(2)+' s';c.films.forEach((film,n)=>{const f=draw($('field'+n),film,i,c),a=f.agents[+$('focus').value],p=D.players[a.id],contact=film.firstContact;const done=i>=film.frames.length;$('status'+n).textContent=`${done?'ENDED — ':''}${film.outcome} at ${film.endTime.toFixed(2)} s; ${fnum(film.gain)} yd. First contact: ${contact?contact.opponent+' '+contact.note+' in ['+contact.t.toFixed(2)+', '+(contact.t+.05).toFixed(2)+'] s':'none'}; ${film.censored?'censored':'natural ending'}. Frame [${f.t.toFixed(2)}, ${f.after.toFixed(2)}].`;$('body'+n).textContent=JSON.stringify({slot:p.slot,t:f.t,position:a.p,bodyFacingRad:a.f,bodyRadiusYd:a.r,physicalPosture:a.posture,energy:a.energy,momentumVelocityYdS:a.v,rawTechniqueRequestYdS:a.raw??'not captured',rawRequestCaller:a.rawCaller??null,storedMovementCommandYdS:a.command,worldTargetYdS:a.delivered,achievedAverageCOMVelocityYdS:a.achieved,postStepVelocityYdS:a.afterV,pose:a.pose,postStepPose:a.afterPose,zoneRead:a.zone,tags:a.tags,connectedJoints:f.joints.filter(j=>j.a===a.id||j.b===a.id)},null,2);$('access'+n).innerHTML=accessTable(film)});}
function stop(){playing=false;clearInterval(timer);$('play').textContent='Play'}
$('play').onclick=()=>{if(playing)return stop();playing=true;$('play').textContent='Pause';timer=setInterval(()=>{if(+$('scrub').value>=+$('scrub').max)return stop();$('scrub').value=+$('scrub').value+1;render()},100)};
$('case').onchange=()=>{stop();$('scrub').value=0;render()};['scrub','focus','zoom','vectors','jobs','forces'].forEach(id=>$(id).oninput=render);$('back').onclick=()=>{$('scrub').value=Math.max(0,+$('scrub').value-1);render()};$('next').onclick=()=>{$('scrub').value=Math.min(+$('scrub').max,+$('scrub').value+1);render()};$('provenance').textContent=JSON.stringify(D.provenance,null,2);render();
</script></html>'''


def main() -> None:
    repo = Path(__file__).resolve().parents[3]
    workspace = repo.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, default=workspace / "football-under-center-zone/out/under-center-zone/carrier-design.json.gz")
    parser.add_argument("--weak", type=Path, default=workspace / "football-under-center-zone/out/under-center-zone/carrier-design-weak.json.gz")
    parser.add_argument("--isolated", type=Path, default=workspace / "football-contact-law-isolation/out/contact-isolation/protection.json.gz")
    parser.add_argument("--delivery", type=Path, default=workspace / "football-protection-traces/out/ace-protection/delivery.json.gz")
    parser.add_argument("--receipt", type=Path, default=workspace / "football-protection-traces/docs/reviews/ace-protection-receipt.json")
    parser.add_argument("--out", type=Path, default=repo / "out/ol-technique")
    parser.add_argument("--self-check", action="store_true", help="Assert saved input/hash/geometry and HTML round-trip integrity; no engine tests")
    args = parser.parse_args()
    started = time.monotonic()
    packets, pins = {}, {}
    for name in ("baseline", "weak", "isolated", "delivery", "receipt"):
        packets[name], pins[name] = packet(getattr(args, name))
    base_rows = packets["baseline"]["panel"] + packets["weak"]["panel"]
    isolated = packets["isolated"]
    receipt = packets["receipt"]
    assert isolated["comparisonCommit"] == receipt["comparisonCommit"] == BASELINE
    assert receipt["historicalRuntimeSourceSha256"] == ISOLATED_SOURCE
    assert isolated["worldSelection"] == {"handContact": "patch", "groundMovement": "legacy", "controllerMovementPreview": "center"}
    assert packets["baseline"]["provenance"]["flags"] == packets["weak"]["provenance"]["flags"]
    # Receipt's 43 launch flags are the baseline profile; baseline observer
    # packets additionally serialize two explicit unset/off switches.
    for key, value in receipt["flags"].items():
        assert packets["baseline"]["provenance"]["flags"][key] == value, key
    assert pins["isolated"]["sha256"] == receipt["manifest"]["referenceRawSha256"]
    assert pins["delivery"]["sha256"] == receipt["rawSha256"]["out/ace-protection/delivery.json.gz"]
    players = base_rows[0]["players"]
    assert [p["id"] for p in players] == list(range(22))
    cases = []
    for case_id in IDS:
        b = next(p for p in base_rows if p["input"]["id"] == case_id)
        c = next(p for p in isolated["panel"] if p["input"]["id"] == case_id)
        d = next((p for p in packets["delivery"]["panel"] if p["input"]["id"] == case_id), None)
        assert b["input"] == c["input"]
        assert b["players"] == players
        assert b["initial"] == c["initial"]
        assert [p["profile"] for p in players] == c["profiles"]
        assert b["observerNeutral"] and c["observerNeutral"]
        assert b["hashes"][:8] == c["hashes"][:8], "Same history through .40 before first loaded-law change"
        if d:
            assert d["prefixExact"] and d["input"] == c["input"]
            assert d["hashes"] == c["hashes"][:len(d["hashes"])]
        cases.append({"id": case_id, "snapJobs": snap_jobs(b), "snapJobsScope": "Declared historical baseline at first frame, not live isolated candidate assignment", "films": [extract(b, "baseline", players, None), extract(c, "isolated", players, d)]})
    output = {"protocol": "ace-ol-offline-film-v1", "players": [{k: p[k] for k in ("id", "slot", "team", "player", "profile")} for p in players], "cases": cases,
              "provenance": {"generatorSha256": sha(Path(__file__).read_bytes()), "baselineComparisonCommit": BASELINE,
                             "baselineCompatibilityEvidence": "PR11/PR17 saved receipts compare complete historical baseline state/RNG histories; observer source differs from 4ded6b6",
                             "isolatedSourceSha256": ISOLATED_SOURCE, "isolatedPublicationCommit": receipt["manifest"]["candidateCommit"],
                             "currentDevelopTested": False, "inputs": [c["films"][0]["input"] for c in cases],
                             "baselinePacketFlags": packets["baseline"]["provenance"]["flags"], "launchFlags": receipt["flags"],
                             "worldSelection": isolated["worldSelection"], "inputFiles": pins,
                             "semantics": {"time": "Bodies drawn before World.step at t; after fields at t+.05. Ending/event may follow physics.",
                                           "storedCommand": "sim.cmds movement command; engagement can replace intent afterward. Not a complete raw contact-technique request.",
                                           "raw": "Last native intents assignment before teammate spacing, from neutral delivery collector, two prefixes only through t2.40.",
                                           "delivered": "Final movement target supplied to World.step; requested velocity, not achieved velocity.",
                                           "achieved": "Actual COM position change / dt including motor, contact and numerical execution; not an unloaded capability forecast.",
                                           "force": "World accumulates signed substep impulses/moments and divides by dt: normal/tangent, forceOnB and moments are tick averages in kg*yd/s² and kg*yd²/s². Not certified continuous attachments or wins. Arrow starts at glyph for direction, not physical application point.",
                                           "eventTime": "Carrier contact stamp is entry t of resolved World interval[t,t+.05], based on after-step body; block_contact explicitly stamps t+.05. No precise substep impact time inferred.",
                                           "radius": "Body disk radius in yards; attachment/contact reach differs.",
                                           "facing": "Body orientation, not gaze or a proof of information acquisition.",
                                           "snapJobs": "Saved declared historical baseline responsibility; candidate live state is not inferred from proximity.",
                                           "defenderAccess": "First nonzero final hand output in entire film keyed by interval entry t, loaded partners in entire film, closest pre-step COM range to RB through first contact interval entry. No assignment/win classification inferred."},
                             "limitations": ["Zero engine ticks; no current develop replay or controller candidate.", "Contact-retention contract remains physics-owner review dependency.", "No anatomical foot placement, gaze, or private live assignments in film packets.", "Snapshots do not establish achievable interception, lane protection, defensive legitimacy, or ending convergence.", "Legacy mirror is a TE placement contrast, weak call uses asymmetric Over front."]}}
    compact = json.dumps(output, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    html = HTML.replace("__DATA__", compact.replace("<", "\\u003c"))
    if args.self_check:
        for case in cases:
            for film in case["films"]:
                assert not film["censored"] and film["outcome"] == "tackle"
                assert abs(film["frames"][-1]["after"] - film["endTime"]) < 1e-8
                assert all(len(f["agents"]) == 22 and [a["id"] for a in f["agents"]] == list(range(22)) for f in film["frames"])
                for f in film["frames"]:
                    for a in f["agents"]:
                        dt = f["after"] - f["t"]
                        assert all(abs(a["p"][k] + dt*a["achieved"][k] - a["afterP"][k]) < 1e-12 for k in (0, 1))
        embedded = html.split('<script id="film-data" type="application/json">', 1)[1].split('</script>', 1)[0]
        assert json.loads(embedded) == output
        weak = cases[-1]["films"][1]
        assert weak["firstContact"]["opponent"] == "LB_M" and weak["crossing"] == 2.4
        assert weak["gain"] == next(p for p in isolated["panel"] if p["input"]["id"] == IDS[-1])["gain"]
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "film.json").write_text(compact + "\n")
    (args.out / "film.html").write_text(html)
    print(json.dumps({"protocol": output["protocol"], "generatorSha256": output["provenance"]["generatorSha256"],
                      "cases": len(cases), "savedFrames": sum(len(f["frames"]) for c in cases for f in c["films"]),
                      "worldTicksExecuted": 0, "selfCheck": args.self_check,
                      "elapsedSeconds": time.monotonic() - started,
                      "html": str((args.out / "film.html").resolve()), "jsonSha256": sha(compact.encode())}))


if __name__ == "__main__":
    main()
