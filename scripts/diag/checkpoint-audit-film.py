#!/usr/bin/env python3
"""Export nominated diagnostic witnesses from saved checkpoint files; zero simulations."""
import argparse
import base64
import gzip
import hashlib
import json
import pathlib

WITNESSES = [
    ("mesh-failure", "experimental", "west-spread", 22, 1.0, ["QB", "RB", "DE_S", "LB_M"],
     "Failed exchange from the reel",
     "QB keeps possession; the RB remains in mesh and leaves the exchange. QB requests zero velocity through the wait. DE_S finally tackles the QB at 10.20 s. This is not a keeper or a completed handoff."),
    ("mesh-cap", "experimental", "power-zone", 14, 2.0, ["QB", "RB", "LB_M"],
     "Failed exchange ends only at the play cap",
     "No handoff; QB stays at the installed gun mesh. RB continues without possession. The 25-second result is a system cap, not a football ending."),
    ("mesh-control", "experimental", "west-spread", 69, 1.05, ["QB", "RB"],
     "Opposing control: gun moving exchange succeeds",
     "Gun Doubles Wide Zone hands off at 1.05 s and gains 5.13 yd. Same team/formation, different direction and game state; a useful existing control, not a matched causal replay."),
    ("historical-mesh", "accepted", "west-spread", 37, 2.0, ["QB", "RB"],
     "Accepted source also has the exchange failure",
     "Gun Doubles Outside Zone Weak never exchanges and reaches the 25-second cap. Demonstrates pre-existing exposure; does not isolate which candidate changes affect its frequency."),
    ("hitch-run-read", "experimental", "power-zone", 36, .95, ["X", "CB_W", "FS"],
     "All Hitch: coverage misread before 88.88 YAC",
     "CB_W reads run at 0.95 s, moves toward the backfield action, and reads pass at 2.55 s after the 2.30 s throw. Catch is at 3.25 s. The exact consumed cue is not in standard recording."),
    ("hitch-pursuit", "experimental", "power-zone", 36, 4.0, ["X", "CB_W", "FS", "SS"],
     "Same play: secondary pursuit crosses behind the runner",
     "FS closes from ahead and inside, crosses behind X, and never records contact or an attempt. Closest sampled defender distance is 2.47 yd at 4.50 s. Shared chase uses delayed velocity forecasts; cause still needs a consumed-picture/body trace."),
    ("immediate-wrap", "experimental", "zone-reference", 29, 3.15, ["X", "CB_S"],
     "Opposing control: immediate catch-and-wrap",
     "Completed Stick gains 9.00 yd, only 0.116 YAC. Catch, contact and wrap are all recorded at 3.15 s; tackle at 3.90 s. Preserve useful catch approach and legitimate defended catches."),
    ("grip-slip", "experimental", "power-zone", 2, 3.85, ["Z", "CB_S", "SS", "FS"],
     "Different failure: attempts and acquired holds slip",
     "Levels gains 55.25 YAC after a missed dive and two holds that slip. Unlike the no-contact hitch, acquisition/retention really occurs. Standard film cannot adjudicate transmitted forces or conservation."),
    ("carrier-blocker", "experimental", "zone-reference", 61, 2.6, ["LT", "RB", "LB_M"],
     "Run coordination: repeated collision with own LT",
     "Outside Zone hands off at 1.40 s; first RB/LT impulse at 2.60 s precedes first recorded opposing carrier contact at 3.35 s. Sixteen positive RB/blocker intervals total 758.82 kg yd/s; gain 0.83 yd. Impulse sum is exposure, not net momentum or proof of an illegal force."),
    ("carrier-fall", "experimental", "power-zone", 62, 2.25, ["LG", "RB"],
     "Inside Zone: RB falls in teammate contact",
     "LG/RB impulse is 328.59 kg yd/s at 2.25 s, with a recorded RB contact fall at that time; gain 0.35 yd. Does not isolate runner steering, blocker tracking or body support. An untouched player getting up is legal."),
    ("short-run-control", "experimental", "power-zone", 118, 2.45, ["RB", "LB_W", "C"],
     "Short run with ordinary defensive win",
     "Median run gains 1.69 yd: no positive RB/OL-TE-FB contact, first opposing grasp/wrap at 2.45 s, tackle at 2.95 s. A short gain alone is not a defect; do not force every run to succeed."),
    ("crosser", "experimental", "spread-air", 74, 2.95, ["H", "SS", "FS"],
     "Man crosser: correct pass read still yields separation",
     "SS is assigned man:H and reads pass at 0.40 s, yet is 8.16 yd from H at the catch. 64.76 YAC and no recorded carrier contact/attempt. This is a separate coverage/arrival witness, not the hitch's false run read."),
    ("coverage-churn", "experimental", "west-spread", 101, 2.2, ["LB_M", "H"],
     "Coverage directives alternate every tick",
     "LB_M alternates man:H and zone:hook_s seven times from 2.10 to 2.40 s. Each changed directive rebuilds the technique controller. Pass is incomplete: outcome alone would hide the coordination problem. Review rule inputs before choosing a persistence repair."),
    ("interception", "experimental", "zone-reference", 11, 2.85, ["QB", "Y", "NB"],
     "Smash interception: target/risk diagnosis remains open",
     "QB throws to Y; NB intercepts at 4.15 s and Y tackles the returner. A real defensive win must remain possible. Stored film lacks the QB's complete scored alternatives, so an interception alone does not prove a bad throw decision."),
    ("opening-accepted", "accepted", "zone-reference", 2, 1.4, ["RB", "FS", "CB_W"],
     "Matched opening: accepted 3.73 yd",
     "Same opening call/plan/initial recorded frame as the experimental opening. Full internal information states need not be identical. This is retained adverse comparison, not a required yardage target."),
    ("opening-experimental", "experimental", "zone-reference", 2, 3.75, ["RB", "FS", "CB_W"],
     "Matched opening: experimental 34 yd",
     "Actual handoff at 1.40 s; contact and first wrap at 3.75 s; two holds break before the eventual tackle. The favorable gain is not automatically a controller improvement."),
]

HTML = r'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Checkpoint film audit</title><style>
body{font:16px system-ui;margin:24px auto;max-width:1240px;padding:0 16px;background:#101923;color:#eef2f6}a{color:#9dd7ff}h1{font-size:26px}h2{font-size:20px}p{line-height:1.5}.box{background:#1c2b3a;padding:16px;border-radius:8px;margin:14px 0}select,button,input{font:inherit}select{max-width:100%;padding:8px}button{padding:6px 12px;margin:4px;cursor:pointer}input[type=range]{width:65%}#field{width:100%;background:#163e2c}#note{min-height:3em}.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.scroll{max-height:420px;overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:5px;border-bottom:1px solid #405060}.focus{background:#3a3b23}small{color:#c2ceda}.event{font-size:12px}.good{color:#a3e0b1}@media(max-width:700px){.cols{display:block}}</style>
<h1>Saved checkpoint: failure witnesses and opposing controls</h1>
<p><strong>Zero new simulations.</strong> These are nominated diagnostic clips, not a random sample or a defect-rate estimate.
The complete scan covers 1,083 ordinary scrimmages. Source, settings and original recordings remain unchanged.</p>
<p><a href="../../../../docs/reviews/experimental-film-audit-2026-10-15.md">Written diagnosis</a> · <a href="scan.json">All-play scan</a> · <a href="../experimental-game-checkpoint/index.html">Original eight film rooms</a></p>
<div class="box"><label>Witness <select id="choose"></select></label><h2 id="title">Loading saved film…</h2><p id="note"></p><small id="meta"></small></div>
<button id="play">Play</button><button id="back">−0.1 s</button><button id="forward">+0.1 s</button><input id="time" type="range" step="0.05"><output id="clock"></output>
<p><small>Cyan: offense. Red: defense. Gold halo: selected actors. Gold ball: recorded ball/holder. Arrows: recorded requested velocity, not achieved speed or gaze. Faint trails: last second of recorded positions. Native coordinates; offense attacks right. Nearest recorded sample; no new physics or inferred perception.</small></p>
<svg id="field" viewBox="0 0 120 53.333" role="img" aria-label="Saved all-22 positions and requested movement"></svg>
<div class="cols"><div class="box scroll"><h2>Recorded actors and commands</h2><table><thead><tr><th>Slot</th><th>Job</th><th>Target</th><th>x,y</th><th>Request vx,vy</th></tr></thead><tbody id="actors"></tbody></table></div>
<div class="box scroll"><h2>Recorded events (click to seek)</h2><div id="events"></div><h2>Review counts: accepted / experimental</h2><div id="counts"></div></div></div>
<p><small>Standard telemetry omits complete perception, support/hand forces and QB alternative scores. A direction, missed tackle, collision or interception is evidence to interpret, not automatically a code defect. See the written inventory for confidence and next decisions.</small></p>
<script id="packet" type="application/octet-stream">__PACKET__</script><script>
const $=id=>document.getElementById(id);let packet,which=0,t=0,playing=false,last=0;
const enc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nearest=(xs,time)=>xs.reduce((a,b)=>Math.abs(b.t-time)<Math.abs(a.t-time)?b:a);
function seek(v){const f=packet.witnesses[which].play.replay.frames;t=Math.max(0,Math.min(f.at(-1).t,Number(v)));$('time').value=t;draw()}
function select(i,at){playing=false;$('play').textContent='Play';which=i;const w=packet.witnesses[i],p=w.play;const fs=p.replay.frames;
 $('choose').value=i;$('title').textContent=w.title;$('note').textContent=w.note;
 $('meta').textContent=`${w.arm} · ${w.fixture} · P${p.index+1} (log.index=${p.index}) · ${p.call} · ${p.defense} · ${p.yards} yd · ${p.outcome}${p.foul?' · flagged':''}`;
 $('time').min=0;$('time').max=fs.at(-1).t;
 $('events').innerHTML=p.replay.events.map(e=>`<button class="event" data-t="${e.t}">${e.t.toFixed(2)} ${enc(e.type)} ${enc(p.replay.players[e.a]?.slot||'')} ${enc(p.replay.players[e.b]?.slot||'')}${e.note?' · '+enc(e.note):''}</button>`).join('');
 seek(at??w.at);history.replaceState(null,'',`#w=${w.id}&t=${t.toFixed(2)}`)
}
function draw(){const w=packet.witnesses[which],r=w.play.replay,f=nearest(r.frames,t),q=nearest(r.telemetry.frames,t),focus=new Set(w.actors);let svg='<defs><marker id="arr" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L4,2 L0,4" fill="#eef2f6"/></marker></defs>';
 svg+='<rect x="0" y="0" width="10" height="53.333" fill="#244839"/><rect x="110" y="0" width="10" height="53.333" fill="#244839"/>';
 for(let x=10;x<=110;x+=5)svg+=`<path d="M${x} 0 V53.333" stroke="#8fa494" opacity="${x%10?'.2':'.4'}" stroke-width=".1"/>`;
 svg+=`<path d="M${r.los} 0 V53.333" stroke="#59adff" stroke-width=".25"/>`;
 for(let i=0;i<r.players.length;i++){const a=r.players[i],x=f.agents[3*i],y=f.agents[3*i+1],sel=focus.has(a.slot),color=a.team==='O'?'#62cef2':'#ff8d88';
  const trail=r.frames.filter(g=>g.t>=Math.max(0,t-1)&&g.t<=f.t).map(g=>g.agents[3*i]+','+g.agents[3*i+1]).join(' ');
  if(sel)svg+=`<polyline points="${trail}" stroke="${color}" stroke-width=".2" fill="none" opacity=".5"/>`;
  if(sel)svg+=`<circle cx="${x}" cy="${y}" r="1.1" fill="none" stroke="#ffe083" stroke-width=".15"/>`;
  svg+=`<circle cx="${x}" cy="${y}" r=".55" fill="${color}"/>`;
  const v=q.agents[i].intent?.velocity;
  if(sel&&v)svg+=`<path d="M${x} ${y} L${x+v[0]*.35} ${y+v[1]*.35}" stroke="#eef2f6" stroke-width=".15" marker-end="url(#arr)"/>`;
  svg+=`<text x="${x+.8}" y="${y-.6}" fill="${sel?'#ffe083':color}" font-size=".95">${enc(a.slot)}</text>`;
 }
 svg+=`<circle cx="${f.ball[0]}" cy="${f.ball[1]}" r=".32" fill="#ffd34f" stroke="#111" stroke-width=".1"/>`;$('field').innerHTML=svg;
 $('clock').textContent=`${f.t.toFixed(2)} s · holder ${r.players[f.carrier]?.slot||'unheld'}`;
 $('actors').innerHTML=r.players.map((a,i)=>{const s=q.agents[i];return `<tr class="${focus.has(a.slot)?'focus':''}"><td>${enc(a.slot)}</td><td>${enc(s.job||s.kind)}</td><td>${enc(r.players[s.target]?.slot)}</td><td>${f.agents[3*i]}, ${f.agents[3*i+1]}</td><td>${enc(s.intent?.velocity?.join(', '))}</td></tr>`}).join('');
 window.auditState={id:w.id,at:f.t,carrier:f.carrier,actors:r.players.length};
}
async function boot(){const bytes=Uint8Array.from(atob($('packet').textContent.trim()),c=>c.charCodeAt(0));const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));packet=JSON.parse(await new Response(stream).text());
 $('choose').innerHTML=packet.witnesses.map((w,i)=>`<option value="${i}">${enc(w.title)}</option>`).join('');
 const rows=[['Filmed scrimmages','filmedScrimmages'],['Expected exchanges','expectedExchanges'],['No exchange observed','noExchangeObserved'],['25-second play caps','playCaps'],['20+ YAC catches (all, including flagged)','catches20Yac'],['20+ YAC with no recorded contact/attempt','catches20YacNoContactOrAttemptEvent']];
 $('counts').innerHTML='<table>'+rows.map(([label,key])=>`<tr><td>${label}</td><td>${packet.totals.accepted[key]} / ${packet.totals.experimental[key]}</td></tr>`).join('')+'</table>';
 const h=new URLSearchParams(location.hash.slice(1));const idx=packet.witnesses.findIndex(w=>w.id===h.get('w'));select(idx<0?0:idx,h.has('t')?Number(h.get('t')):undefined);window.auditReady=true;
}
 $('choose').onchange=e=>select(Number(e.target.value));$('time').oninput=e=>{playing=false;$('play').textContent='Play';seek(e.target.value)};
 $('back').onclick=()=>seek(t-.1);$('forward').onclick=()=>seek(t+.1);$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'Pause':'Play';last=performance.now()};
 $('events').onclick=e=>{const b=e.target.closest('[data-t]');if(b){playing=false;$('play').textContent='Play';seek(b.dataset.t)}};
 function tick(now){if(playing&&packet){const end=packet.witnesses[which].play.replay.frames.at(-1).t;seek(t+(now-last)/1000);if(t>=end){playing=false;$('play').textContent='Play'}}last=now;requestAnimationFrame(tick)}requestAnimationFrame(tick);
 boot().catch(e=>{$('title').textContent='Film could not load: '+e.message;throw e});
</script></html>'''


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--root", type=pathlib.Path, required=True)
    ap.add_argument("--out", type=pathlib.Path, required=True)
    ap.add_argument("--plot", action="store_true", help="Optional static diagram; requires matplotlib.")
    args = ap.parse_args()
    scan = json.loads((args.out / "scan.json").read_text())
    games, witnesses = {}, []
    for wid, arm, fixture, playno, at, actors, title, note in WITNESSES:
        key = (arm, fixture)
        if key not in games:
            games[key] = json.loads(gzip.decompress((args.root / arm / fixture / "game.json.gz").read_bytes()))
        g = games[key]
        p = next(p for p in g["log"] if p["index"] == playno - 1 and p.get("replay"))
        filmed = [p for p in g["log"] if p.get("replay")]
        physical = [o for o in g["observations"] if o["kind"] == "scrimmage"]
        o = physical[filmed.index(p)]
        assert o["call"]["label"] == p["call"]
        witnesses.append({"id": wid, "arm": arm, "fixture": fixture, "at": at, "actors": actors,
            "title": title, "note": note, "sourceSha256": g["provenance"]["sourceSha256"],
            "play": p, "initialPlayers": o["initialPlayers"], "teammateContacts": o["teammateContacts"],
            "film": f"../experimental-game-checkpoint/{arm}/{fixture}/film.html"})
    packet = {"schema": "checkpoint-audit-witnesses-v1", "simulationRuns": 0,
              "totals": scan["totals"], "witnesses": witnesses}
    raw = json.dumps(packet, separators=(",", ":")).encode()
    zipped = gzip.compress(raw, mtime=0)
    (args.out / "witnesses.json.gz").write_bytes(zipped)
    (args.out / "index.html").write_text(HTML.replace("__PACKET__", base64.b64encode(zipped).decode()))
    manifest = [{k: v for k, v in w.items() if k not in ("play", "initialPlayers", "teammateContacts")}
                | {"index": w["play"]["index"], "play": w["play"]["index"] + 1} for w in witnesses]
    (args.out / "witnesses.json").write_text(json.dumps(manifest, indent=2) + "\n")
    if args.plot:
        plot(witnesses, args.out / "failure-paths.png")
    print(json.dumps({"witnesses": len(witnesses), "packetBytes": len(zipped), "simulationRuns": 0,
                      "packetSha256": hashlib.sha256(zipped).hexdigest()}))


def plot(witnesses, destination):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    byid = {w["id"]: w for w in witnesses}
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    panels = [
        ("mesh-failure", 0, 3, ["QB", "RB"], "Failed exchange · west/spread P22\n0–3 s: ball stays with QB"),
        ("hitch-run-read", 0, 3.25, ["X", "CB_W"], "Coverage · power/zone P36\n0–3.25 s: corner leaves hitch"),
        ("hitch-pursuit", 3.25, 6, ["X", "FS"], "Pursuit · same P36\n3.25–6 s: safety crosses behind"),
    ]
    colors = {"QB": "#b98205", "RB": "#0077aa", "X": "#0077aa", "CB_W": "#b93243", "FS": "#b93243"}
    for ax, (wid, start, end, slots, title) in zip(axes, panels):
        r = byid[wid]["play"]["replay"]
        frames = [f for f in r["frames"] if start <= f["t"] <= end]
        for slot in slots:
            i = next(i for i, a in enumerate(r["players"]) if a["slot"] == slot)
            xs = [f["agents"][3*i] - r["los"] for f in frames]
            ys = [f["agents"][3*i+1] for f in frames]
            ax.plot(xs, ys, color=colors[slot], linewidth=2.3, label=slot)
            ax.scatter(xs[0], ys[0], color=colors[slot], marker="o", s=38)
            ax.scatter(xs[-1], ys[-1], color=colors[slot], marker="x", s=55)
            for target in ([.6, 1] if wid == "mesh-failure" else [.95, 2.55] if wid == "hitch-run-read" else [4, 4.5, 5]):
                f = min(frames, key=lambda f: abs(f["t"] - target))
                x, y = f["agents"][3*i] - r["los"], f["agents"][3*i+1]
                ax.scatter(x, y, s=20, color=colors[slot])
                ax.annotate(f'{f["t"]:.2f}s', (x, y), xytext=(5, 7 if slot in ("RB", "X") else -15),
                            textcoords="offset points", fontsize=8, color=colors[slot])
        ax.axvline(0, color="#7d9ab4", linestyle="--", linewidth=1)
        ax.set_title(title, fontsize=12, loc="left")
        ax.set_xlabel("Yards relative to line of scrimmage →")
        ax.set_ylabel("Field y (yards)")
        ax.grid(alpha=.2)
        ax.margins(.22)
        ax.set_aspect("equal", adjustable="datalim")
        ax.legend(loc="best", frameon=False)
    fig.suptitle("Different failures need different repairs", fontsize=17, x=.04, ha="left")
    fig.text(.04, .01, "Saved native positions only · circle = segment start; × = segment end · no new simulation · exact events and commands in the audit film room", fontsize=10)
    fig.tight_layout(rect=(0, .04, 1, .92))
    fig.savefig(destination, dpi=150)
    plt.close(fig)


if __name__ == "__main__":
    main()
