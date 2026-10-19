/* Recipe videos: plays YouTube recipe videos with the sound permanently off.
   - The video always starts muted, and is re-muted 5 times a second in case anything turns it on.
   - YouTube's own controls are hidden and a clear layer sits on top of the video, so nobody can
     reach YouTube's volume button, keyboard shortcuts, logo or "watch on YouTube" links.
   - If YouTube's player script fails to load, no video is shown at all (it never falls back to a
     normal player that could play sound).

   To add a video: put the dish name exactly as it appears on the recipe card, and the video ID
   (the part after "v=" in the YouTube link, e.g. youtube.com/watch?v=FCsO0RaxqTY -> "FCsO0RaxqTY"). */
const VIDEOS={
  "Biryani":"DhKd9RwL4m8",
  "Aloo Gosht":"FCsO0RaxqTY",
  "Achar Gosht":"ThU7j6m_R5Y",
  "Palak Gosht":"JJ42Aq4UAGw",
  "Nihari":"1Kd3mhopYaE",
  "Aloo Qeema":"ewat8Dt52l8",
  "Malai Boti":"tdhb8lPrAbg",
  "Mix Sabzi":"L7LXJ7FiRPA",
  "Macaroni and Cheese":"jENjWNk58_c",
  "Fettuccine Alfredo":"WpdvMQRSalg"
};
const VCREDIT="Food Fusion";

const VTXT={
  en:{watch:"Watch video",off:"Sound is permanently off",by:"Video by",play:"Play",pause:"Pause",back:"Back 10 seconds",fwd:"Forward 10 seconds",full:"Full screen",close:"Close",again:"Watch again",load:"Loading video…",fail:"This video couldn't load. Please try again later."},
  ur:{watch:"Video dekhein",off:"Awaaz hamesha band hai",by:"Video:",play:"Chalayein",pause:"Rokein",back:"10 second peeche",fwd:"10 second aage",full:"Poori screen",close:"Band karein",again:"Dobara dekhein",load:"Video load ho rahi hai…",fail:"Yeh video load nahi ho saki. Thori der baad koshish karein."}
};
const vt=()=>VTXT[typeof lang!="undefined"&&lang!="en"?"ur":"en"];
const vidBtn=name=>VIDEOS[name]?`<button class="share vidbtn" data-vid="${name}">▶ ${vt().watch}</button>`:"";

(function(){
  const css=`.vidbtn{background:#fff;cursor:pointer;font-family:inherit}
.vmodal{position:fixed;inset:0;z-index:60;background:rgba(43,35,31,.6);display:flex;align-items:center;justify-content:center;padding:16px}
.vbox{background:#fff;border-radius:18px;max-width:760px;width:100%;padding:14px;box-shadow:0 20px 50px rgba(43,35,31,.3)}
.vhead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 10px}
.vhead h3{margin:0;font-size:17px}
.vx{border:0;background:var(--stone);color:var(--ink);width:36px;height:36px;border-radius:50%;font-size:20px;cursor:pointer;flex:none}
.vframe{position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden}
.vframe:fullscreen{border-radius:0}
.vframe iframe,.vframe>div{position:absolute;inset:0;width:100%;height:100%;border:0}
.vshield{z-index:2;cursor:pointer;background:transparent}
.vcover{z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#fff;background:rgba(0,0,0,.75);text-align:center;padding:20px;font-size:15px}
.vcover[hidden]{display:none}
.vctl{display:flex;align-items:center;gap:8px;margin-top:10px}
.vctl button{border:2px solid var(--ink);background:#fff;color:var(--ink);border-radius:18px;min-width:44px;height:38px;padding:0 10px;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;flex:none}
.vctl input{flex:1;min-width:0;accent-color:var(--red)}
.vtime{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums;flex:none}
.vnote{margin:10px 2px 0;font-size:12px;color:var(--mut)}
@media(max-width:620px){.vbox{padding:10px}.vctl{gap:6px}.vctl button{min-width:40px;padding:0 8px}.vtime{display:none}}`;
  const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  let api=null;
  function loadApi(){
    if(api)return api;
    api=new Promise((ok,bad)=>{
      if(window.YT&&YT.Player)return ok();
      const prev=window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady=()=>{prev&&prev();ok()};
      const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";s.onerror=bad;document.head.appendChild(s);
      setTimeout(bad,15000);
    });
    api.catch(()=>{api=null});
    return api;
  }

  const fmt=s=>{s=Math.max(0,Math.floor(s||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};
  let cur=null;

  function close(){
    if(!cur)return;
    clearInterval(cur.guard);
    try{cur.p&&cur.p.destroy()}catch(e){}
    if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
    cur.el.remove();document.removeEventListener("keydown",onKey);
    cur.from&&cur.from.focus();cur=null;
  }
  function onKey(e){if(e.key=="Escape")close()}

  function open(name,from){
    close();
    const id=VIDEOS[name],x=vt();if(!id)return;
    const el=document.createElement("div");el.className="vmodal";
    const canFull=document.fullscreenEnabled;
    el.innerHTML=`<div class="vbox" role="dialog" aria-modal="true" aria-labelledby="vT">
<div class="vhead"><h3 id="vT"></h3><button class="vx" aria-label="${x.close}">×</button></div>
<div class="vframe"><div id="vplayer"></div><div class="vshield" aria-hidden="true"></div><div class="vcover">${x.load}</div></div>
<div class="vctl"><button data-v="play" aria-label="${x.play}">▶</button><button data-v="back" aria-label="${x.back}">↺ 10</button><button data-v="fwd" aria-label="${x.fwd}">10 ↻</button><input type="range" min="0" max="1000" value="0" aria-label="Seek"><span class="vtime">0:00 / 0:00</span>${canFull?`<button data-v="full" aria-label="${x.full}">⛶</button>`:""}</div>
<p class="vnote">🔇 ${x.off} · ${x.by} ${VCREDIT} (YouTube)</p></div>`;
    el.querySelector("#vT").textContent=name;
    document.body.appendChild(el);
    cur={el,from,p:null,guard:0,ready:false};
    const me=cur,cover=el.querySelector(".vcover"),pb=el.querySelector('[data-v="play"]'),bar=el.querySelector("input"),tm=el.querySelector(".vtime");
    el.addEventListener("click",e=>{if(e.target===el)close()});
    el.querySelector(".vx").addEventListener("click",close);
    el.querySelector(".vx").focus();
    document.addEventListener("keydown",onKey);

    const silence=()=>{const p=me.p;if(!p||!p.mute)return;try{if(!p.isMuted())p.mute();if(p.getVolume()>0)p.setVolume(0)}catch(e){}};
    const toggle=()=>{const p=me.p;if(!me.ready)return;silence();const s=p.getPlayerState();if(s==1||s==3)p.pauseVideo();else{cover.hidden=true;p.playVideo()}};
    const seekBy=n=>{if(!me.ready)return;me.p.seekTo(Math.max(0,me.p.getCurrentTime()+n),true)};
    el.querySelector(".vshield").addEventListener("click",toggle);
    el.querySelector(".vshield").addEventListener("contextmenu",e=>e.preventDefault());
    cover.addEventListener("click",e=>{if(e.target.closest("button")){me.p.seekTo(0,true);cover.hidden=true;silence();me.p.playVideo()}});
    el.querySelector(".vctl").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const v=b.dataset.v;
      if(v=="play")toggle();else if(v=="back")seekBy(-10);else if(v=="fwd")seekBy(10);
      else if(v=="full"){const f=el.querySelector(".vframe");document.fullscreenElement?document.exitFullscreen():f.requestFullscreen().catch(()=>{})}});
    bar.addEventListener("input",()=>{if(me.ready)me.p.seekTo(bar.value/1000*me.p.getDuration(),true)});

    loadApi().then(()=>{
      if(cur!==me)return;
      // If the mute lock can't talk to the player within 12 seconds, remove the video rather than leave it unguarded.
      const failsafe=setTimeout(()=>{if(cur===me&&!me.ready){clearInterval(me.guard);try{me.p.destroy()}catch(e){}me.p=null;cover.textContent=x.fail;cover.hidden=false}},12000);
      me.p=new YT.Player("vplayer",{videoId:id,
        playerVars:{mute:1,controls:0,disablekb:1,fs:0,rel:0,iv_load_policy:3,playsinline:1,modestbranding:1,cc_load_policy:0},
        events:{
          onReady:()=>{
            if(cur!==me)return;
            clearTimeout(failsafe);silence();me.ready=true;
            const f=el.querySelector("iframe");if(f){f.setAttribute("tabindex","-1");f.setAttribute("aria-hidden","true")}
            cover.hidden=true;me.p.playVideo();
          },
          onStateChange:e=>{
            silence();
            const s=e.data;pb.textContent=s==1||s==3?"❚❚":"▶";pb.setAttribute("aria-label",s==1||s==3?x.pause:x.play);
            if(s==0){cover.innerHTML=`<button class="btn">↺ ${x.again}</button>`;cover.hidden=false}
          },
          onError:()=>{cover.textContent=x.fail;cover.hidden=false}
        }});
      me.guard=setInterval(()=>{
        silence();
        if(me.ready&&document.activeElement!==bar){const d=me.p.getDuration()||0,t=me.p.getCurrentTime()||0;bar.value=d?Math.round(t/d*1000):0;tm.textContent=fmt(t)+" / "+fmt(d)}
      },200);
    }).catch(()=>{if(cur===me){cover.textContent=x.fail;cover.hidden=false}});
  }

  document.addEventListener("click",e=>{const b=e.target.closest(".vidbtn");if(!b)return;e.preventDefault();e.stopPropagation();open(b.dataset.vid,b)},true);
})();
