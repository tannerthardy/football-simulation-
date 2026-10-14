#!/usr/bin/env python3
"""Package three saved RT continuations in one offline viewer; zero engine calls.

Only the ten common World intervals [2.20,2.70] are displayed. Intervention
records and complete counterfactual summaries remain contextual evidence.
"""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
import time


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    path = Path(path)
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == ".gz" else raw), {
        "path": str(path.resolve()), "sha256": sha(raw), "bytes": len(raw)}


def command(c):
    return None if c is None else {k: c[k] for k in ("vel", "facing", "posture", "push", "cutSkill", "squeeze") if k in c}


def body(b):
    return {"pos": b["pos"], "vel": b["vel"], "facing": b["facing"],
            "radius": b["profile"]["radius"], "massKg": b["profile"]["massKg"],
            "support": b.get("support", {}).get("state"),
            "posture": b.get("support", {}).get("posture"), "energy": b.get("energy")}


def matches_t(row, t):
    return abs(row["t"] - t) < 1e-8


def frame(packet, saved):
    t, dt = saved["t"], saved["dt"]
    movements = [p for p in packet["phases"] if matches_t(p, t) and p["phase"] == "movement"
                 and p["rep"]["blocker"].get("agent") == 2 and p["rep"]["defender"].get("agent") == 12]
    assert len(movements) == 1, (t, len(movements))
    technique = movements[0]["data"]
    rb_records = [r for r in packet["reads"] if matches_t(r, t) and r.get("phase") == "command" and r.get("actor") == 6]
    if rb_records:
        assert rb_records[-1]["vel"] == saved["requested"][6]["vel"]
    acquired = []
    seen_keys = {}
    for p in packet["pictures"]:
        if not matches_t(p, t) or not ((p["actor"] == 6 and p["target"] in (2, 5, 12, 13))
                                     or (p["actor"] == 2 and p["target"] in (6, 12))):
            continue
        key = json.dumps([p["actor"], p["target"], p["seen"]], sort_keys=True)
        if key not in seen_keys:
            seen_keys[key] = {"actor": p["actor"], "target": p["target"], "seen": p["seen"], "calls": 0}
            acquired.append(seen_keys[key])
        seen_keys[key]["calls"] += 1
    hands = [{k: j[k] for k in ("a", "b", "actor", "normalForce", "tangentForce", "extension", "push", "hold", "steer") if k in j}
             for j in saved["jointOutputs"] if j["kind"] == "hands"]
    collisions = saved["report"]["contacts"]
    after = saved["after"]
    events = [e for e in packet["events"] if abs(e["t"] - (after if e["type"] == "block_contact" else t)) < 1e-8]
    return {"t": t, "after": after, "dt": dt,
            "before": [body(b) for b in saved["beforeBodies"]],
            "afterBodies": [body(b) for b in saved["afterBodies"]],
            "stored": [command(c) for c in saved["requested"]],
            "world": [command(c) for c in saved["intents"]],
            "achieved": [{axis: (a["pos"][axis] - b["pos"][axis]) / dt for axis in ("x", "y")}
                         for b, a in zip(saved["beforeBodies"], saved["afterBodies"])],
            "rtRaw": command(technique["command"]),
            "rtRead": saved["behavior"][2].get("zoneRead"),
            "rtMovementContext": {k: technique[k] for k in ("anchored", "preAnchor", "feltCue", "lateral", "forward", "reading", "declared", "heldFlow") if k in technique},
            "intervention": next((a for a in packet.get("actions", []) if matches_t(a, t)), None),
            "hands": hands, "collisions": collisions, "pictures": acquired,
            "events": events, "workResidual": saved["report"]["work"]["residual"]}


HTML = r'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RT recovery counterfactual · saved film</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#101923;color:#edf3f8;font:15px/1.5 system-ui,sans-serif}main{max-width:1660px;margin:auto;padding:20px}h1{font-size:25px;margin:0 0 8px}h2{font-size:17px;margin:0 0 7px}h3{font-size:15px}p{margin:8px 0}.muted{color:#b4c4d1}.callout{border-left:3px solid #ffc16b;padding:8px 14px;background:#23303b}.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px;background:#182532;border:1px solid #33465a;border-radius:8px}button,select{font:inherit;background:#26394b;color:inherit;border:1px solid #6a7f92;border-radius:5px;padding:7px;cursor:pointer}input[type=range]{accent-color:#95ef9d;flex:1;min-width:200px}label{display:flex;align-items:center;gap:5px}.panes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:15px}.pane{background:#182532;border:1px solid #33465a;border-radius:8px;padding:12px;min-width:0}.scene svg{width:100%;height:auto;background:#16372d}.overview svg{width:100%;height:100px;background:#16372d}.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:13px;padding:10px 0}.line{display:inline-block;width:18px;border-top:3px solid;vertical-align:middle;margin-right:6px}pre{font:12px/1.45 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}th,td{padding:5px 4px;text-align:left;border-bottom:1px solid #344752;vertical-align:top}.overflow{overflow:auto}details{margin-top:14px;background:#182532;border:1px solid #33465a;padding:12px;border-radius:8px}summary{cursor:pointer;font-weight:600}.time{font-variant-numeric:tabular-nums}#time{min-width:190px}.status{min-height:4em}.inspector{max-height:310px;overflow:auto}a{color:#8bd5ff}@media(max-width:1080px){.panes{grid-template-columns:1fr}main{padding:12px}}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #a6dfff;outline-offset:2px}
</style></head><body><main><h1>RT recovery: unchanged / A / B</h1>
<p class="muted">Saved Ace H-playside wide-zone control · all 22 players · ten shared intervals from 2.20 through 2.70 · no simulation runs in this viewer.</p>
<p class="callout">Neither RT counterfactual establishes protection through runner arrival. A changes depth and lateral flow; B preserves the original depth request while adding acquired lateral flow. Both intervene only on the five recorded ticks 1.75–1.95 and stop at the next existing read, 2.00. These panes show the subsequent native response, after the intervention has ended. They are diagnostic trials, not production features.</p>
<div class="toolbar"><button id="prev">◀</button><button id="play">Play</button><button id="next">▶</button><input id="slider" type="range" min="0" max="9" value="0"><span id="time" class="time"></span><label>Body boundary <select id="boundary"><option value="before">Entry t</option><option value="after">World end t+.05</option></select></label><label>Inspect <select id="actor"></select></label><label><input id="zoom" type="checkbox" checked>Corridor zoom</label><label><input id="pictures" type="checkbox">Acquired pictures</label></div>
<div class="legend"><span><i class="line" style="color:#ffc16b"></i>Raw RT contact / RB movement request</span><span><i class="line" style="color:#74b5ff"></i>Final World movement target</span><span><i class="line" style="color:#fff"></i>Achieved COM displacement / dt</span><span><i class="line" style="color:#cc9dfb"></i>Intervention (none active in this window)</span></div>
<p class="muted">All velocity arrows share a 0.25-second scale and begin at the selected body glyph. Body disks use saved radii; ticks show body facing, not gaze. Actual geometry and the DE–RB center line are analyst views, not an acquired route map or proof of achievable interception. Optional ghosts show only recorded acquired pictures. Orange hand links indicate nonzero signed tick-mean load, not continuous retention or useful protection. The overview keeps all 22 bodies visible when the main view is cropped.</p>
<p class="muted">Timing: all panes select the same controller entry t. World-end bodies belong to t+.05. Runner-contact events stamp entry t despite being resolved within [t,t+.05]; block_contact stamps interval end. No exact substep impact time is implied. Contact normalForce/tangentForce sum signed substep impulses and divide by full dt; push/hold/steer are capacity caps.</p>
<div id="panes" class="panes"></div>
<details open><summary>What changed during the earlier five-tick read beat</summary><div id="actions" class="panes"></div><p class="muted">Only RT movement velocity changes; facing, posture, push and cut skill remain native. The acquired end picture is retained for the same existing read beat, without new perception. These action records predate the displayed window and are not reconstructed states.</p></details>
<details><summary>Exact inputs, source, flags, packet hashes and limitations</summary><pre id="provenance"></pre></details>
</main><script id="film-data" type="application/json">__DATA__</script><script>
'use strict';const D=JSON.parse(document.getElementById('film-data').textContent),$=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=(x,n=3)=>Number.isFinite(x)?x.toFixed(n):'unavailable',vec=v=>v?`(${fmt(v.x)}, ${fmt(v.y)})`:'unavailable',slot=i=>D.labels[i].slot;let timer=null;
function table(head,rows){const t=document.createElement('table'),h=document.createElement('tr');head.forEach(s=>{const c=document.createElement('th');c.textContent=s;h.append(c)});t.append(h);rows.forEach(r=>{const tr=document.createElement('tr');r.forEach(s=>{const c=document.createElement('td');c.textContent=String(s??'unavailable');tr.append(c)});t.append(tr)});return t}
function node(tag,attrs={},text){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;return n}
function arrow(svg,p,v,color,X,Y,scale){if(!v)return;const x=X(p.x),y=Y(p.y),qx=X(p.x+v.x*.25),qy=Y(p.y+v.y*.25),a=Math.atan2(qy-y,qx-x),r=6;svg.append(node('path',{d:`M${x},${y} L${qx},${qy} M${qx-r*Math.cos(a-.5)},${qy-r*Math.sin(a-.5)} L${qx},${qy} L${qx-r*Math.cos(a+.5)},${qy-r*Math.sin(a+.5)}`,fill:'none',stroke:color,'stroke-width':2}));}
function draw(f,overview){const after=$('boundary').value==='after',bodies=after?f.afterBodies:f.before;const box=overview||!$('zoom').checked?D.bounds:{x0:33,x1:46,y0:17,y1:29};const w=480,h=overview?250:430,m=overview?8:22,s=Math.min((w-2*m)/(box.x1-box.x0),(h-2*m)/(box.y1-box.y0)),ox=(w-(box.x1-box.x0)*s)/2,oy=(h-(box.y1-box.y0)*s)/2,X=x=>ox+(x-box.x0)*s,Y=y=>oy+(y-box.y0)*s;
const svg=node('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':`All22 body states for controller entry${f.t}`});svg.append(node('rect',{x:0,y:0,width:w,height:h,fill:'#16372d'}));for(let x=30;x<=60;x+=5){svg.append(node('line',{x1:X(x),x2:X(x),y1:Y(0),y2:Y(53.3333),stroke:x===40?'#99f3d9':'#436b57','stroke-width':x===40?2:1}));if(!overview)svg.append(node('text',{x:X(x)+3,y:17,fill:'#bcd9cc','font-size':10},x===40?'LOS':String(x)));}
const de=bodies[12].pos,rb=bodies[6].pos;svg.append(node('line',{x1:X(de.x),y1:Y(de.y),x2:X(rb.x),y2:Y(rb.y),stroke:'#ffbfd1','stroke-width':1.5,'stroke-dasharray':'4 4'}));
for(const j of f.hands){const load=Math.abs(j.normalForce??0)+Math.abs(j.tangentForce??0)>1e-6;svg.append(node('line',{x1:X(bodies[j.a].pos.x),y1:Y(bodies[j.a].pos.y),x2:X(bodies[j.b].pos.x),y2:Y(bodies[j.b].pos.y),stroke:load?'#ff9d49':'#a5acb3','stroke-width':load?2:1,'stroke-dasharray':load?'none':'3 3'}));}
if($('pictures').checked&&!overview)for(const q of f.pictures.filter(q=>q.actor===+$('actor').value)){svg.append(node('circle',{cx:X(q.seen.pos.x),cy:Y(q.seen.pos.y),r:Math.max(3,bodies[q.target].radius*s),fill:'none',stroke:'#b5a2d5','stroke-width':1.2,'stroke-dasharray':'3 3'}));}
bodies.forEach((b,i)=>{const fill=i===6?'#95ef9d':i===2?'#79c2ff':i===12?'#ffbf79':D.labels[i].team==='O'?'#65d5eb':'#fb91a4',g=node('g',{'data-actor':i}),x=X(b.pos.x),y=Y(b.pos.y),r=b.radius*s;g.append(node('circle',{cx:x,cy:y,r,fill,stroke:i===+$('actor').value?'white':'#15251d','stroke-width':i===+$('actor').value?2:1}));g.append(node('line',{x1:x,y1:y,x2:x+Math.cos(b.facing)*r*1.8,y2:y+Math.sin(b.facing)*r*1.8,stroke:'#18291f','stroke-width':1.5}));if(!overview)g.append(node('text',{x:x+r+2,y:y-2,fill:'#fff','font-size':i===2||i===6||i===12?12:9},slot(i)));g.onclick=()=>{$('actor').value=i;render()};svg.append(g)});
if(!overview){const i=+$('actor').value,raw=i===2?f.rtRaw:i===6?f.stored[6]:f.stored[i],p=bodies[i].pos;arrow(svg,p,raw?.vel,'#ffc16b',X,Y,s);arrow(svg,p,f.world[i]?.vel,'#74b5ff',X,Y,s);arrow(svg,p,f.achieved[i],'#fff',X,Y,s);if(f.intervention&&i===2)arrow(svg,p,f.intervention.changed.vel,'#cc9dfb',X,Y,s);}return svg}
function makePanes(){const host=$('panes');D.runs.forEach((r,i)=>{const p=document.createElement('section');p.className='pane';p.innerHTML=`<h2></h2><p class="status muted"></p><div class="scene"></div><div class="overview"></div><h3>RT and RB movement</h3><div class="motion overflow"></div><h3>Selected body</h3><pre class="inspector"></pre><h3>RT / DE_S contact</h3><div class="contact overflow"></div><p class="events muted"></p><h3>Acquired route pictures</h3><div class="cues overflow"></div>`;p.querySelector('h2').textContent=r.title;host.append(p)});}
function render(){const k=+$('slider').value,after=$('boundary').value==='after',focus=+$('actor').value,entry=D.runs[0].frames[k].t;$('time').textContent=`entry ${entry.toFixed(2)} · body ${(after?entry+.05:entry).toFixed(2)} s`;
D.runs.forEach((r,i)=>{const f=r.frames[k],p=$('panes').children[i],b=(after?f.afterBodies:f.before)[focus];p.querySelector('.status').textContent=r.context;p.querySelector('.scene').replaceChildren(draw(f,false));p.querySelector('.overview').replaceChildren(draw(f,true));
p.querySelector('.motion').replaceChildren(table(['Actor','Raw request','Final World','Achieved Δpos/dt'],[2,6].map(a=>[slot(a),vec((a===2?f.rtRaw:f.stored[a])?.vel),vec(f.world[a]?.vel),vec(f.achieved[a])])));
p.querySelector('.inspector').textContent=JSON.stringify({slot:slot(focus),controllerEntry:f.t,displayedBodyBoundary:after?f.after:f.t,...b,storedMovementCommand:f.stored[focus],rawRTTechnique:focus===2?f.rtRaw:undefined,finalWorldTarget:f.world[focus],achievedCOMVelocity:f.achieved[focus],interventionActive:f.intervention??false,zoneRead:focus===2?f.rtRead:undefined,movementContext:focus===2?f.rtMovementContext:undefined},null,2);
const pair=f.hands.find(j=>(j.a===2&&j.b===12)||(j.a===12&&j.b===2));p.querySelector('.contact').replaceChildren(table(['Measure','Value'],pair?[['Tick-mean N',fmt(pair.normalForce)],['Tick-mean lateral',fmt(pair.tangentForce)],['Push / hold / steer caps',`${fmt(pair.push)} / ${fmt(pair.hold)} / ${fmt(pair.steer)}`],['Joint extension',fmt(pair.extension)],['COM distance',fmt(Math.hypot(f.before[2].pos.x-f.before[12].pos.x,f.before[2].pos.y-f.before[12].pos.y))],['Work residual',f.workResidual]]:[['RT / DE_S hand joint','None recorded at World end'],['Work residual',f.workResidual]]));
p.querySelector('.events').textContent=f.events.length?'Events: '+f.events.map(e=>`${e.type} ${e.t.toFixed(2)}${e.b===undefined?'':' '+slot(e.b)}`).join('; '):'No recorded events for this interval.';p.querySelector('.cues').replaceChildren(table(['Observer → target','Seen pos','Age / calls'],f.pictures.map(q=>[`${slot(q.actor)} → ${slot(q.target)}`,vec(q.seen.pos),`${fmt(q.seen.age)} s / ${q.calls}`])));
});}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Play'}
$('play').onclick=()=>{if(timer)return stop();$('play').textContent='Pause';timer=setInterval(()=>{if(+$('slider').value>=9)return stop();$('slider').value=+$('slider').value+1;render()},220)};$('prev').onclick=()=>{$('slider').value=Math.max(0,+$('slider').value-1);render()};$('next').onclick=()=>{$('slider').value=Math.min(9,+$('slider').value+1);render()};['slider','actor','boundary','zoom','pictures'].forEach(id=>$(id).oninput=render);
D.labels.forEach((p,i)=>{const o=document.createElement('option');o.value=i;o.textContent=p.slot;$('actor').append(o)});$('actor').value=2;
D.runs.forEach(r=>{const section=document.createElement('section');section.className='pane';const h=document.createElement('h3');h.textContent=r.title;section.append(h);if(r.actions.length){section.append(table(['Entry t','Original vx/vy','Intervention vx/vy'],r.actions.map(a=>[a.t.toFixed(2),vec(a.original.vel),vec(a.changed.vel)])));const detail=document.createElement('pre');detail.textContent=JSON.stringify({firstRead:r.firstRead,finishedAction:r.finishedAction},null,2);section.append(detail)}else{const p=document.createElement('p');p.textContent='Unchanged native controller; no injected action.';section.append(p)}$('actions').append(section)});$('provenance').textContent=JSON.stringify(D.provenance,null,2);makePanes();render();
</script></body></html>'''


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unchanged", default="out/run-drills/native-prefix.json.gz")
    parser.add_argument("--a", default="out/rt-recovery/uc12-wz-s3-mirror-depth-neutral.json.gz" if Path("out/rt-recovery/uc12-wz-s3-mirror-depth-neutral.json.gz").exists() else "out/rt-recovery/uc12-wz-s3-mirror.json.gz")
    parser.add_argument("--b", default="out/rt-recovery/uc12-wz-s3-mirror-flow-only.json.gz")
    parser.add_argument("--reference", default="data/reviews/current/ace-production-observations.json.gz")
    parser.add_argument("--out", default="out/rt-recovery")
    parser.add_argument("--node", default="/workspace/.cloud-tools/node22/node_modules/.bin/node")
    args = parser.parse_args()
    packets, pins = {}, {}
    for name in ("unchanged", "a", "b", "reference"):
        packets[name], pins[name] = read(getattr(args, name))
    unchanged, a, b = (packets[k] for k in ("unchanged", "a", "b"))
    assert unchanged["prefixExact"] and unchanged["controllersChanged"] is False
    assert unchanged["input"] == a["input"] == b["input"]
    assert unchanged["sourceSha256"] == a["sourceSha256"] == b["sourceSha256"]
    assert unchanged["flags"] == a["flags"] == b["flags"] and len(a["flags"]) == 44
    assert unchanged["referenceSha256"] == a["referenceSha256"] == b["referenceSha256"]
    assert a["worldDefaults"] == b["worldDefaults"]
    assert a["recipe"] == b["recipe"]
    for p in (a, b):
        assert p["prefixExact"] and p["prefixTicks"] == 35
        assert p["hashes"][:35] == unchanged["hashes"][:35]
        assert p["all22"] and p["naturalRunner"] and p["profilesUnchanged"]
        assert p["otherControllersChanged"] is False and p["spacingChanged"] is False and p["contactChanged"] is False
        assert len(p["actions"]) == 5 and [round(x["t"], 2) for x in p["actions"]] == [1.75, 1.8, 1.85, 1.9, 1.95]
        assert p["finishedAction"]["t"] == 2 and p["firstAction"] == 1.75
    assert pins["reference"]["sha256"] == unchanged["referenceSha256"]
    reference_row = next(r for r in packets["reference"]["panel"] if r["input"] == unchanged["input"])
    labels = sorted(reference_row["actors"], key=lambda p: p["idx"])
    assert [p["idx"] for p in labels] == list(range(22))
    assert [labels[i]["slot"] for i in (2, 6, 12)] == ["RT", "RB", "DE_S"]
    runs = []
    titles = ("Unchanged native", "A · Depth-neutral acquired flow", "B · Original depth + acquired flow")
    contexts = ("Exact native prefix. DE_S contacts RB during2.65–2.70; playback stops at declared2.70 boundary.",
                "Five-tick action ended2.00. DE_S later contacts RB during2.80–2.85, outside this shared window; delay does not establish protection.",
                "Five-tick action ended2.00. DE_S contacts RB during2.65–2.70; preserving native depth still does not establish protection.")
    for i, (name, p) in enumerate(zip(("unchanged", "a", "b"), (unchanged, a, b))):
        saved_frames = [f for f in p["frames"] if 2.2-1e-8 <= f["t"] < 2.7-1e-8]
        assert len(saved_frames) == 10
        assert [round(f["t"], 2) for f in saved_frames] == [round(2.2+k*.05, 2) for k in range(10)]
        for f in saved_frames:
            assert len(f["beforeBodies"]) == len(f["afterBodies"]) == len(f["requested"]) == len(f["intents"]) == 22
            assert abs(f["after"] - f["t"] - .05) < 1e-8
            for j, before in enumerate(f["beforeBodies"]):
                assert before["profile"] == f["afterBodies"][j]["profile"] == labels[j]["profile"]
        runs.append({"id": name, "title": titles[i], "context": contexts[i],
                     "producerCommit": p["commit"], "frames": [frame(p, f) for f in saved_frames],
                     "actions": p.get("actions", []), "firstRead": p.get("firstRead"),
                     "finishedAction": p.get("finishedAction"), "summary": p.get("summary"),
                     "prefixCensoring": p.get("censoring")})
    assert a["summary"]["firstContact"]["opponent"] == b["summary"]["firstContact"]["opponent"] == 12
    assert a["summary"]["firstContact"]["t"] == 2.8 and b["summary"]["firstContact"]["t"] == 2.65
    assert all(f["intervention"] is None for r in runs for f in r["frames"])
    points = [q["pos"] for r in runs for f in r["frames"] for boundary in ("before", "afterBodies") for q in f[boundary]]
    bounds = {"x0": min(p["x"] for p in points)-1, "x1": max(p["x"] for p in points)+1,
              "y0": min(0, min(p["y"] for p in points)-1), "y1": max(53.333333333333336, max(p["y"] for p in points)+1)}
    data = {"protocol": "rt-recovery-offline-viewer-v1", "runs": runs, "bounds": bounds,
            "labels": [{k: p[k] for k in ("idx", "slot", "team")} for p in labels],
            "provenance": {"generatorSha256": sha(Path(__file__).read_bytes()), "inputs": pins,
                           "input": unchanged["input"], "runtimeSourceSha256": unchanged["sourceSha256"],
                           "productionComparisonCommit": a["recipe"]["developCommit"],
                           "historicalBaseline": a["recipe"]["historicalComparison"],
                           "flags": a["flags"], "worldDefaults": a["worldDefaults"],
                           "sourcePacketReferenceSha256": a["referenceSha256"],
                           "producerCommits": {name: p["commit"] for name, p in zip(("unchanged", "a", "b"), (unchanged, a, b))},
                           "scope": "Ten common all22 World intervals[2.20,2.70]; full ending summaries are saved context only. No new Worldticks.",
                           "routeVisibility": "Actual geometry is analyst-only. Cues are saved acquired/delayed pictures; repetition counts are not gaze. No private assignment/route map given to controllers.",
                           "movement": "Stored requested is ordinary sim.cmds. RT raw contact is saved phase movement command before injection/spacing; RB raw is storedrequested[6]. World is final target, achieved is COM displacement/dt with all contact.",
                           "meanContact": "World clears normal/tangent accumulators, sums signed substep impulses, divides by full dt. Signed tick-average N/T, not caps, continuous retention or protection. Actual force-point data unavailable.",
                           "timing": "Runner event stamp is controller entryt for resolved[t,t+.05]; block_contact stampsend. Before/after boundary is selectable and shared acrossallpanes.",
                           "limitations": ["Diagnostic intervention only; no production controller change.", "Both counterfactuals fail protection through arrival; changed endings do not alone evaluate mechanics or decisions.", "Contact and capacities unchanged; existing center-hand angular-law uncertainty remains.", "The legacy mirror is TE-placement contrast, not true reflected geometry.", "Zero new simulations and no browser visual verification."]}}
    payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
    html = HTML.replace("__DATA__", payload.replace("<", "\\u003c"))
    embedded = html.split('<script id="film-data" type="application/json">', 1)[1].split('</script>', 1)[0]
    assert json.loads(embedded) == data
    for r in runs:
        for f in r["frames"]:
            for i in range(22):
                assert all(math.isclose(f["before"][i]["pos"][axis] + f["dt"] * f["achieved"][i][axis], f["afterBodies"][i]["pos"][axis], abs_tol=1e-12) for axis in ("x", "y"))
    node_version = subprocess.check_output([args.node, "--version"], text=True).strip()
    assert node_version == "v22.23.3", node_version
    viewer_js = html.split('</script><script>', 1)[1].split('</script>', 1)[0]
    with tempfile.TemporaryDirectory(prefix="rt-recovery-viewer-") as td:
        path = Path(td) / "viewer.js"
        path.write_text(viewer_js)
        subprocess.run([args.node, "--check", str(path)], check=True, capture_output=True, text=True)
    destination = Path(args.out)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "viewer.html").write_text(html)
    checks = {"protocol": data["protocol"], "generatorSha256": data["provenance"]["generatorSha256"],
              "htmlSha256": sha(html.encode()), "embeddedDataSha256": sha(payload.encode()), "inputs": pins,
              "node": node_version, "embeddedRoundTrip": True, "javascriptSyntax": True,
              "commonIntervalsPerPane": 10, "bodiesPerBoundary": 22, "panes": 3,
              "sameInputsFlagsSourcesProfiles": True, "preAction35HashesExact": True,
              "actualCOMReconstruction": True, "interventionInactiveThroughoutDisplayedWindow": True,
              "worldTicksExecuted": 0, "browserVisualVerified": False,
              "elapsedSeconds": time.perf_counter()-started}
    (destination / "checks.json").write_text(json.dumps(checks, indent=2) + "\n")
    print(json.dumps(checks, separators=(",", ":")))


if __name__ == "__main__":
    main()
