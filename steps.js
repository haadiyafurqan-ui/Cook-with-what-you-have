/* Recipe steps with timers: every dish card shows its method as short numbered steps, and each step
   that needs cooking time gets its own timer you can start, pause and reset.
   - A step's time comes from the recipe text when it says one ("cook 10 minutes" -> 10 min). Steps
     with no time share what is left of the dish's total time, with long jobs (until tender, simmer,
     cover and cook) getting more of it than quick ones (fry, boil). Prep and serving steps get no timer.
   - When a timer runs out it beeps (even if the pot's sounds are off: a cooking timer nobody hears is
     no use), vibrates on phones and shows a message. It keeps beeping for 30 seconds or until Stop.
   - Timers keep going when cards are redrawn or you switch pages; a small bar in the corner shows every
     timer that is on, with pause and stop buttons, and the screen is kept awake while one is running. */
const STXT={
  en:{start:"Start timer",pause:"Pause",resume:"Resume",reset:"Reset",stop:"Stop",done:"Done",step:"Step",min:"min",hr:"hr",sec:"sec",fin:(n,i)=>`⏰ ${n}: step ${i} is done`},
  ur:{start:"Timer chalayein",pause:"Rokein",resume:"Phir chalayein",reset:"Dobara",stop:"Band karein",done:"Ho gaya",step:"Qadam",min:"min",hr:"ghanta",sec:"sec",fin:(n,i)=>`⏰ ${n}: qadam ${i} mukammal`}
};
const st$=()=>STXT[typeof lang!="undefined"&&lang!="en"?"ur":"en"];

/* split a method into short steps, each with seconds for its timer (0 = no timer) */
const STEPC={};
function dishSteps(d){
  if(STEPC[d[0]])return STEPC[d[0]];
  const parts=[];
  /* new step at each sentence, "then", ", add" and "and boil/simmer/bake/grill/steam" */
  (how(d).match(/[^.!?]+[.!?]*/g)||[]).forEach(s=>s.split(/;\s*|,\s*(?:and\s+)?then\s+|,\s+(?=add\s)|\s+and\s+(?=(?:boil|simmer|bake|grill|steam)\b)/i).forEach(p=>{p=p.trim().replace(/[.!?,]+$/,"");if(p)parts.push(p.charAt(0).toUpperCase()+p.slice(1)+".")}));
  const LONG=/until (?:tender|soft|cooked|done|thick|the oil|the daal|it thickens|dry|reduced)|simmer|pressure|\bdum\b|on low|covered|cover and|\bbake|\broast|slow|\bcook (?:the )?(?:chicken|gosht|qeema|keema|mutton|beef|meat|daal|chanay|chickpeas)/i;
  const QUICK=/stir-fry|\btoss|on high|until glossy|scrambl|tarka|tadka|\bmelt|\bheat (?:the )?(?:oil|ghee|butter|pan)/i;
  const COOK=/\b(?:fry|fried|boil|cook|brown|steam|grill|toast|saut|bhun|caramel|reduce|thicken|poach|char|sear)|\bmake .*\b(?:gravy|halwa|sauce|syrup|custard)/i;
  const PREP=/\b(?:knead|mix|chop|marinate|shape|grate|blend|whisk|beat|slice|wash|rinse|peel|soak|stuff|roll)/i;
  const steps=parts.map(t=>{
    let s=0,m;const re=/(\d+(?:\.\d+)?)(?:\s*(?:to|-|–|or)\s*\d+(?:\.\d+)?)?\s*(?:more\s+)?(seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/gi;
    while((m=re.exec(t)))s+=parseFloat(m[1])*(/^s/i.test(m[2])?1:/^h/i.test(m[2])?3600:60);
    /* steps with no time of their own: long cooking, quick cooking, other cooking, or prep (no timer) */
    const k=s||/^serve/i.test(t)?"":/overnight/i.test(t)?"prep":LONG.test(t)?"long":QUICK.test(t)?"quick":COOK.test(t)?"cook":PREP.test(t)?"prep":"";
    return{t,s:s>=60?Math.round(s/60)*60:Math.round(s),k};
  });
  /* quick and other cooking take about 5 minutes and prep about 5 minutes of the dish's total time;
     long cooking shares what is left. With no long cooking, the other cooking steps share it instead. */
  const n=k=>steps.filter(x=>x.k==k).length,fix=steps.reduce((a,x)=>a+x.s,0)/60;
  const share=d[2]-fix-5*(n("prep")+n("quick"));
  steps.forEach(x=>{
    let m=x.k=="quick"?5:x.k=="cook"?(n("long")?5:Math.max(5,Math.min(20,share/n("cook")))):x.k=="long"?Math.max(10,Math.min(240,(share-5*n("cook"))/n("long"))):0;
    if(m)x.s=(m<10?Math.round(m):Math.round(m/5)*5)*60;
  });
  return STEPC[d[0]]=steps;
}

const ST={};let stTick=0,stLock=null,stAc=null;
const stFmt=ms=>{const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s/60)%60,x=String(s%60).padStart(2,"0");return h?`${h}:${String(m).padStart(2,"0")}:${x}`:`${m}:${x}`};
const stLen=s=>{const x=st$();if(s<60)return `${s} ${x.sec}`;const m=Math.round(s/60);return m<=90?`${m} ${x.min}`:`${Math.floor(m/60)} ${x.hr}${m%60?` ${m%60} ${x.min}`:""}`};
const stEsc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const stLeft=t=>t.st=="run"?t.end-Date.now():t.left;

function stepCtl(k,dur){
  const t=ST[k],x=st$();
  if(!t||t.st=="idle")return `<button type="button" class="stb" data-st="go" data-k="${stEsc(k)}" aria-label="${x.start}: ${stLen(dur)}">▶ ${stLen(dur)}</button>`;
  if(t.st=="ring")return `<button type="button" class="stb ring" data-st="stop" data-k="${stEsc(k)}">\u{1F514} ${x.stop}</button>`;
  if(t.st=="done")return `<button type="button" class="stb done" data-st="reset" data-k="${stEsc(k)}" aria-label="${x.done}. ${x.reset}">✓ ${x.done}</button>`;
  const run=t.st=="run";
  return `<button type="button" class="stb${run?" on":""}" data-st="${run?"pause":"go"}" data-k="${stEsc(k)}" aria-label="${run?x.pause:x.resume}">${run?"❚❚":"▶"} <b class="stt">${stFmt(stLeft(t))}</b></button><button type="button" class="stx" data-st="reset" data-k="${stEsc(k)}" aria-label="${x.reset}" title="${x.reset}">↺</button>`;
}
function stepsHtml(d){
  return `<ol class="steps">${dishSteps(d).map((x,i)=>{const k=d[0]+"|"+i;return `<li><span class="sx">${x.t}</span>${x.s?`<span class="stc" data-sk="${stEsc(k)}" data-dur="${x.s}">${stepCtl(k,x.s)}</span>`:""}</li>`}).join("")}</ol>`;
}

(function(){
  const css=`.steps{list-style:none;counter-reset:st;margin:8px 0 6px;padding:0;display:flex;flex-direction:column;gap:8px}
.steps li{counter-increment:st;display:flex;align-items:flex-start;gap:10px;font-size:14px;line-height:1.5}
.steps li:before{content:counter(st);flex:none;width:22px;height:22px;margin-top:1px;border-radius:50%;background:var(--stone);border:1px solid var(--line);display:grid;place-items:center;font:700 11px/1 'Inter',sans-serif;color:var(--ink)}
.steps .sx{flex:1;min-width:0}
.stc{flex:none;display:flex;gap:4px;align-items:center}
.stb,.stx{min-height:32px;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:4px 11px;font:600 12px/1 'Inter',sans-serif;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}
.stb:hover,.stx:hover{border-color:var(--ink)}
.stb b{font-weight:700}
.stb.on{background:var(--ink);border-color:var(--ink);color:#fff}
.stb.ring{background:var(--red);border-color:var(--red);color:#fff;animation:stRing .5s ease-in-out infinite alternate}
.stb.done{background:#E3F1E8;border-color:#2E7D4F;color:#14502F}
.stx{width:32px;padding:0;font-size:15px}
@keyframes stRing{from{transform:rotate(-4deg)}to{transform:rotate(4deg)}}
#stdock{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:40;display:flex;flex-direction:column;gap:6px;max-width:calc(100vw - 24px)}
#stdock[hidden]{display:none}
@media(max-width:620px){#stdock{right:auto;left:12px}}
.sdr{display:flex;align-items:center;gap:8px;background:var(--ink);color:#fff;border-radius:14px;padding:6px 6px 6px 12px;box-shadow:0 8px 22px rgba(43,35,31,.28);font:500 12.5px/1.3 'Inter',sans-serif}
.sdr.ring{background:var(--red)}
.sdr span{min-width:0;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sdr b{font-variant-numeric:tabular-nums;font-size:14px}
.sdr button{min-height:32px;min-width:32px;border:0;border-radius:999px;background:rgba(255,255,255,.16);color:#fff;font:600 12px/1 'Inter',sans-serif;cursor:pointer;padding:0 10px}
.sdr button:hover{background:rgba(255,255,255,.3)}
@media print{.stc,#stdock{display:none!important}}
@media(prefers-reduced-motion:reduce){.stb.ring{animation:none}}`;
  const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
  const dock=document.createElement("div");dock.id="stdock";dock.hidden=true;dock.setAttribute("aria-live","polite");
  (document.body?Promise.resolve():new Promise(r=>addEventListener("DOMContentLoaded",r))).then(()=>document.body.appendChild(dock));

  /* sound: its own audio, started on the tap that starts a timer so phones allow it to play later */
  function ac(){if(!stAc){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;try{stAc=new C()}catch(e){return null}}if(stAc.state==="suspended")stAc.resume();return stAc}
  function beep(f,at,d,v){const a=ac();if(!a)return;const t=a.currentTime+at,o=a.createOscillator(),g=a.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+d+.03)}
  const ringOnce=()=>[0,.26,.52,.78].forEach(t=>beep(1500,t,.22,.14));
  const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};

  async function awake(){
    const on=Object.values(ST).some(t=>t.st=="run");
    try{if(on&&!stLock&&navigator.wakeLock&&document.visibilityState=="visible"){stLock=await navigator.wakeLock.request("screen");stLock.addEventListener("release",()=>{stLock=null})}else if(!on&&stLock){const l=stLock;stLock=null;await l.release()}}catch(e){}
  }
  function draw(k){
    document.querySelectorAll(".stc[data-sk]").forEach(el=>{if(!k||el.dataset.sk===k)el.innerHTML=stepCtl(el.dataset.sk,+el.dataset.dur)});
    drawDock();
  }
  function drawDock(){
    const on=Object.entries(ST).filter(([,t])=>t.st=="run"||t.st=="pause"||t.st=="ring"),x=st$();
    dock.hidden=!on.length;
    dock.innerHTML=on.map(([k,t])=>{const n=k.slice(0,k.lastIndexOf("|")),i=+k.slice(k.lastIndexOf("|")+1)+1,e=stEsc(k);
      return t.st=="ring"?`<div class="sdr ring"><span>\u{1F514} ${stEsc(n)} · ${x.step} ${i}</span><button type="button" data-st="stop" data-k="${e}">${x.stop}</button></div>`
        :`<div class="sdr"><span>${stEsc(n)} · ${x.step} ${i}</span><b class="stt" data-dk="${e}">${stFmt(stLeft(t))}</b><button type="button" data-st="${t.st=="run"?"pause":"go"}" data-k="${e}" aria-label="${t.st=="run"?x.pause:x.resume}">${t.st=="run"?"❚❚":"▶"}</button><button type="button" data-st="reset" data-k="${e}" aria-label="${x.reset}">✕</button></div>`}).join("");
  }
  function ring(k){
    const t=ST[k];if(!t)return;t.st="ring";t.left=0;t.rings=0;
    const n=k.slice(0,k.lastIndexOf("|")),i=+k.slice(k.lastIndexOf("|")+1)+1;
    const go=()=>{if(ST[k]!==t||t.st!="ring")return;ringOnce();vib([200,100,200,100,400]);if(++t.rings>=15){t.st="done";draw(k);return}t.rt=setTimeout(go,2000)};
    go();if(typeof toast=="function")toast(st$().fin(n,i));draw(k);
  }
  function tick(){
    let any=false;
    Object.entries(ST).forEach(([k,t])=>{if(t.st!="run")return;any=true;const l=t.end-Date.now();if(l<=0)ring(k);else document.querySelectorAll(`.stc[data-sk="${CSS.escape(k)}"] .stt,.stt[data-dk="${CSS.escape(k)}"]`).forEach(e=>{e.textContent=stFmt(l)})});
    if(!any){clearInterval(stTick);stTick=0;awake()}
  }
  function act(k,a,dur){
    const t=ST[k]||(ST[k]={st:"idle",dur,left:dur*1000});
    if(a=="go"){ac();beep(1100,0,.05,.05);if(t.st=="done"||t.st=="idle")t.left=t.dur*1000;t.end=Date.now()+t.left;t.st="run";if(!stTick)stTick=setInterval(tick,250)}
    else if(a=="pause"&&t.st=="run"){t.left=t.end-Date.now();t.st="pause"}
    else if(a=="stop"){clearTimeout(t.rt);t.st="done"}
    else if(a=="reset"){clearTimeout(t.rt);t.st="idle";t.left=t.dur*1000}
    draw(k);awake();
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest("[data-st][data-k]");if(!b)return;
    const k=b.dataset.k,c=document.querySelector(`.stc[data-sk="${CSS.escape(k)}"]`);
    act(k,b.dataset.st,ST[k]?ST[k].dur:c?+c.dataset.dur:0);
  });
  /* phones slow timers down in the background: catch up as soon as the page is visible again */
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="visible"){if(stTick)tick();awake()}});
})();
