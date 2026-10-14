#!/usr/bin/env python3
"""Package saved D01–D03 observations in one dependency-free HTML viewer.

Artifact construction only. No simulator, World, controller or planner calls.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import time

started = time.perf_counter()
parser = argparse.ArgumentParser()
parser.add_argument("--overlay", default="out/run-drills/d03-overlay.json")
parser.add_argument("--h-native", default="out/run-drills/native-prefix.json.gz")
parser.add_argument("--d01-analysis", default="out/run-drills/d01-analysis.json")
parser.add_argument("--d02-witness", default="docs/reviews/run-drills/d02-witness.json")
parser.add_argument("--candidate", default="/workspace/football-te-base-production/out/te-base-production/native.json.gz")
parser.add_argument("--output", default="out/run-drills/viewer.html")
args = parser.parse_args()


def read(path):
    raw = Path(path).read_bytes()
    return json.loads(gzip.decompress(raw) if path.endswith(".gz") else raw), hashlib.sha256(raw).hexdigest()


overlay, overlay_hash = read(args.overlay)
h, h_hash = read(args.h_native)
d01, d01_hash = read(args.d01_analysis)
d02, d02_hash = read(args.d02_witness)
native, native_hash = read(args.candidate)
assert native_hash == overlay["provenance"]["candidateSha256"]
assert h["prefixExact"] and h["controllersChanged"] is False
assert h["sourceSha256"] == native["runtimeSourceSha256"] == overlay["provenance"]["reference"]["sourceSha256"]
assert h["flags"] == overlay["provenance"]["reference"]["flags"]
assert len(h["flags"]) == 44
slots = {a["idx"]: a["slot"] for a in overlay["runs"][0]["actors"]}
teams = {a["idx"]: a["team"] for a in overlay["runs"][0]["actors"]}
profiles = {a["idx"]: a["profile"] for a in overlay["runs"][0]["actors"]}


def cmd(c):
    if c is None:
        return None
    return {k: c[k] for k in ("vel", "facing", "posture", "cutSkill", "squeeze", "push") if k in c}


def body(b, idx):
    support = b.get("support", {})
    return {"i": idx, "slot": slots[idx], "team": teams[idx], "pos": b["pos"], "vel": b["vel"],
            "facing": b["facing"], "posture": support.get("posture", b.get("posture")),
            "support": support.get("state", b.get("supportState")), "energy": b.get("energy"),
            "radius": b.get("profile", profiles[idx])["radius"]}


def hand_pairs(joints):
    return [{"a": j["a"], "b": j["b"], "normal": j.get("normalForce"), "tangent": j.get("tangentForce"),
             "forcePoint": None} for j in joints if j["kind"] == "hands"]


def cues(qs):
    # Identical repeated original calls collapse only in display; multiplicity
    # remains visible and pictures of different age/position stay separate.
    grouped = {}
    for q in qs:
        key = json.dumps({"actor": q["actor"], "target": q["target"], "seen": q["seen"]}, sort_keys=True)
        if key not in grouped:
            grouped[key] = {"actor": q["actor"], "target": q["target"], "seen": q["seen"], "calls": 0}
        grouped[key]["calls"] += 1
    return list(grouped.values())


def event_rows(events, t, after):
    return [e for e in events if
            abs(e.get("t", -10) - (after if e.get("type") == "block_contact" else t)) < 1e-8]


def native_frame(f, events, pictures, group):
    return {"t": f["t"], "after": f["after"],
            "before": [body(b, i) for i, b in enumerate(f["beforeBodies"])],
            "afterBodies": [body(b, i) for i, b in enumerate(f["afterBodies"])],
            "raw": [cmd(c) for c in f["requested"]], "world": [cmd(c) for c in f["intents"]],
            "hands": hand_pairs(f["jointOutputs"]), "contacts": f["report"]["contacts"],
            "workResidual": f["report"]["work"]["residual"],
            "cues": cues([q for q in pictures if abs(q["t"] - f["t"]) < 1e-8 and q["actor"] in group]),
            "cueStatus": "Original consumed pictures; identical repeat calls grouped for display.",
            "events": event_rows(events, f["t"], f["after"])}


h_frames = [native_frame(f, h["events"], h["pictures"], (2, 12, 6)) for f in h["frames"]]
assert len(h_frames) == 10 and all(len(f["before"]) == len(f["afterBodies"]) == 22 for f in h_frames)
candidate_y = next(p["candidate"] for p in native["panel"] if p["candidate"]["input"]["id"] == "uc12-wz-s3")
d02_frames = []
for f in candidate_y["frames"]:
    if 2.4 - 1e-8 <= f["t"] <= 3.0 + 1e-8:
        converted = {"t": f["t"], "after": f["after"], "beforeBodies": f["worldInput"]["beforeBodies"],
                     "afterBodies": [a["body"] for a in f["agents"]],
                     "requested": [a["requested"] for a in f["agents"]],
                     "intents": f["worldInput"]["intents"], "jointOutputs": f["worldInput"]["jointOutputsAtWorldEnd"],
                     "report": f["report"]}
        d02_frames.append(native_frame(converted, candidate_y["events"], f["cues"], (3, 15, 6, 7, 17)))
assert len(d02_frames) == 13 and all(len(f["before"]) == 22 for f in d02_frames)


def summary(r):
    s = r["summary"]
    return {"label": r["label"], "id": r["id"], "input": r["input"],
            "firstContact": s.get("firstContact"), "crossing": s.get("crossing"),
            "end": s.get("duration", s.get("endTime")), "gain": s.get("gain"),
            "outcome": s.get("outcome"), "complete": s.get("complete", not s.get("censored", True))}


def d03_frames(run):
    fs = []
    events = candidate_y["events"] if run["label"] == "parked-te-base" else run["summary"]["result"]["events"]
    for f in run["frames"]:
        raw, world = [None] * 22, [None] * 22
        actors = []
        for a in f["actors"]:
            i = a["idx"]
            actors.append(body(a, i))
            raw[i], world[i] = cmd(a["requested"]), cmd(a["delivered"])
        fs.append({"t": f["t"], "after": f["after"], "before": None, "afterBodies": actors,
                   "raw": raw, "world": world, "hands": None, "contacts": None, "workResidual": None,
                   "cues": cues(f.get("rbConsumedPictures", [])),
                   "cueStatus": "Original RB pictures; scores/selected entry unavailable." if run["label"] == "parked-te-base"
                       else "RB picture values unavailable in accepted publication. Retained call counts are not eye gaze.",
                   "events": event_rows(events, f["t"], f["after"])})
    return fs


ry = next(r for r in overlay["runs"] if r["label"] == "accepted" and r["id"] == "uc12-wz-s3")
cy = next(r for r in overlay["runs"] if r["label"] == "parked-te-base" and r["id"] == "uc12-wz-s3")
data = {
    "protocol": "run-drills-viewer-v1", "sourceCommit": overlay["provenance"]["reference"]["developCommit"],
    "sourceSha256": h["sourceSha256"], "flags": h["flags"], "world": native["worldSelection"],
    "hashes": {"d03Overlay": overlay_hash, "hNativePrefix": h_hash, "d01Analysis": d01_hash,
               "d02Witness": d02_hash, "parkedPR28Native": native_hash},
    "historicalBaseline": "4ded6b600fd3785e65034aa5623d7a9f8f3c5db1",
    "candidateCommit": native["commit"], "hCollectorCommit": h["commit"],
    "slots": {str(k): v for k, v in slots.items()}, "controls": [summary(r) for r in overlay["runs"]],
    "d01": {"title": "D01 · Loaded RT / end / runner", "frames": h_frames,
            "summary": "Accepted H strong: DE_S reaches RB during2.65–2.70 despite loaded RT. Direct center-line geometry is a diagnostic, not an earliest feasible interception.",
            "censoring": h["censoring"], "prefixExact": h["prefixExact"]},
    "d02": {"title": "D02 · Loaded C / Mike / runner", "frames": d02_frames,
            "summary": d02["verdict"], "arrival": d02["arrival"]},
    "d03": {"title": "D03 · Acquired picture / spacing / arrival", "accepted": d03_frames(ry),
            "candidate": d03_frames(cy), "firstDifference": {k: overlay["firstDifference"][k]
               for k in ("t", "after", "acceptedReconstructedRelevantEdgeAim", "candidateDerivedLiveAim", "liveEdgeDeltaY", "requestedHeadingDeltaDeg")},
            "decisiveIntervals": [{"t": r["t"], "after": r["after"], "delta": r["candidateMinusAcceptedPostPosition"],
                                   "acceptedHeading": r["acceptedRawHeadingDeg"], "candidateHeading": r["candidateRawHeadingDeg"]}
                                  for r in overlay["decisiveIntervals"]],
            "summary": "First1.60 request follows the acquired edge: −.0317yd aim shift. RT spacing changes arrival more strongly. Later exact lane scoring is unavailable; no RB fix demonstrated."}}
payload = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("<", "\\u003c")

html = r'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ace run-game diagnostic film · D01–D03</title>
<style>
:root{color-scheme:dark;--bg:#101923;--panel:#182532;--line:#33465a;--ink:#edf3f8;--muted:#b4c4d1;--o:#65d5eb;--d:#fb91a4;--rb:#95ef9d;--raw:#ffc16b;--world:#74b5ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif}main{max-width:1500px;margin:auto;padding:20px}h1{font-size:25px;margin:0 0 6px}h2{font-size:17px;margin:0 0 9px}p{margin:7px 0}small,.muted{color:var(--muted)}.panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px;margin-top:12px}.toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}select,button{background:#26394b;color:var(--ink);border:1px solid #6a7f92;border-radius:6px;padding:8px;font:inherit}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}input[type=range]{width:100%;accent-color:var(--rb)}label{display:inline-flex;align-items:center;gap:6px}.time{font-variant-numeric:tabular-nums;font-size:18px;color:#d7eeff}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.single{grid-template-columns:1fr}.scene svg{width:100%;height:auto;background:#16372d;border:1px solid #466453;border-radius:8px}.overview svg{background:#16372d;width:100%;height:115px;border-radius:6px}.scene-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:8px 0}.legend{display:flex;gap:18px;flex-wrap:wrap;margin-top:8px;font-size:13px}.swatch{display:inline-block;width:18px;border-top:3px solid;vertical-align:middle;margin-right:5px}.dot{display:inline-block;width:11px;height:11px;border-radius:50%;margin-right:5px}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}th,td{border-bottom:1px solid var(--line);padding:7px 9px;text-align:left;white-space:nowrap}th{color:#d2e5f3}.pairtables{display:grid;grid-template-columns:1fr 1fr;gap:12px}code,pre{font:12px ui-monospace,monospace}pre{white-space:pre-wrap;overflow-wrap:anywhere}.callout{border-left:3px solid var(--raw);padding-left:12px}.pill{display:inline-block;border:1px solid #60836c;color:#b2f8be;padding:2px 7px;border-radius:5px;font-size:12px}.parked{border-color:#bd8f62;color:#ffcd97}summary{cursor:pointer;font-weight:600}.spacer{margin-top:12px}.unavailable{color:#b7bcc5;font-style:italic}.empty{min-height:260px;display:grid;place-items:center;color:var(--muted)}.nowrap{white-space:nowrap}.check{font-size:13px}@media(max-width:900px){.grid,.pairtables{grid-template-columns:1fr}main{padding:10px}.toolbar{gap:8px}.time{font-size:15px}}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #a6dfff;outline-offset:2px}
</style></head><body><main>
<h1>Ace run-game diagnostic film</h1><p class="muted">D01–D03 · Saved observations · Under-center singleback, two attached tight ends · October 14, 2026</p>
<p><span class="pill">Accepted source a1b16e6 / e5c318a ·44flags</span> <span class="pill parked">TE-base trial parked</span></p>
<div class="panel"><div class="toolbar">
<label>View <select id="view"><option value="d01">D01 · Loaded RT / DE_S / RB</option><option value="d02">D02 · Loaded C / LB_M / RB</option><option value="d03">D03 · Accepted Y vs parked Y-base</option></select></label>
<label>Bodies <select id="phase"><option value="after">Completed World boundary</option><option value="before">Before World</option></select></label>
<label>Inspect <select id="actor"></select></label>
<label class="check"><input id="zoom" type="checkbox" checked>Corridor zoom</label>
<label class="check"><input id="arrows" type="checkbox" checked>Movement vectors</label>
<label class="check"><input id="pictures" type="checkbox">Consumed pictures</label>
</div><p id="finding" class="callout"></p><div class="toolbar"><button id="prev" aria-label="Previous recorded tick">◀</button><button id="play">Play</button><button id="next" aria-label="Next recorded tick">▶</button><span id="time" class="time"></span></div>
<label style="display:block;margin-top:8px">Recorded controller entry <input id="slider" type="range" min="0" max="9" step="1" value="0"></label><p id="scope" class="muted"></p>
</div>
<div id="scenes" class="grid single"></div>
<div class="legend"><span><i class="dot" style="background:var(--o)"></i>Offense</span><span><i class="dot" style="background:var(--d)"></i>Defense</span><span><i class="dot" style="background:var(--rb)"></i>Runner</span><span><i class="swatch" style="color:var(--raw)"></i>Raw request</span><span><i class="swatch" style="color:var(--world)"></i>Final World target</span><span><i class="swatch" style="color:#f4f7fb"></i>Actual velocity at displayed body time</span><span>Dashed connector: instantaneous center line only</span></div>
<p class="muted">Vectors sit at the selected body glyph and show directions, not force application points or an interpolated path. White body tick is facing, not eye gaze. The overview shows every recorded actor; corridor zoom crops the main field.</p>
<div class="panel"><h2>Requested versus actual movement</h2><div id="motion" class="tablewrap"></div><p id="geometry" class="muted"></p></div>
<div class="pairtables"><div class="panel"><h2>Consumed pictures</h2><p id="cue-note" class="muted"></p><div id="cue-table" class="tablewrap"></div></div><div class="panel"><h2>Contact and accounting</h2><div id="hands" class="tablewrap"></div><p id="accounting" class="muted"></p><p class="unavailable">Actual hand force points: unavailable. Signed tick-average normal/lateral load proves net impulse, not continuous retention or protected runner access.</p></div></div>
<div class="panel"><h2>Timeline and preserved controls</h2><div id="timeline" class="tablewrap"></div><p id="events" class="muted"></p><div id="controls" class="tablewrap spacer"></div><p class="muted">All control endings come from existing full native histories. Changed yardage is neither automatic failure nor proof of improvement. H retains its adverse result; mechanical validity remains a separate contact-law question. The withdrawn unsafe early-release proposal stays withdrawn.</p></div>
<details class="panel"><summary>Exact source, flags and input hashes</summary><pre id="provenance"></pre><p>No solver, capacities, roster, controller or planner changes were made to produce this viewer. No new simulations run when you open it. Center-contact angular-law uncertainty remains visible; this viewer does not certify earliest feasible alternatives.</p></details>
<p class="muted">Offline file · No CDN, network requests or external dependencies · Open index.html after extracting the download.</p>
</main><script id="film-data" type="application/json">__FILM_DATA__</script>
<script>
'use strict';
const D=JSON.parse(document.getElementById('film-data').textContent);
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=(v,n=3)=>v===null||v===undefined||!Number.isFinite(v)?'unavailable':v.toFixed(n);
const vec=v=>v?`(${fmt(v.x)}, ${fmt(v.y)})`:'unavailable';
const slot=i=>D.slots[i]??String(i);
let mode='d01',times=[],timer=null;
function table(headers,rows){const t=document.createElement('table'),head=document.createElement('tr');headers.forEach(v=>{const c=document.createElement('th');c.textContent=v;head.append(c)});t.append(head);for(const row of rows){const tr=document.createElement('tr');for(const v of row){const td=document.createElement('td');td.textContent=v===null||v===undefined?'unavailable':String(v);tr.append(td)}t.append(tr)}return t}
function put(id,node){$(id).replaceChildren(node)}
function svgNode(tag,attrs={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e}
function frames(){return mode==='d03'?D.d03.accepted:D[mode].frames}
function at(fs,t){return fs.find(f=>Math.abs(f.t-t)<1e-7)??null}
function bodyAt(f,i){if(!f)return null;return (mode!=='d03'&&$('phase').value==='before'?f.before:f.afterBodies).find(a=>a.i===i)??null}
function color(a){return a.i===6?'#95ef9d':a.team==='O'?'#65d5eb':'#fb91a4'}
function uniqueBodies(f){return mode!=='d03'&&$('phase').value==='before'?f.before:f.afterBodies}
function draw(f,overview=false){const box=overview||!$('zoom').checked?{x0:30,x1:57,y0:0,y1:53.3333}:{x0:33,x1:46,y0:17,y1:29};
 const w=840,h=overview?360:600,margin=overview?16:35,sx=(w-2*margin)/(box.x1-box.x0),sy=(h-2*margin)/(box.y1-box.y0),scale=Math.min(sx,sy);
 const ox=(w-(box.x1-box.x0)*scale)/2,oy=(h-(box.y1-box.y0)*scale)/2,X=x=>ox+(x-box.x0)*scale,Y=y=>oy+(y-box.y0)*scale;
 const svg=svgNode('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':`Recorded body positions at entry${f.t} and boundary${f.after}`});
 svg.append(svgNode('rect',{x:0,y:0,width:w,height:h,fill:'#16372d'}));
 const defs=svgNode('defs'),clip=svgNode('clipPath',{id:`clip-${mode}-${overview}-${f.t}`});clip.append(svgNode('rect',{x:ox,y:oy,width:(box.x1-box.x0)*scale,height:(box.y1-box.y0)*scale}));defs.append(clip);svg.append(defs);
 for(let x=Math.ceil(box.x0);x<=box.x1;x++){svg.append(svgNode('line',{x1:X(x),x2:X(x),y1:Y(box.y0),y2:Y(box.y1),stroke:x===40?'#fbdf78':'#6a977b','stroke-width':x===40?2:1,opacity:x===40?1:.35}));if(!overview)svg.append(svgNode('text',{x:X(x),y:Y(box.y1)+19,fill:'#c6dfd2','font-size':13,'text-anchor':'middle'},x===40?'40 LOS':String(x)))}
 for(let y=Math.ceil(box.y0);y<=box.y1;y+=2){svg.append(svgNode('line',{x1:X(box.x0),x2:X(box.x1),y1:Y(y),y2:Y(y),stroke:'#698c79',opacity:.2}));if(!overview)svg.append(svgNode('text',{x:X(box.x0)-8,y:Y(y)+4,fill:'#c6dfd2','font-size':12,'text-anchor':'end'},String(y)))}
 const g=svgNode('g',{'clip-path':`url(#clip-${mode}-${overview}-${f.t})`});svg.append(g);
 if(!overview&&mode!=='d03'){
  for(const j of f.hands??[]){const a=bodyAt(f,j.a),b=bodyAt(f,j.b);if(a&&b)g.append(svgNode('line',{x1:X(a.pos.x),y1:Y(a.pos.y),x2:X(b.pos.x),y2:Y(b.pos.y),stroke:'#b8dfa0',opacity:.38,'stroke-width':2,'stroke-dasharray':'5 3'}))}
  const defender=bodyAt(f,mode==='d01'?12:15),rb=bodyAt(f,6);if(defender&&rb)g.append(svgNode('line',{x1:X(defender.pos.x),y1:Y(defender.pos.y),x2:X(rb.pos.x),y2:Y(rb.pos.y),stroke:'#ffe3a1','stroke-width':2,'stroke-dasharray':'6 5'}));
 }
 const selected=Number($('actor').value);
 function arrow(a,v,c,dash){if(!v)return;const len=.15,x1=X(a.pos.x),y1=Y(a.pos.y),x2=X(a.pos.x+v.x*len),y2=Y(a.pos.y+v.y*len),ang=Math.atan2(y2-y1,x2-x1);g.append(svgNode('line',{x1,y1,x2,y2,stroke:c,'stroke-width':2.3,'stroke-dasharray':dash??''}));g.append(svgNode('path',{d:`M ${x2-7*Math.cos(ang-.45)} ${y2-7*Math.sin(ang-.45)} L ${x2} ${y2} L ${x2-7*Math.cos(ang+.45)} ${y2-7*Math.sin(ang+.45)}`,fill:'none',stroke:c,'stroke-width':2}));}
 for(const a of uniqueBodies(f)){
  const x=X(a.pos.x),y=Y(a.pos.y),r=Math.max(overview?2:4,a.radius*scale);
  g.append(svgNode('circle',{cx:x,cy:y,r,fill:color(a),opacity:a.support==='up'?1:.55,stroke:a.i===selected?'#ffe49b':'#10251d','stroke-width':a.i===selected?3:1}));
  const face=Number.isFinite(a.facing)?a.facing:0;g.append(svgNode('line',{x1:x,y1:y,x2:x+Math.cos(face)*r*1.3,y2:y+Math.sin(face)*r*1.3,stroke:'#ffffff','stroke-width':1.5}));
  if(!overview){g.append(svgNode('text',{x,y:y-r-4,fill:'#f0fff4','font-size':12,'text-anchor':'middle'},a.slot));if($('arrows').checked&&[selected,6].includes(a.i)){arrow(a,f.raw[a.i]?.vel,'#ffc16b','5 3');arrow(a,f.world[a.i]?.vel,'#74b5ff');arrow(a,a.vel,'#f4f7fb')}}
 }
 if(!overview&&$('pictures').checked){for(const q of f.cues.filter(q=>q.actor===selected)){g.append(svgNode('circle',{cx:X(q.seen.pos.x),cy:Y(q.seen.pos.y),r:8,fill:'none',stroke:'#f7cc9b','stroke-width':1.5,'stroke-dasharray':'3 3'}));g.append(svgNode('text',{x:X(q.seen.pos.x)+9,y:Y(q.seen.pos.y)-7,fill:'#f7cc9b','font-size':11},`${slot(q.target)} ${fmt(q.seen.age,2)}s`))}}
 if(!overview){svg.append(svgNode('text',{x:w-22,y:23,fill:'#d7f0e0','font-size':12,'text-anchor':'end'},'Downfield +x → · lateral +y ↓'));}
 return svg;
}
function scene(label,f,parked){const panel=document.createElement('div');panel.className='panel scene';const meta=document.createElement('div');meta.className='scene-meta';const title=document.createElement('h2');title.textContent=label;const tag=document.createElement('span');tag.className=`pill${parked?' parked':''}`;tag.textContent=parked?'Parked trial':'Accepted controller';meta.append(title,tag);panel.append(meta);
 if(!f){const empty=document.createElement('div');empty.className='empty';empty.textContent='No recorded frame at this entry. This run has already ended; no held or interpolated body positions.';panel.append(empty);return panel}
 panel.append(draw(f));const info=document.createElement('p');info.className='muted';info.textContent=`${uniqueBodies(f).length} recorded actors · displayed body time${fmt($('phase').value==='before'&&mode!=='d03'?f.t:f.after,2)}s`;panel.append(info);const over=document.createElement('div');over.className='overview';over.append(draw(f,true));panel.append(over);return panel;
}
function refresh(){const t=times[Number($('slider').value)],f=at(frames(),t),cf=mode==='d03'?at(D.d03.candidate,t):null;const fs=mode==='d03'?[['Accepted Y',f],['Parked Y-base',cf]]:[[mode==='d01'?'Accepted H strong':'Parked Y-base',f]];
 $('time').textContent=`Entry${fmt(t,2)}s → World boundary${fmt(t+.05,2)}s`;
 $('scenes').className='grid'+(mode==='d03'?'':' single');$('scenes').replaceChildren(...fs.map(([name,x])=>scene(name,x,name.startsWith('Parked'))));
 const i=Number($('actor').value),group=mode==='d01'?[2,12,6]:mode==='d02'?[3,15,6,7,17]:[6,2,7];const rows=[];
 for(const[name,x]of fs){if(!x)continue;for(const id of group){const a=bodyAt(x,id);rows.push([name,slot(id),a?vec(a.pos):'unavailable',vec(x.raw[id]?.vel),vec(x.world[id]?.vel),a?vec(a.vel):'unavailable',a?fmt(a.facing):'unavailable',a?fmt(a.posture):'unavailable',a?.support??'unavailable'])}}
 put('motion',table(['History','Actor','Actual position','Raw request','World target','Velocity at body time','Facing rad','Base posture','Support'],rows));
 const geom=[];for(const[name,x]of fs){if(!x||mode==='d03')continue;const b=bodyAt(x,mode==='d01'?2:3),d=bodyAt(x,mode==='d01'?12:15),r=bodyAt(x,6);if(b&&d&&r){const dx=r.pos.x-d.pos.x,dy=r.pos.y-d.pos.y,proj=((b.pos.x-d.pos.x)*dx+(b.pos.y-d.pos.y)*dy)/(dx*dx+dy*dy);geom.push(`${name}: ${d.slot}→RB separation${fmt(Math.hypot(dx,dy))}yd; ${b.slot} projection on that instantaneous segment${fmt(proj)}. This is center-line geometry, not an earliest feasible interception.`)}}
 if(mode==='d03'){const a=bodyAt(f,6),b=bodyAt(cf,6);if(a&&b)geom.push(`Parked minus accepted runner position at this boundary: (${fmt(b.pos.x-a.pos.x)}, ${fmt(b.pos.y-a.pos.y)})yd. Complete lane scores and selected entries are unavailable.`)}$('geometry').textContent=geom.join(' ');
 const cueRows=[];for(const[name,x]of fs){if(!x)continue;for(const q of x.cues.filter(q=>q.actor===i))cueRows.push([name,slot(q.actor),slot(q.target),fmt(q.seen.age),vec(q.seen.pos),vec(q.seen.vel),q.seen.pose??'unavailable',q.calls])}
 $('cue-note').textContent=fs.filter(p=>p[1]).map(([name,x])=>`${name}: ${x.cueStatus}`).join(' ');
 put('cue-table',table(['History','Observer','Target','Age s','Delivered position','Delivered velocity','Pose','Calls'],cueRows.length?cueRows:[['No stored consumed values for this actor/tick.','—','—','unavailable','unavailable','unavailable','unavailable','—']]));
 const hands=[];for(const[name,x]of fs){if(!x)continue;for(const j of x.hands??[])if(group.includes(j.a)||group.includes(j.b))hands.push([name,`${slot(j.a)} / ${slot(j.b)}`,fmt(j.normal,2),fmt(j.tangent,2),'unavailable'])}
 put('hands',table(['History','Pair','Mean N','Mean lateral','Force points'],hands.length?hands:[['No hand-load fields available in this reduced display packet.','—','unavailable','unavailable','unavailable']]));
 $('accounting').textContent=fs.filter(p=>p[1]).map(([name,x])=>`${name}: represented work residual${fmt(x.workResidual,10)}; loads in kg·yd/s². ${x.contacts===null?'Torso contact table unavailable here.':`${x.contacts.length} recorded torso-contact entries in this World step.`}`).join(' ');
 const evs=[];for(const[name,x]of fs){if(x)for(const e of x.events)evs.push(`${name} ${e.type} label${fmt(e.t,2)} (${e.a===undefined?'':slot(e.a)}${e.b===undefined?'':` / ${slot(e.b)}`})${e.note?`: ${e.note}`:''}`)}$('events').textContent=evs.length?evs.join(' · '):'No saved event labels at this interval. block_contact uses completed boundary; carrier_contact uses controller-entry label after World contact testing.';
 $('prev').disabled=Number($('slider').value)===0;$('next').disabled=Number($('slider').value)===times.length-1;
}
function stop(){if(timer){clearInterval(timer);timer=null}$('play').textContent='Play'}
function setup(){stop();mode=$('view').value;times=frames().map(f=>f.t);$('slider').max=times.length-1;const start=mode==='d03'?1.6:mode==='d02'?2.4:2.2;$('slider').value=Math.max(0,times.findIndex(t=>Math.abs(t-start)<1e-7));$('phase').disabled=mode==='d03';if(mode==='d03')$('phase').value='after';$('finding').textContent=D[mode].summary;
 $('scope').textContent=mode==='d01'?'Exact full22-body native prefix. Capture ends at2.70s with explicit censoring; the original full H ending is reused below.':mode==='d02'?'Existing full22-body parked trial: entries2.40–3.00, completed boundaries2.45–3.05. This is not a three-body miniature.':'Synchronized recorded post-World states. Accepted publication has nine all-tick actors; parked trial has22. Missing accepted C/LB_M samples are not fabricated.';
 const group=mode==='d01'?[2,12,6]:mode==='d02'?[3,15,6,7,17]:[6,2,7];$('actor').replaceChildren(...group.map(i=>{const o=document.createElement('option');o.value=i;o.textContent=slot(i);return o}));
 const timeline=mode==='d03'?D.d03.decisiveIntervals.map(r=>[fmt(r.t,2),fmt(r.after,2),`${fmt(r.acceptedHeading,2)}° / ${fmt(r.candidateHeading,2)}°`,vec(r.delta)]):mode==='d02'?[['2.55','2.60','Candidate C–LB_M first loaded interval','Earlier hands alone do not prove protection'],['3.00','3.05','LB_M runner contact','Before runner crossing3.10']]:[['2.20','2.25','Native loaded keeper window begins','No historical reach-loss assumption'],['2.65','2.70','DE_S runner contact','Loaded RT; direct corridor diagnosis remains bounded']];
 put('timeline',table(['Controller entry','Completed World','Decision / event','Geometry / timing'],timeline));refresh();
}
put('controls',table(['History','Saved input','First runner contact','LOS crossing','Native ending','Gain (descriptive)'],D.controls.map(r=>[r.label,r.id,r.firstContact?`${r.firstContact.opponent} label${fmt(r.firstContact.t,2)}`:'none',r.crossing===null?'not crossed':fmt(r.crossing,2),`${r.outcome} ${fmt(r.end,2)}s${r.complete?'':' censored'}`,fmt(r.gain,3)])));
$('provenance').textContent=JSON.stringify({sourceCommit:D.sourceCommit,sourceSha256:D.sourceSha256,flags:D.flags,world:D.world,hCollectorCommit:D.hCollectorCommit,candidateCommit:D.candidateCommit,historicalComparison:D.historicalBaseline,inputHashes:D.hashes,inputs:D.controls.map(c=>c.input)},null,2);
$('view').addEventListener('change',setup);for(const id of ['slider','phase','actor','zoom','arrows','pictures'])$(id).addEventListener('input',refresh);
$('prev').onclick=()=>{stop();$('slider').value=Math.max(0,Number($('slider').value)-1);refresh()};$('next').onclick=()=>{stop();$('slider').value=Math.min(times.length-1,Number($('slider').value)+1);refresh()};
$('play').onclick=()=>{if(timer){stop();return}if(Number($('slider').value)>=times.length-1)$('slider').value=0;$('play').textContent='Pause';timer=setInterval(()=>{if(Number($('slider').value)>=times.length-1){stop();return}$('slider').value=Number($('slider').value)+1;refresh()},200)};
setup();
</script></body></html>'''

html = html.replace("__FILM_DATA__", payload)
output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(html)
embedded = re.search(r'<script id="film-data" type="application/json">(.*?)</script>', html, re.S).group(1)
assert json.loads(embedded) == data, "Embedded saved-data roundtrip changed values"
js = re.findall(r"<script>(.*?)</script>", html, re.S)
assert len(js) == 1
with tempfile.NamedTemporaryFile("w", suffix=".js") as script:
    script.write(js[0]); script.flush()
    subprocess.run(["/workspace/.cloud-tools/node22/node_modules/.bin/node", "--check", script.name], check=True, capture_output=True)
assert not re.search(r"\b(fetch|XMLHttpRequest)\s*\(", js[0])
assert not re.search(r'<(?:script|link)[^>]+(?:src|href)=["\']https?://', html)
checks = {"protocol": "run-drills-viewer-checks-v1", "artifact": str(output), "bytes": output.stat().st_size,
          "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "sourceHashes": data["hashes"],
          "frameCounts": {"d01Full22": len(h_frames), "d02Full22": len(d02_frames),
                          "d03AcceptedY": len(data["d03"]["accepted"]), "d03ParkedY": len(data["d03"]["candidate"])},
          "embeddedJsonRoundtrip": True, "node22InlineSyntax": True, "noNetworkDependency": True,
          "browserRendering": "Not verified in a browser; saved-data roundtrip and inline JS syntax checked.",
          "elapsedSeconds": time.perf_counter() - started, "newWorldSteps": 0, "newPlays": 0}
output.with_name("viewer-checks.json").write_text(json.dumps(checks, indent=2) + "\n")
print(json.dumps(checks))
