// Fig 1: Computation graph FF vs Looped
function initFig1(el) {
  const W=560,H=320,LC=12;
  let mode='loop',t=0,playing=true,raf;
  const ly=i=>30+(260/(LC-1))*i;
  const residSeed=(i,l)=>Math.sin(i*1.7+l*0.6)*0.5+Math.sin(i*0.5+l*1.3)*0.4;

  el.innerHTML=`<div class="fig-fill">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
      <div class="seg"><button data-m="ff">Feedforward</button><button class="on" data-m="loop">Looped</button></div>
      <button class="btn" id="f1play">Pause</button>
      <input class="range" type="range" min="0" max="1000" value="0" style="flex:1" id="f1rng">
      <span style="font-family:var(--mono);font-size:11px;color:var(--ink-muted);min-width:60px;text-align:right" id="f1dep">depth 0.0</span>
    </div>
    <div class="fig-fill__main" style="grid-template-columns:1fr 200px">
      <svg id="f1svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"></svg>
      <div id="f1bars" style="display:flex;flex-direction:column;gap:6px;padding-left:8px;border-left:1px solid var(--rule);min-height:0">
        <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint);letter-spacing:.06em;text-transform:uppercase">residual stream · 24d</div>
        <div id="f1bg" style="display:grid;grid-template-columns:repeat(6,1fr);gap:3px;flex:1;min-height:0"></div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint)" id="f1info"></div>
      </div>
    </div>
    <div class="figure-caption"><b>Figure 1 · Computation graph</b> Feedforward applies <i>K</i> distinct blocks once. Looped applies a single shared block <i>R</i> times - same parameters, more compute, the residual stream re-enters the same weights. Watch the loop arc and the bar pattern: the same dimensions get re-stirred, not replaced.</div>
  </div>`;

  const svg=document.getElementById('f1svg'),bars=document.getElementById('f1bg');
  el.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{
    mode=b.dataset.m;el.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));draw();
  }));
  document.getElementById('f1play').addEventListener('click',function(){playing=!playing;this.textContent=playing?'Pause':'Play';if(playing)tick();});
  document.getElementById('f1rng').addEventListener('input',function(){playing=false;document.getElementById('f1play').textContent='Play';t=+this.value/1000;draw();});

  function draw(){
    const depth=t*(LC-1),li=Math.floor(depth),tokY=ly(li)+(ly(Math.min(li+1,LC-1))-ly(li))*(depth-li);
    const loopS=2,loopE=5,loopIter=mode==='loop'?Math.floor(t*3)%3:0;
    document.getElementById('f1dep').textContent=`depth ${depth.toFixed(1)}`;
    document.getElementById('f1rng').value=Math.round(t*1000);

    let s=`<text x="${W/2}" y="14" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".06em">EMBED</text>`;
    s+=`<text x="${W/2}" y="${H-4}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".06em">UNEMBED → next-token</text>`;
    for(let i=0;i<LC;i++){
      const y=ly(i),inL=mode==='loop'&&i>=loopS&&i<=loopE;
      const active=mode==='loop'?(inL?(Math.floor(t*12)%4)===(i-loopS):Math.abs(i-depth)<.6):Math.abs(i-depth)<.6;
      s+=`<rect x="${W/2-80}" y="${y-8}" width="160" height="16" rx="3" fill="${inL?'var(--accent-soft)':'var(--paper)'}" stroke="${active?'var(--accent)':(inL?'var(--accent-line)':'var(--rule-strong)')}" stroke-width="${active?1.4:1}"/>`;
      s+=`<text x="${W/2-70}" y="${y+3.5}" font-family="var(--mono)" font-size="10" fill="var(--ink-soft)">L${i}${inL?' · loop block':''}</text>`;
      s+=`<text x="${W/2+70}" y="${y+3.5}" text-anchor="end" font-family="var(--mono)" font-size="9.5" fill="var(--ink-faint)">${mode==='loop'?(inL?'shared':'unique'):'unique'}</text>`;
      if(i<LC-1)s+=`<line x1="${W/2}" y1="${y+8}" x2="${W/2}" y2="${ly(i+1)-8}" stroke="var(--rule-strong)"/>`;
    }
    if(mode==='loop'){
      s+=`<path d="M ${W/2+80} ${ly(loopE)} C ${W/2+160} ${ly(loopE)}, ${W/2+160} ${ly(loopS)}, ${W/2+80} ${ly(loopS)}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="${li>=loopS&&li<loopE?'0':'3 3'}"/>`;
      s+=`<text x="${W/2+168}" y="${(ly(loopS)+ly(loopE))/2+3}" font-family="var(--mono)" font-size="10" fill="var(--accent)" letter-spacing=".04em">× R = ${loopIter+1}/3</text>`;
    }
    s+=`<circle cx="${W/2-110}" cy="${tokY}" r="4" fill="var(--accent)"/><circle cx="${W/2-110}" cy="${tokY}" r="8" fill="none" stroke="var(--accent)" stroke-opacity=".3"/><text x="${W/2-122}" y="${tokY+3}" text-anchor="end" font-family="var(--mono)" font-size="10" fill="var(--ink-soft)">x</text>`;
    svg.innerHTML=s;

    // Residual bars
    let bh='';const dims=Array.from({length:24},(_,i)=>residSeed(i,depth));
    dims.forEach(v=>{const m=Math.abs(v);bh+=`<div style="background:${v>=0?'var(--accent)':'var(--teal)'};opacity:${.18+m*.7};border-radius:2px;height:${20+m*60}%;align-self:end;transition:height .1s,opacity .1s"></div>`;});
    bars.innerHTML=bh;
    document.getElementById('f1info').textContent=mode==='loop'?`pass ${loopIter+1} · re-applied weights`:`unique block at L${li}`;
  }
  function tick(){if(!playing)return;t=(t+.003)%1;draw();raf=requestAnimationFrame(tick);}
  draw();tick();
}

// Fig 2: PCA fixed points + TTC curves
function initFig2(el) {
  let r=8,show='pca';
  let playing=true,dir=1,autoTimer=null;
  const traj=(()=>{const tgt=[[-6,4],[4,5],[6,-4],[-4,-5]];return tgt.map((t,l)=>{let p=[Math.cos(l*1.7)*9,Math.sin(l*1.7)*9];const path=[];for(let i=0;i<32;i++){const k=.18+l*.02,n=.6*Math.exp(-i*.25);p=[p[0]+(t[0]-p[0])*k+Math.sin(i*(1.3+l))*n,p[1]+(t[1]-p[1])*k+Math.cos(i*(1.7+l*.5))*n];path.push([...p]);}return{path,target:t,color:['var(--accent)','var(--teal)','var(--ink-soft)','var(--ink-muted)'][l]};});})();
  const ttc=[{name:'GSM8K',a:51,k:.085,b:8,c:'var(--accent)'},{name:'ARC-C',a:44,k:.18,b:22,c:'var(--teal)'},{name:'OBQA',a:41,k:.32,b:28,c:'var(--ink-soft)'}].map(t=>({...t,pts:Array.from({length:32},(_,i)=>[i+1,t.b+(t.a-t.b)*(1-Math.exp(-t.k*(i+1)))])}));

  el.innerHTML=`<div class="fig-fill">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">
      <div class="seg"><button class="on" data-s="pca">Latent PCA</button><button data-s="ttc">Test-time compute</button></div>
      <span style="flex:1"></span><button class="btn on" id="f2auto">Pause</button><span style="font-family:var(--mono);font-size:11px;color:var(--ink-muted)" id="f2r">R = 8</span>
    </div>
    <input class="range" type="range" min="1" max="32" value="8" style="margin-bottom:14px" id="f2rng">
    <div style="flex:1;min-height:0">
      <svg id="f2svg" viewBox="0 0 540 380" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"></svg>
    </div>
    <div class="figure-caption"><b>Figure 2 · <span id="f2cap">Cyclic fixed points</span></b> <span id="f2desc">Each line is one layer. As R grows, layers converge to distinct fixed points.</span></div>
  </div>`;

  el.querySelectorAll('.seg button').forEach(b=>b.addEventListener('click',()=>{show=b.dataset.s;el.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x===b));draw();}));
  document.getElementById('f2rng').addEventListener('input',function(){setAuto(false);r=+this.value;document.getElementById('f2r').textContent=`R = ${r}`;draw();});
  document.getElementById('f2auto').addEventListener('click',()=>setAuto(!playing));

  function setAuto(on){
    playing=on;
    const btn=document.getElementById('f2auto');
    btn.classList.toggle('on',on);
    btn.textContent=on?'Pause':'Auto-play';
    if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
    if(on)autoTimer=setInterval(()=>{
      r+=dir;
      if(r>=32){r=32;dir=-1;show=show==='pca'?'ttc':'pca';el.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x.dataset.s===show));}
      if(r<=1){r=1;dir=1;show=show==='pca'?'ttc':'pca';el.querySelectorAll('.seg button').forEach(x=>x.classList.toggle('on',x.dataset.s===show));}
      document.getElementById('f2r').textContent=`R = ${r}`;
      document.getElementById('f2rng').value=r;
      draw();
    },180);
  }

  function draw(){
    const svg=document.getElementById('f2svg');
    if(show==='pca'){
      const W=540,H=380,cx=W/2,cy=H/2,sc=16;
      let s=`<line x1="20" y1="${cy}" x2="${W-20}" y2="${cy}" stroke="var(--rule)" stroke-dasharray="2 3"/><line x1="${cx}" y1="20" x2="${cx}" y2="${H-20}" stroke="var(--rule)" stroke-dasharray="2 3"/>`;
      s+=`<text x="${W-22}" y="${cy-6}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">PC 1</text>`;
      s+=`<text x="${cx+6}" y="24" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">PC 2</text>`;
      traj.forEach((tr,li)=>{
        const sl=tr.path.slice(0,r);
        s+=`<path d="${sl.map(([x,y],i)=>`${i?'L':'M'} ${cx+x*sc} ${cy-y*sc}`).join(' ')}" fill="none" stroke="${tr.color}" stroke-width="1.2" opacity=".85"/>`;
        sl.forEach(([x,y],i)=>{s+=`<circle cx="${cx+x*sc}" cy="${cy-y*sc}" r="${i===sl.length-1?3.4:1.3}" fill="${tr.color}" opacity="${.3+.7*(i/Math.max(1,sl.length-1))}"/>`;});
        s+=`<circle cx="${cx+tr.target[0]*sc}" cy="${cy-tr.target[1]*sc}" r="6" fill="none" stroke="${tr.color}" stroke-dasharray="2 2" opacity=".5"/>`;
        s+=`<text x="${cx+tr.target[0]*sc+9}" y="${cy-tr.target[1]*sc+3}" font-family="var(--mono)" font-size="9" fill="${tr.color}">L${li+1}</text>`;
      });
      s+=`<text x="20" y="${H-8}" font-family="var(--mono)" font-size="9" fill="var(--ink-muted)">recurrences: 1..${r}</text>`;
      svg.innerHTML=s;
      document.getElementById('f2cap').textContent='Cyclic fixed points';
      document.getElementById('f2desc').textContent='Each line is one layer. As R grows, layers converge to distinct fixed points.';
    } else {
      const W=540,H=380,m={l:36,r:14,t:14,b:32},xM=32,yM=60;
      const x=v=>m.l+(v/xM)*(W-m.l-m.r),y=v=>H-m.b-(v/yM)*(H-m.t-m.b);
      let s='';
      [0,15,30,45,60].forEach(v=>{s+=`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/><text x="${m.l-6}" y="${y(v)+3}" text-anchor="end" font-family="var(--mono)" font-size="8" fill="var(--ink-faint)">${v}</text>`;});
      [1,4,8,16,32].forEach(v=>{s+=`<text x="${x(v)}" y="${H-m.b+14}" text-anchor="middle" font-family="var(--mono)" font-size="8" fill="var(--ink-faint)">${v}</text>`;});
      s+=`<text x="${W/2}" y="${H-4}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-muted)">recurrence R</text>`;
      ttc.forEach(t=>{
        s+=`<path d="${t.pts.map(([xv,yv],j)=>`${j?'L':'M'} ${x(xv)} ${y(yv)}`).join(' ')}" fill="none" stroke="${t.c}" stroke-width="1.6" opacity=".4"/>`;
        s+=`<path d="${t.pts.slice(0,r).map(([xv,yv],j)=>`${j?'L':'M'} ${x(xv)} ${y(yv)}`).join(' ')}" fill="none" stroke="${t.c}" stroke-width="2"/>`;
        const cur=t.pts[r-1];
        s+=`<circle cx="${x(cur[0])}" cy="${y(cur[1])}" r="4" fill="${t.c}" stroke="var(--paper)" stroke-width="1.5"/>`;
        s+=`<text x="${x(cur[0])+8}" y="${y(cur[1])-6}" font-family="var(--mono)" font-size="9" fill="${t.c}">${t.name} · ${cur[1].toFixed(1)}%</text>`;
      });
      s+=`<line x1="${x(r)}" y1="${m.t}" x2="${x(r)}" y2="${H-m.b}" stroke="var(--accent-line)" stroke-dasharray="2 3"/>`;
      svg.innerHTML=s;
      document.getElementById('f2cap').textContent='Test-time compute scaling';
      document.getElementById('f2desc').textContent='Accuracy vs recurrence depth. Reasoning tasks keep climbing; memorization plateaus early.';
    }
  }
  draw();setAuto(true);
}

// Fig 3: Architecture zoo
function initFig3(el) {
  const ARCHS=[
    {id:'universal',name:'Universal Transformer',year:'2018',who:'Dehghani',short:'Single shared block applied dynamically per token.',traits:{'share':'all','depth':'adaptive','stability':'low','scale':'small'}},
    {id:'recursive',name:'Recursive / Recurrent-depth',year:'2024-25',who:'Bae / Geiping',short:'Modern recipe: prelude → recurrent block × R → coda. Stable, scaled to 3.5B+.',traits:{'share':'middle only','depth':'test-time scalable','stability':'med','scale':'3.5B'},nw:true},
    {id:'huginn',name:'Huginn',year:'2025',who:'Geiping',short:'Prelude → recurrent block × R → coda. 3.5B, test-time scalable.',traits:{'share':'middle','depth':'scalable','stability':'high','scale':'3.5B'},nw:true},
    {id:'ouro',name:'Ouro (LoopLM)',year:'2025',who:'ByteDance',short:'Learned per-token exit gate. 7.7T tokens.',traits:{'share':'full block','depth':'learned exit','stability':'med','scale':'2.6B'},nw:true},
    {id:'parcae',name:'Parcae',year:'2026',who:'UCSD',short:'Stable looping via negative diagonal parameterization.',traits:{'share':'middle','depth':'predictable','stability':'high','scale':'1.3B'},nw:true},
    {id:'hyperloop',name:'Hyperloop',year:'2026',who:'MIT',short:'Hyper-connections + looping. 50% fewer params.',traits:{'share':'middle+hyper','depth':'fixed R=3','stability':'high','scale':'≤1B'},nw:true},
  ];
  let sel='recursive',playing=true,autoTimer=null,autoIdx=1;

  function archDiagram(a){
    const profiles={
      universal:{p:0,c:0,r:'ACT'},
      recursive:{p:2,c:2,r:'1..64'},
      huginn:{p:2,c:2,r:'1..32'},
      ouro:{p:1,c:1,r:'learned'},
      parcae:{p:2,c:2,r:'1..16'},
      hyperloop:{p:2,c:2,r:'3'}
    };
    const cfg=profiles[a.id]||profiles.recursive;
    const W=180;
    const blocks=[];
    let y=24;
    const add=(label,kind)=>{blocks.push({y,label,kind});y+=kind==='loop'?54:22;};
    for(let i=0;i<cfg.p;i++)add(`prelude L${i+1}`,'pre');
    add(`recurrent block (x${cfg.r})`,'loop');
    for(let i=0;i<cfg.c;i++)add(`coda L${i+1}`,'post');
    const H=y+18;
    const parts=blocks.map((b,i)=>{
      const isLoop=b.kind==='loop';
      const h=isLoop?44:14;
      const next=blocks[i+1];
      return `<g>
        <rect x="20" y="${b.y}" width="${W-40}" height="${h}" rx="3" fill="${isLoop?'var(--accent-soft)':'var(--paper)'}" stroke="${isLoop?'var(--accent-line)':'var(--rule-strong)'}"></rect>
        <text x="${W/2}" y="${b.y+(isLoop?18:9.5)}" text-anchor="middle" font-family="var(--mono)" font-size="9.5" fill="${isLoop?'var(--accent)':'var(--ink-soft)'}">${b.label}</text>
        ${isLoop?`<text x="${W/2}" y="${b.y+32}" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill="var(--ink-muted)">shared params</text>
        <path d="M ${W-22} ${b.y+12} C ${W+8} ${b.y+20}, ${W+8} ${b.y+34}, ${W-22} ${b.y+42}" fill="none" stroke="var(--accent)" stroke-dasharray="2 2"></path>`:''}
        ${next?`<line x1="${W/2}" y1="${b.y+h}" x2="${W/2}" y2="${next.y}" stroke="var(--ink-faint)"></line><path d="M ${W/2-3} ${next.y-5} L ${W/2} ${next.y} L ${W/2+3} ${next.y-5}" fill="none" stroke="var(--ink-faint)"></path>`:''}
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;max-height:300px">
      <text x="${W/2}" y="12" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".06em">EMBED</text>
      ${parts}
      <text x="${W/2}" y="${H-4}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".06em">UNEMBED</text>
    </svg>`;
  }

  function render(){
    const a=ARCHS.find(x=>x.id===sel);
    el.innerHTML=`<div class="fig-fill">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
        <button class="btn${playing?' on':''}" id="f3auto">${playing?'Pause':'Auto-play'}</button>
        <span style="font-family:var(--mono);font-size:10px;color:var(--ink-muted)">cycle through architectures</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:14px">
        ${ARCHS.map(x=>`<button class="btn${sel===x.id?' on':''}" data-a="${x.id}" style="text-align:left;padding:8px 10px;text-transform:none;letter-spacing:0;line-height:1.3;font-size:11.5px;position:relative">
          <span style="font-family:var(--mono);font-size:9.5px;color:var(--ink-faint);letter-spacing:.04em">${x.year}</span><br>
          <span style="font-weight:500">${x.name}</span>
          ${x.nw?'<span style="position:absolute;top:6px;right:6px;font-family:var(--mono);font-size:8.5px;color:var(--accent);border:1px solid var(--accent-line);background:var(--accent-soft);padding:1px 4px;border-radius:3px">NEW</span>':''}
        </button>`).join('')}
      </div>
      <div style="flex:1;min-height:0;display:grid;grid-template-columns:200px 1fr;gap:16px;border:1px solid var(--rule);border-radius:var(--radius);background:var(--paper);padding:16px">
        <div style="min-height:0;display:flex;align-items:center">${archDiagram(a)}</div>
        <div style="min-width:0">
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint);letter-spacing:.06em;text-transform:uppercase">${a.year} · ${a.who}</div>
          <h3 style="margin:4px 0 8px;font-size:18px">${a.name}</h3>
          <p style="font-size:13.5px;line-height:1.5;color:var(--ink-soft);margin:0">${a.short}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-family:var(--mono);font-size:11px;margin-top:14px">
            ${Object.entries(a.traits).map(([k,v])=>`<b style="color:var(--ink-faint);font-weight:400;font-size:10px;text-transform:uppercase;letter-spacing:.04em">${k}</b><span style="color:var(--ink)">${v}</span>`).join('')}
          </div>
        </div>
      </div>
      <div class="figure-caption"><b>Figure 3 · Architecture zoo</b> Six looped designs. They differ in what is shared, how R is chosen, and how stability is achieved.</div>
    </div>`;
    document.getElementById('f3auto').addEventListener('click',()=>setAuto(!playing));
    el.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{setAuto(false);sel=b.dataset.a;autoIdx=ARCHS.findIndex(x=>x.id===sel);render();}));
  }
  function setAuto(on){
    playing=on;
    if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
    if(on)autoTimer=setInterval(()=>{autoIdx=(autoIdx+1)%ARCHS.length;sel=ARCHS[autoIdx].id;render();},2200);
    const btn=document.getElementById('f3auto');
    if(btn){btn.classList.toggle('on',on);btn.textContent=on?'Pause':'Auto-play';}
  }
  render();setAuto(true);
}

// Fig 4: Depth-budget allocator
function initFig4(el) {
  let playing=true,autoTimer=null,phase=0;
  el.innerHTML=`<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px"><button class="btn on" id="f4auto">Pause</button><span style="font-family:var(--mono);font-size:10px;color:var(--ink-muted)">sweep budget and split</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px">
    <div><div style="font-family:var(--mono);font-size:9px;color:var(--ink-faint);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">FLOPs budget</div>
      <input type="range" min="2" max="16" value="8" id="f4b" style="width:100%">
      <div style="font-family:var(--mono);font-size:10px;color:var(--ink-muted);margin-top:2px" id="f4bl"></div></div>
    <div><div style="font-family:var(--mono);font-size:9px;color:var(--ink-faint);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px">Split: params ↔ loops</div>
      <input type="range" min="0" max="100" value="50" id="f4p" style="width:100%">
      <div style="font-family:var(--mono);font-size:10px;color:var(--ink-muted);margin-top:2px" id="f4pl"></div></div>
  </div>
  <div style="border:1px solid var(--rule);border-radius:var(--radius);padding:14px;background:var(--paper)" id="f4out"></div>
  <div class="figure-caption"><b>Figure 4 · Depth-budget allocator</b> Drag the split. A looped model trades memory for inference compute.</div>`;

  function draw(){
    const budget=+document.getElementById('f4b').value,params=+document.getElementById('f4p').value;
    const loops=Math.max(1,Math.round(budget*(100-params)/12)),paramScale=Math.round(50+params*5);
    const matchedFF=paramScale*loops;
    const baseQ=60+6*Math.log2(paramScale/50)+4.5*Math.log2(loops);
    const quality=baseQ*(1-.0006*Math.pow(params-55,2));
    const memoryPct=Math.min(100,Math.max(8,paramScale/600*100));
    const computePct=Math.min(100,Math.max(8,matchedFF/12000*100));
    const latencyPct=Math.min(100,Math.max(8,loops/40*100));
    const bar=(label,value,pct,color)=>`
      <div style="margin-bottom:14px">
        <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:baseline;font-family:var(--mono);font-size:10.5px;color:var(--ink-muted);margin-bottom:5px">
          <span>${label}</span><span style="color:var(--ink-soft)">${value}</span>
        </div>
        <div style="height:10px;border:1px solid var(--rule);border-radius:3px;background:var(--bg-tint);overflow:hidden">
          <span style="display:block;height:100%;width:${pct}%;background:${color}"></span>
        </div>
      </div>`;
    document.getElementById('f4bl').textContent=`~${(Math.log2(budget)+5).toFixed(1)} log₂ FLOPs`;
    document.getElementById('f4pl').innerHTML=`<span style="color:var(--ink-muted)">← all-loop</span> <span style="color:var(--accent)">${params}% params · ${100-params}% loops</span> <span style="color:var(--ink-muted)">all-param →</span>`;
    document.getElementById('f4out').innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;min-height:250px">
        <div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint);letter-spacing:.09em;text-transform:uppercase;margin-bottom:14px">Chosen configuration</div>
          <div style="font-size:34px;font-weight:500;letter-spacing:-.03em;line-height:1;margin-bottom:14px">${paramScale}M × ${loops}<span style="color:var(--ink-faint);font-size:19px;margin-left:3px">loops</span></div>
          <div style="font-size:13px;color:var(--ink-muted);line-height:1.45;margin-bottom:20px">Acts like a feedforward model with <b style="color:var(--accent)">${(matchedFF/1000).toFixed(1)}B</b> materialized FLOPs at inference, while paying memory for ${paramScale}M parameters.</div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px">Predicted quality (toy)</div>
          <div style="font-size:42px;font-weight:500;color:var(--accent);letter-spacing:-.03em;line-height:1">${quality.toFixed(1)}</div>
          <div style="font-size:12px;color:var(--ink-muted);margin-top:4px">arbitrary CORE-style score</div>
        </div>
        <div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-faint);letter-spacing:.09em;text-transform:uppercase;margin-bottom:18px">Memory vs compute</div>
          ${bar('memory footprint',`${paramScale}M params`,memoryPct,'var(--ink-soft)')}
          ${bar('compute @ inference',`${(matchedFF/1000).toFixed(1)}B effective`,computePct,'var(--accent)')}
          ${bar('latency (token)',`${loops}× block`,latencyPct,'var(--teal)')}
          <div style="font-size:13px;color:var(--ink-muted);line-height:1.45;margin-top:22px"><b style="color:var(--ink)">Heuristic from Parcae:</b> at fixed FLOPs, jointly increase loops and data; loop count scales sub-linearly. Pure all-param wins memorization; pure all-loop wins reasoning.</div>
        </div>
      </div>`;
  }
  document.getElementById('f4b').addEventListener('input',()=>{setAuto(false);draw();});
  document.getElementById('f4p').addEventListener('input',()=>{setAuto(false);draw();});
  document.getElementById('f4auto').addEventListener('click',()=>setAuto(!playing));
  function setAuto(on){
    playing=on;
    const btn=document.getElementById('f4auto');
    btn.classList.toggle('on',on);
    btn.textContent=on?'Pause':'Auto-play';
    if(autoTimer){clearInterval(autoTimer);autoTimer=null;}
    if(on)autoTimer=setInterval(()=>{
      phase+=0.055;
      document.getElementById('f4b').value=Math.round(9+6*Math.sin(phase));
      document.getElementById('f4p').value=Math.round(54+28*Math.sin(phase*.73+1.1));
      draw();
    },140);
  }
  draw();setAuto(true);
}

// Fig 5: Stages of inference
function initFig5(el) {
  const stages=[{n:'Detokenization',c:'var(--ink-faint)'},{n:'Feature build-up',c:'var(--teal)'},{n:'Reasoning',c:'var(--accent)'},{n:'Token prediction',c:'var(--ink-soft)'}];
  const ff=[0,0,1,1,1,2,2,2,2,3,3,3],lp=[[0,1,2,3],[0,1,2,3],[0,1,2,3]];

  function bar(row,loop,pass){
    return `<div style="display:flex;gap:2px;flex:1;${loop?'border:1px dashed var(--accent-line);border-radius:4px;padding:4px;position:relative':''}">
      ${loop?`<span style="position:absolute;top:-8px;left:6px;background:var(--bg);font-family:var(--mono);font-size:8px;color:var(--accent);padding:0 3px">pass ${pass}</span>`:''}
      ${row.map(si=>`<div style="flex:1;background:${stages[si].c};opacity:.85;border-radius:2px;min-height:28px" title="${stages[si].n}"></div>`).join('')}
    </div>`;
  }

  el.innerHTML=`
    <div style="margin-bottom:14px">
      <div style="font-family:var(--mono);font-size:9px;color:var(--ink-muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">Feedforward · 12 distinct layers</div>
      <div style="display:flex;gap:2px;height:36px">${bar(ff,false)}</div>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-family:var(--mono);font-size:9px;color:var(--ink-muted);letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px">Looped · 4-layer block × 3 passes</div>
      <div style="display:flex;gap:6px;height:36px">${lp.map((r,i)=>bar(r,true,i+1)).join('')}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">${stages.map(s=>`<div style="display:flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-muted)"><span style="width:10px;height:10px;background:${s.c};border-radius:2px;display:inline-block"></span>${s.n}</div>`).join('')}</div>
    <div class="figure-caption"><b>Figure 5 · Stages of inference</b> Looped models repeat all four stages once per recurrence — the block learns to be a miniature FF transformer.</div>`;
}

// Init all figures on load
document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('.figure-slot').forEach(slot=>{
    const fig=+slot.dataset.fig,body=slot.querySelector('.figure-body');
    if(!body)return;
    if(fig===1)initFig1(body);
    if(fig===2)initFig2(body);
    if(fig===3)initFig3(body);
    if(fig===4)initFig4(body);
    if(fig===5)initFig5(body);
  });
});
