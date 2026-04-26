function el(id){return document.getElementById(id)}
function svgLine(points, sx, sy){return points.map((p,i)=>`${i?'L':'M'} ${sx(p[0])} ${sy(p[1])}`).join(' ')}
function addAutoButton(root,onToggle){
  const controls=root.querySelector('.depth-controls');
  if(!controls)return null;
  const btn=document.createElement('button');
  btn.className='btn';
  btn.textContent='Auto-play';
  controls.appendChild(btn);
  let on=false;
  function setAuto(next){
    on=next;
    btn.classList.toggle('on',on);
    btn.textContent=on?'Pause':'Auto-play';
    onToggle(on);
  }
  btn.addEventListener('click',()=>setAuto(!on));
  setAuto(true);
  return btn;
}
function addLabAuto(root,step,interval=2300){
  const controls=root.querySelector('.intuition-lab__controls');
  if(!controls)return null;
  const btn=document.createElement('button');
  btn.className='btn on';
  btn.textContent='Pause';
  controls.appendChild(btn);
  let timer=setInterval(step,interval);
  btn.addEventListener('click',()=>{
    if(timer){
      clearInterval(timer);
      timer=0;
      btn.classList.remove('on');
      btn.textContent='Auto-play';
    }else{
      timer=setInterval(step,interval);
      btn.classList.add('on');
      btn.textContent='Pause';
    }
  });
  return ()=>{if(timer){clearInterval(timer);timer=0}btn.classList.remove('on');btn.textContent='Auto-play'};
}
function labRows(rows){
  return rows.map(([k,v])=>`<div class="row"><b>${k}</b><span>${v}</span></div>`).join('');
}
function plotLine(vals,{label,color='var(--accent)',max=1.2}={}){
  const W=520,H=240,m={l:34,r:16,t:22,b:30};
  const x=i=>m.l+i/(vals.length-1)*(W-m.l-m.r);
  const y=v=>H-m.b-Math.min(max,Math.max(0,v))/max*(H-m.t-m.b);
  const d=vals.map((v,i)=>`${i?'L':'M'} ${x(i)} ${y(v)}`).join(' ');
  let s=`<svg viewBox="0 0 ${W} ${H}">`;
  [0,.25,.5,.75,1].forEach(v=>s+=`<line x1="${m.l}" y1="${y(v*max)}" x2="${W-m.r}" y2="${y(v*max)}" stroke="var(--rule)"/><text x="${m.l-7}" y="${y(v*max)+3}" text-anchor="end" font-family="var(--mono)" font-size="8.5" fill="var(--ink-faint)">${(v*max).toFixed(1)}</text>`);
  s+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2"/>`;
  vals.forEach((v,i)=>{if(i%3===0||i===vals.length-1)s+=`<circle cx="${x(i)}" cy="${y(v)}" r="${i===vals.length-1?4:2.2}" fill="${color}"/>`});
  s+=`<text x="${m.l}" y="14" font-family="var(--mono)" font-size="9.5" fill="var(--ink-muted)" letter-spacing=".06em">${label||''}</text>`;
  s+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" font-family="var(--mono)" font-size="9.5" fill="var(--ink-muted)">recurrence step</text></svg>`;
  return s;
}

function initDistanceLab(){
  const root=el('distance-lab'); if(!root)return;
  const modes=['fixed','orbit','slider','ouro'];
  let mode='fixed',idx=0,stopAuto=null;
  const cfg={
    fixed:{name:'Fixed point',color:'var(--teal)',note:'Distance to a late-recursion reference collapses quickly. This is the clean Huginn-style case.',rows:[['state distance','shrinks toward zero'],['attention','stabilizes'],['extra R','usually safe']]},
    orbit:{name:'Orbit',color:'var(--accent)',note:'Distance never collapses because the state keeps moving around a bounded cycle. Stability here means repeatable motion.',rows:[['state distance','bounded oscillation'],['attention','periodic'],['extra R','safe if the orbit holds']]},
    slider:{name:'Slider',color:'var(--ink-soft)',note:'The state moves along a direction instead of returning to one point. This can carry a counter-like latent variable.',rows:[['state distance','keeps drifting'],['attention','partly stable'],['extra R','must be checked']]},
    ouro:{name:'Ouro exception',color:'var(--accent)',note:'Ouro can show cyclic similarity while failing a strict fixed-point test over long recurrence.',rows:[['state distance','slow or uneven decay'],['attention','related across cycles'],['extra R','word carefully']]}
  };
  function valsFor(m){
    return Array.from({length:25},(_,i)=>{
      if(m==='fixed')return .95*Math.exp(-i*.22)+.025;
      if(m==='orbit')return .48+.18*Math.sin(i*.72);
      if(m==='slider')return .18+i*.028+.04*Math.sin(i*.35);
      return .76-.012*i+.08*Math.sin(i*.6);
    });
  }
  function draw(){
    const c=cfg[mode];
    root.querySelectorAll('[data-distance-mode]').forEach(b=>b.classList.toggle('on',b.dataset.distanceMode===mode));
    root.querySelector('.intuition-viz').innerHTML=plotLine(valsFor(mode),{label:c.name+' · same-layer distance',color:c.color,max:1.05});
    root.querySelector('.intuition-readout').innerHTML=labRows(c.rows);
    root.querySelector('.intuition-note').textContent=c.note;
  }
  root.querySelectorAll('[data-distance-mode]').forEach(b=>b.addEventListener('click',()=>{if(stopAuto)stopAuto();mode=b.dataset.distanceMode;idx=modes.indexOf(mode);draw()}));
  stopAuto=addLabAuto(root,()=>{idx=(idx+1)%modes.length;mode=modes[idx];draw()});
  draw();
}

function initRhoLab(){
  const root=el('rho-lab'); if(!root)return;
  const modes=['stable','marginal','exploding'];
  let mode='stable',idx=0,stopAuto=null;
  const cfg={
    stable:{rho:.86,color:'var(--teal)',note:'Repeated application damps the state. Parcae tries to make this family of updates easy to represent.',rows:[['rho','0.86'],['norm path','settles'],['training risk','low']]},
    marginal:{rho:1.03,color:'var(--ink-soft)',note:'The state does not blow up immediately, but the run is sensitive to depth and optimization noise.',rows:[['rho','1.03'],['norm path','slow growth'],['training risk','medium']]},
    exploding:{rho:1.16,color:'var(--accent)',note:'A small expansion per loop compounds. This is the residual-explosion failure mode Parcae is designed to avoid.',rows:[['rho','1.16'],['norm path','geometric growth'],['training risk','high']]}
  };
  function valsFor(rho){let h=1;return Array.from({length:22},()=>{const v=h;h=h*rho+.12;return Math.min(8,v)})}
  function setScene(nextMode){
    if(nextMode)mode=nextMode;
    idx=Math.max(0,modes.indexOf(mode));
    draw();
    window.dispatchEvent(new CustomEvent('rho-mode-change',{detail:{mode}}));
  }
  function draw(){
    const c=cfg[mode];
    root.querySelectorAll('[data-rho-mode]').forEach(b=>b.classList.toggle('on',b.dataset.rhoMode===mode));
    root.querySelector('.intuition-viz').innerHTML=plotLine(valsFor(c.rho),{label:'residual norm under repeated update',color:c.color,max:8});
    root.querySelector('.intuition-readout').innerHTML=labRows(c.rows);
    root.querySelector('.intuition-note').textContent=c.note;
  }
  root.querySelectorAll('[data-rho-mode]').forEach(b=>b.addEventListener('click',()=>{if(stopAuto)stopAuto();setScene(b.dataset.rhoMode)}));
  stopAuto=addLabAuto(root,()=>{idx=(idx+1)%modes.length;setScene(modes[idx])});
  const scenes=[...document.querySelectorAll('.rho-scene')];
  if(scenes.length){
    let activeScene=null,raf=0;
    function applyScrollScene(){
      raf=0;
      const probe=window.innerHeight*.38;
      let best=null,bestDist=Infinity;
      scenes.forEach(sec=>{
        const r=sec.getBoundingClientRect();
        if(r.bottom<probe*.55||r.top>window.innerHeight*.72)return;
        const dist=Math.abs((r.top+r.bottom)/2-probe);
        if(dist<bestDist){best=sec;bestDist=dist}
      });
      if(!best)return;
      if(best!==activeScene){
        activeScene=best;
        if(stopAuto)stopAuto();
        setScene(best.dataset.rhoMode||mode);
      }
    }
    function applyHashScene(){
      const id=location.hash&&location.hash.slice(1);
      const sec=id?document.getElementById(id):null;
      if(!sec||!sec.classList.contains('rho-scene'))return false;
      activeScene=sec;
      if(stopAuto)stopAuto();
      setScene(sec.dataset.rhoMode||mode);
      return true;
    }
    window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(applyScrollScene)},{passive:true});
    window.addEventListener('hashchange',()=>setTimeout(()=>{if(!applyHashScene())applyScrollScene()},30));
    setTimeout(()=>{if(!applyHashScene())applyScrollScene()},120);
  }
  draw();
}

function initExitLab(){
  const root=el('exit-lab'); if(!root)return;
  const tokens=['easy','medium','hard'];
  const policies=['kl','ponder'];
  let token='easy',policy='kl',idx=0,stopAuto=null;
  const difficulty={easy:2.2,medium:4.2,hard:7.2};
  function deltas(){const d=difficulty[token];return Array.from({length:8},(_,i)=>Math.exp(-(i+1)/d))}
  function exitStep(ds){
    if(policy==='kl')return Math.max(1,ds.findIndex(v=>v<.24)+1||8);
    const center={easy:2.4,medium:4.6,hard:6.4}[token];
    return Math.round(center);
  }
  function setScene(nextToken,nextPolicy){
    if(nextToken)token=nextToken;
    if(nextPolicy)policy=nextPolicy;
    idx=Math.max(0,tokens.indexOf(token));
    draw();
  }
  function draw(){
    root.querySelectorAll('[data-token]').forEach(b=>b.classList.toggle('on',b.dataset.token===token));
    root.querySelectorAll('[data-policy]').forEach(b=>b.classList.toggle('on',b.dataset.policy===policy));
    const ds=deltas(),exit=exitStep(ds),W=520,H=250,m={l:38,r:20,t:22,b:28},barH=17,gap=9;
    let s=`<svg viewBox="0 0 ${W} ${H}"><text x="${m.l}" y="14" font-family="var(--mono)" font-size="9.5" fill="var(--ink-muted)" letter-spacing=".06em">state change by loop · ${policy==='kl'?'threshold exit':'learned exit probability'}</text>`;
    ds.forEach((v,i)=>{
      const y=m.t+i*(barH+gap),w=(W-m.l-m.r)*v;
      s+=`<text x="${m.l-8}" y="${y+12}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">R${i+1}</text>`;
      s+=`<rect x="${m.l}" y="${y}" width="${W-m.l-m.r}" height="${barH}" rx="3" fill="var(--bg-tint)" stroke="var(--rule)"/>`;
      s+=`<rect x="${m.l}" y="${y}" width="${w}" height="${barH}" rx="3" fill="${i+1===exit?'var(--accent)':'var(--teal)'}" opacity="${i+1===exit?1:.7}"/>`;
      if(i+1===exit)s+=`<text x="${m.l+w+8}" y="${y+12}" font-family="var(--mono)" font-size="9" fill="var(--accent)">exit</text>`;
    });
    s+=`</svg>`;
    root.querySelector('.intuition-viz').innerHTML=s;
    root.querySelector('.intuition-readout').innerHTML=labRows([['token',token],['policy',policy==='kl'?'KL threshold':'ponder gate'],['exit','R '+exit],['unused loops',String(8-exit)]]);
    root.querySelector('.intuition-note').textContent=token==='hard'?'Hard tokens keep large state changes for longer, so the exit shifts right.':'Easy tokens settle earlier, so adaptive compute avoids spending the full loop budget.';
  }
  root.querySelectorAll('[data-token]').forEach(b=>b.addEventListener('click',()=>{if(stopAuto)stopAuto();setScene(b.dataset.token,policy)}));
  root.querySelectorAll('[data-policy]').forEach(b=>b.addEventListener('click',()=>{if(stopAuto)stopAuto();setScene(token,b.dataset.policy)}));
  stopAuto=addLabAuto(root,()=>{idx=(idx+1)%tokens.length;token=tokens[idx];if(idx===0)policy=policy==='kl'?'ponder':'kl';draw()});
  const scenes=[...document.querySelectorAll('.exit-scene')];
  if(scenes.length){
    let activeScene=null,raf=0;
    function applyScrollScene(){
      raf=0;
      const probe=window.innerHeight*.38;
      let best=null,bestDist=Infinity;
      scenes.forEach(sec=>{
        const r=sec.getBoundingClientRect();
        if(r.bottom<probe*.55||r.top>window.innerHeight*.72)return;
        const dist=Math.abs((r.top+r.bottom)/2-probe);
        if(dist<bestDist){best=sec;bestDist=dist}
      });
      if(!best)return;
      if(best!==activeScene){
        activeScene=best;
        if(stopAuto)stopAuto();
        setScene(best.dataset.exitToken||token,best.dataset.exitPolicy||policy);
      }
    }
    function applyHashScene(){
      const id=location.hash&&location.hash.slice(1);
      const sec=id?document.getElementById(id):null;
      if(!sec||!sec.classList.contains('exit-scene'))return false;
      activeScene=sec;
      if(stopAuto)stopAuto();
      setScene(sec.dataset.exitToken||token,sec.dataset.exitPolicy||policy);
      return true;
    }
    window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(applyScrollScene)},{passive:true});
    window.addEventListener('hashchange',()=>setTimeout(()=>{if(!applyHashScene())applyScrollScene()},30));
    setTimeout(()=>{if(!applyHashScene())applyScrollScene()},120);
  }
  draw();
}

function initFixedPointViz(){
  const root=el('fixed-viz'); if(!root)return;
  let mode='fixed', targetMode='fixed', steps=8, targetSteps=8, raf=0, autoTimer=0, autoIdx=0;
  const stageForMode={fixed:'settle', ouro:'exception', orbit:'orbit', slider:'slider'};
  const modes={
    fixed:{label:'Fixed point',desc:'Huginn and the retrofitted Llama runs move quickly toward layer-specific endpoints.'},
    orbit:{label:'Orbit',desc:'Some tokens keep moving through a bounded cycle after the transient phase.'},
    slider:{label:'Slider',desc:'Some tokens drift along a latent direction. The paper separates this from fixed-point behavior.'},
    ouro:{label:'Ouro 1.4B',desc:'Ouro shows cyclic similarity. In the fixed-point test, it keeps changing across long recurrences.'}
  };
  function pathFor(layer, m){
    const pts=[];
    const target=[[-5,4],[4,5],[6,-3],[-4,-5]][layer];
    for(let i=0;i<32;i++){
      if(m==='orbit') pts.push([Math.cos(i*.42+layer)*5+layer-1.5, Math.sin(i*.42+layer)*3.2]);
      else if(m==='slider') pts.push([-7+i*.42, target[1]+Math.sin(i*.3+layer)*.6]);
      else {
        const wobble=m==='ouro'?1.6:.35;
        const k=m==='ouro'?0.09:0.18;
        const x=target[0]+(Math.cos(i*.6+layer)*wobble)*(1-k*i/4);
        const y=target[1]+(Math.sin(i*.45+layer)*wobble)*(1-k*i/4);
        pts.push([x,y]);
      }
    }
    return pts;
  }
  function setScene(nextMode,nextSteps,stage){
    targetMode=nextMode;
    targetSteps=Math.max(4,Math.min(32,nextSteps));
    root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===targetMode));
    root.querySelectorAll('.fp-stage-strip span').forEach(s=>s.classList.toggle('on',s.dataset.stage===(stage||stageForMode[targetMode]||'settle')));
  }
  function draw(){
    mode=targetMode;
    root.querySelector('.fp-step-readout').textContent=Math.round(steps);
    const W=520,H=360,cx=W/2,cy=H/2,sc=18;
    const sx=x=>cx+x*sc, sy=y=>cy-y*sc;
    const colors=['var(--accent)','var(--teal)','var(--ink-soft)','var(--ink-muted)'];
    let s=`<svg viewBox="0 0 ${W} ${H}"><rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="var(--paper)"/><line x1="24" y1="${cy}" x2="${W-24}" y2="${cy}" stroke="var(--rule)" stroke-dasharray="2 3"/><line x1="${cx}" y1="24" x2="${cx}" y2="${H-24}" stroke="var(--rule)" stroke-dasharray="2 3"/>`;
    s+=`<text class="fp-readout" x="24" y="28">${modes[mode].label} · recurrence ${Math.round(steps)}</text>`;
    for(let l=0;l<4;l++){
      const pts=pathFor(l,mode).slice(0,Math.max(1,Math.round(steps)));
      s+=`<path d="${svgLine(pts,sx,sy)}" fill="none" stroke="${colors[l]}" stroke-width="1.7"/>`;
      pts.forEach((p,i)=>s+=`<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="${i===pts.length-1?4.5:1.45}" fill="${colors[l]}" opacity="${.25+i/pts.length*.75}"/>`);
      const last=pts[pts.length-1];
      if(last)s+=`<text class="fp-layer-label" x="${sx(last[0])+8}" y="${sy(last[1])+3}" style="color:${colors[l]}">L${l+1}</text>`;
      if(mode==='fixed')s+=`<circle cx="${sx([[-5,4],[4,5],[6,-3],[-4,-5]][l][0])}" cy="${sy([[-5,4],[4,5],[6,-3],[-4,-5]][l][1])}" r="7" fill="none" stroke="${colors[l]}" stroke-dasharray="2 2"/>`;
    }
    s+=`<text x="24" y="${H-12}" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">scroll, autoplay, or use the controls to compare recurrence regimes</text></svg>`;
    root.querySelector('.viz-canvas').innerHTML=s;
    root.querySelector('.depth-note').innerHTML=`<b>${modes[mode].label}</b>${modes[mode].desc}`;
  }
  function animate(){
    steps+= (targetSteps-steps)*0.12;
    if(Math.abs(targetSteps-steps)<0.04)steps=targetSteps;
    draw();
    raf=requestAnimationFrame(animate);
  }
  root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>setScene(b.dataset.mode,28)));
  addAutoButton(root,on=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    if(on){
      const seq=[['fixed',8,'measure'],['fixed',24,'settle'],['ouro',28,'exception'],['orbit',28,'orbit'],['slider',26,'slider'],['fixed',32,'use']];
      autoTimer=setInterval(()=>{
        autoIdx=(autoIdx+1)%seq.length;
        setScene(seq[autoIdx][0],seq[autoIdx][1],seq[autoIdx][2]);
      },2300);
    }
  });
  const scenes=[...document.querySelectorAll('.fp-scene')];
  if(scenes.length){
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(!visible[0])return;
      const sec=visible[0].target;
      const sectionIndex=scenes.indexOf(sec);
      setScene(sec.dataset.fpMode||'fixed',+(sec.dataset.fpSteps||18),['measure','settle','exception','orbit','slider','use'][Math.max(0,sectionIndex)]);
    },{rootMargin:'-28% 0px -54% 0px',threshold:0});
    scenes.forEach(s=>io.observe(s));
  }
  setScene('fixed',8,'measure');
  cancelAnimationFrame(raf);
  animate();
}

function initStabilityViz(){
  const root=el('stability-viz'); if(!root)return;
  let rho=.86,autoTimer=0,phase=0;
  const sceneRho={stable:.86,marginal:1.03,exploding:1.16};
  function setRho(next){
    rho=next;
    const slider=root.querySelector('input');
    if(slider)slider.value=Math.round(rho*100);
    draw();
  }
  function draw(){
    const W=520,H=360,m={l:42,r:16,t:18,b:34};
    const x=i=>m.l+i/24*(W-m.l-m.r), y=v=>H-m.b-Math.min(v,8)/8*(H-m.t-m.b);
    const vals=[]; let h=1;
    for(let i=0;i<=24;i++){vals.push([i,h]);h=h*rho+.16}
    let regime=rho<1?'stable':rho<1.08?'marginal':'exploding';
    root.querySelector('.regime').textContent=regime;
    root.querySelector('.regime').style.color=regime==='exploding'?'var(--accent)':regime==='stable'?'var(--teal)':'var(--ink-soft)';
    root.querySelector('.rho').textContent=rho.toFixed(2);
    let s=`<svg viewBox="0 0 ${W} ${H}">`;
    for(let v=0;v<=8;v+=2)s+=`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/><text x="${m.l-8}" y="${y(v)+3}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">${v}</text>`;
    s+=`<path d="${svgLine(vals,x,p=>y(p))}" fill="none" stroke="${regime==='exploding'?'var(--accent)':'var(--teal)'}" stroke-width="2.2"/>`;
    vals.forEach(p=>s+=`<circle cx="${x(p[0])}" cy="${y(p[1])}" r="2.5" fill="${regime==='exploding'?'var(--accent)':'var(--teal)'}"/>`);
    s+=`<line x1="${m.l}" y1="${y(1)}" x2="${W-m.r}" y2="${y(1)}" stroke="var(--accent-line)" stroke-dasharray="3 3"/><text x="${W-m.r-4}" y="${y(1)-6}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--accent)">unit state</text>`;
    s+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">recurrence</text></svg>`;
    root.querySelector('.viz-canvas').innerHTML=s;
  }
  const slider=root.querySelector('input');
  slider.addEventListener('input',e=>{if(autoTimer){clearInterval(autoTimer);autoTimer=0}rho=+e.target.value/100;draw()});
  window.addEventListener('rho-mode-change',e=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    setRho(sceneRho[e.detail&&e.detail.mode]||rho);
  });
  addAutoButton(root,on=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    if(!on)return;
    autoTimer=setInterval(()=>{
      phase+=0.16;
      rho=.96+.25*Math.sin(phase);
      slider.value=Math.round(rho*100);
      draw();
    },120);
  });
  draw();
}

function initStableExplainer(){
  const root=el('stable-explainer'); if(!root)return;
  const order=['spike','system','constraint','sampling','scaling','recipe'];
  let scene='spike',idx=0,autoTimer=0,pulse=0,progress=0,autoBtn=null,manualLockUntil=0;
  const clamp01=v=>Math.max(0,Math.min(1,v));
  const sceneData={
    spike:{
      tab:'Spike',title:'Residual explosion',mode:'exploding',
      body:'The visible failure is the loss spike. The useful picture is the matching state norm: each loop expands the residual a little more.',
      note:'The drawing separates the training symptom from the mechanism. A spiking loss curve matters because the hidden state is being amplified across recurrent passes.',
      rows:[['signal','loss spike'],['state','expands by loop'],['rho','1.16'],['action','control A']]
    },
    system:{
      tab:'System',title:'Injected recurrent system',mode:'marginal',
      body:'Parcae writes the loop as a residual state update with learned input injection. That makes the unstable part visible.',
      note:'The linear terms do not replace the transformer block. They give a concrete stability boundary for the repeated update.',
      rows:[['state','h[t]'],['injection','A h + B e'],['block','R(h,e)'],['risk','edge of stable']]
    },
    constraint:{
      tab:'Constraint',title:'Negative diagonal constraint',mode:'stable',
      body:'The parameterization pulls the recurrent injection toward a stable family before the optimizer can learn an expansive map.',
      note:'This is the architectural move: make the stable update easy to represent, then train the recurrent block inside that boundary.',
      rows:[['before','some modes outside'],['after','inside boundary'],['rho','0.86'],['effect','bounded norms']]
    },
    sampling:{
      tab:'Sampling',title:'Per-sequence recurrence depth',mode:'marginal',
      body:'The batch sees many recurrence depths at once. Shorter rows hold state while longer rows keep looping.',
      note:'The training signal changes because each micro-batch covers a spread of depths instead of one synchronized depth.',
      rows:[['batch R','one depth'],['sequence R','many depths'],['padding','hold state'],['reported','fewer spikes']]
    },
    scaling:{
      tab:'Scaling',title:'Loops become a scaling axis',mode:'stable',
      body:'After the loop is stable, recurrence can be swept against data under a fixed FLOP budget.',
      note:'The point of the isoFLOP view is the joint movement: more data and more recurrence are tuned together.',
      rows:[['budget','fixed FLOPs'],['axes','data and loops'],['frontier','joint sweep'],['use','choose R']]
    },
    recipe:{
      tab:'Recipe',title:'Stable looped training recipe',mode:'stable',
      body:'The page reduces to a sequence: diagnose expansion, constrain the update, train across depths, then scale loops with data.',
      note:'The final scene keeps all moving parts visible at once so the recipe is inspectable.',
      rows:[['1','measure norm'],['2','constrain update'],['3','sample R'],['4','scale jointly']]
    }
  };
  function box(x,y,w,h,label,sub,kind='plain',active=false){
    const fills={plain:'var(--paper)',accent:'var(--accent-soft)',teal:'var(--teal-soft)',tint:'var(--bg-tint)'};
    const strokes={plain:'var(--rule-strong)',accent:'var(--accent-line)',teal:'var(--teal)',tint:'var(--rule)'};
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${fills[kind]||fills.plain}" stroke="${active?'var(--accent)':(strokes[kind]||strokes.plain)}" stroke-width="${active?2:1.2}"/>
      <text x="${x+w/2}" y="${y+25}" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="var(--ink)">${label}</text>
      ${sub?`<text x="${x+w/2}" y="${y+45}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="${kind==='accent'?'var(--accent)':'var(--ink-muted)'}">${sub}</text>`:''}
    </g>`;
  }
  function arrow(x1,y1,x2,y2,color='var(--rule-strong)',dash=''){
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.5" ${dash?`stroke-dasharray="${dash}"`:''} marker-end="url(#stableArrow)"/>`;
  }
  function frame(W,H,kicker,title){
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">
      <defs><marker id="stableArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-faint)"/></marker></defs>
      <rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="var(--paper)"/>
      <text x="26" y="31" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-faint)">${kicker}</text>
      <text x="26" y="60" font-size="22" font-weight="500" fill="var(--ink)">${title}</text>`;
  }
  function drawSpike(p,q=0){
    const W=720,H=520,m={l:52,r:28,t:92,b:58};
    const x=i=>m.l+i/11*(W-m.l-m.r), y=v=>238-Math.min(v,6)/6*118;
    const base=[1.05,1.02,1.08,1.12,1.18,1.25,1.5,2.2,5.6,4.3,3.2,2.6];
    const par=[1.02,1.0,1.04,1.03,1.05,1.04,1.06,1.07,1.05,1.06,1.05,1.04];
    const shown=Math.max(2,Math.ceil(q*base.length));
    let s=frame(W,H,'TRAINING TRACE','Loss spike tied to state growth');
    [1,3,5].forEach(v=>s+=`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/><text x="${m.l-8}" y="${y(v)+3}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">${v}</text>`);
    s+=`<path d="${svgLine(base,x,y)}" fill="none" stroke="var(--accent-line)" stroke-width="2.2" opacity=".35"/>
      <path d="${svgLine(base.slice(0,shown),x,y)}" fill="none" stroke="var(--accent)" stroke-width="2.7"/>
      <path d="${svgLine(par,x,y)}" fill="none" stroke="var(--teal)" stroke-width="2.2" opacity="${q>.58?1:.35}"/>
      <text x="${W-m.r-74}" y="${y(base[8])-10}" font-family="var(--mono)" font-size="10" fill="var(--accent)">baseline spike</text>
      <text x="${W-m.r-80}" y="${y(par[10])-11}" font-family="var(--mono)" font-size="10" fill="var(--teal)">Parcae bounded</text>
      <text x="${W/2}" y="260" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">training step</text>`;
    const active=Math.min(7,Math.floor(q*8));
    const bars=[24,34,48,66,92,126,164,210];
    s+=`<text x="52" y="310" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-faint)">RESIDUAL NORM BY RECURRENT PASS</text>`;
    bars.forEach((h,i)=>{
      const bx=72+i*72, by=438-h;
      s+=`<rect x="${bx}" y="${by}" width="38" height="${h}" rx="4" fill="${i<=active?(i===active?'var(--accent)':'var(--accent-soft)'):'var(--paper)'}" stroke="var(--accent-line)" opacity="${i<=active?1:.45}"/>
        <text x="${bx+19}" y="462" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="var(--ink-muted)">R${i+1}</text>`;
    });
    s+=`<path d="M 110 388 C 224 312, 430 286, 606 226" fill="none" stroke="var(--accent)" stroke-dasharray="5 5"/>
      <text x="390" y="340" font-family="var(--mono)" font-size="10" fill="var(--accent)">small expansion compounds</text></svg>`;
    return s;
  }
  function drawSystem(p,q=0){
    const W=720,H=520;
    const stage=Math.min(3,Math.floor(q*4));
    let s=frame(W,H,'RECURRENT UPDATE','One loop as an injected system');
    s+=box(54,154,132,70,'h[t]','residual','tint',stage===0);
    s+=arrow(186,189,236,189,stage>=1?'var(--accent)':'var(--rule-strong)');
    s+=box(236,118,132,70,'A h[t]','state injection','accent',stage===1);
    s+=box(236,220,132,70,'B e','input injection','teal',stage===1);
    s+=arrow(368,153,430,190,stage>=2?'var(--accent)':'var(--rule-strong)');
    s+=arrow(368,255,430,218,stage>=2?'var(--teal)':'var(--rule-strong)');
    s+=box(430,154,142,82,'R(h,e)','shared block','plain',stage===2);
    s+=arrow(572,195,632,195,stage>=3?'var(--accent)':'var(--rule-strong)');
    s+=box(632,154,58,82,'h[t+1]','','accent',stage===3);
    s+=`<path d="M 662 244 C 642 334, 126 334, 120 226" fill="none" stroke="${stage===3?'var(--accent)':'var(--accent-line)'}" stroke-width="1.7" stroke-dasharray="6 5" marker-end="url(#stableArrow)"/>
      <text x="118" y="372" font-family="var(--mono)" font-size="10" fill="var(--accent)">same update applied again</text>
      <rect x="64" y="406" width="592" height="62" rx="7" fill="var(--bg-tint)" stroke="var(--rule)"/>
      <text x="84" y="431" font-family="var(--serif)" font-size="21" fill="var(--ink)">h[t+1] = A h[t] + B e + R(h[t], e)</text>
      <text x="84" y="454" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">the spectral behavior of the repeated part decides whether loops settle or expand</text></svg>`;
    return s;
  }
  function drawConstraint(p,q=0){
    const W=720,H=520,cx=520,cy=258,r=116;
    const before=[[-1.2,.36],[-.42,1.08],[.9,.72],[1.24,-.26]];
    const after=[[-.72,.28],[-.26,.62],[.48,.38],[.66,-.18]];
    const active=Math.min(3,Math.floor(q*4));
    let s=frame(W,H,'STABILITY BOUNDARY','Parameterization moves A inside');
    s+=`<text x="58" y="114" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-faint)">NEGATIVE DIAGONAL FORM</text>
      <rect x="58" y="136" width="238" height="238" rx="8" fill="var(--bg-tint)" stroke="var(--rule)"/>`;
    [0,1,2,3].forEach(i=>{
      [0,1,2,3].forEach(j=>{
        const x=88+j*42,y=166+i*42,on=i===j;
        s+=`<rect x="${x}" y="${y}" width="28" height="28" rx="4" fill="${on?'var(--accent-soft)':'var(--paper)'}" stroke="${on?'var(--accent-line)':'var(--rule)'}"/>`;
        if(on)s+=`<text x="${x+14}" y="${y+18}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--accent)">-</text>`;
      });
    });
    s+=`<text x="88" y="346" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">diag(-exp(theta)) before discretization</text>`;
    s+=arrow(326,256,384,256,'var(--accent-line)','5 4');
    s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--rule-strong)" stroke-width="1.5"/>
      <line x1="${cx-r-24}" y1="${cy}" x2="${cx+r+24}" y2="${cy}" stroke="var(--rule)"/>
      <line x1="${cx}" y1="${cy-r-24}" x2="${cx}" y2="${cy+r+24}" stroke="var(--rule)"/>
      <text x="${cx-r}" y="${cy-r-14}" font-family="var(--mono)" font-size="10" fill="var(--ink-faint)">spectral boundary</text>`;
    before.forEach((d,i)=>{
      const target=after[i], ix=d[0]+(target[0]-d[0])*q, iy=d[1]+(target[1]-d[1])*q;
      s+=`<line x1="${cx+d[0]*r}" y1="${cy-d[1]*r}" x2="${cx+target[0]*r}" y2="${cy-target[1]*r}" stroke="var(--rule)" stroke-dasharray="3 3"/>`;
      s+=`<circle cx="${cx+d[0]*r}" cy="${cy-d[1]*r}" r="5" fill="var(--accent)" opacity="${.45*(1-q)}"/>`;
      s+=`<circle cx="${cx+ix*r}" cy="${cy-iy*r}" r="${i===active?7:5}" fill="${q>.55?'var(--teal)':'var(--accent)'}" opacity="${i===active?1:.72}"/>`;
    });
    s+=`<text x="410" y="430" font-family="var(--mono)" font-size="10" fill="var(--accent)">unconstrained modes outside</text>
      <text x="410" y="454" font-family="var(--mono)" font-size="10" fill="var(--teal)">Parcae modes inside</text></svg>`;
    return s;
  }
  function drawSampling(p,q=0){
    const W=720,H=520,cols=8,cell=28,gap=5;
    let s=frame(W,H,'DEPTH SAMPLING','Micro-batch sees a spread of R');
    const activeCol=Math.min(cols-1,Math.floor(q*cols));
    function rowGroup(x,y,title,depths,allDepth,opacity=1){
      let out=`<g opacity="${opacity}"><text x="${x}" y="${y}" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-faint)">${title}</text>`;
      depths.forEach((d,r)=>{
        out+=`<text x="${x}" y="${y+38+r*38}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">seq ${r+1}</text>`;
        for(let c=0;c<cols;c++){
          const active=c===activeCol;
          const running=c<d, padded=allDepth&&c>=d&&c<allDepth;
          const fill=running?(active?'var(--accent)':'var(--teal-soft)'):(padded?'var(--bg-tint)':'var(--paper)');
          const stroke=running?'var(--teal)':(padded?'var(--rule-strong)':'var(--rule)');
          out+=`<rect x="${x+18+c*(cell+gap)}" y="${y+22+r*38}" width="${cell}" height="24" rx="4" fill="${fill}" stroke="${stroke}"/>`;
        }
        out+=`<text x="${x+18+cols*(cell+gap)+8}" y="${y+39+r*38}" font-family="var(--mono)" font-size="9" fill="var(--ink-muted)">R${d}</text>`;
      });
      return out+'</g>';
    }
    s+=rowGroup(72,132,'PER-BATCH SAMPLE',[6,6,6,6,6],6,q<.45?1:.35);
    s+=rowGroup(414,132,'PER-SEQUENCE SAMPLE',[2,7,4,8,5],8,q>.22?1:.45);
    s+=`<rect x="70" y="382" width="252" height="72" rx="8" fill="var(--accent-soft)" stroke="var(--accent-line)"/>
      <text x="92" y="410" font-family="var(--mono)" font-size="10" fill="var(--accent)">one depth this step</text>
      <text x="92" y="435" font-size="15" fill="var(--ink-soft)">gradient sees a narrow slice of R</text>
      <rect x="412" y="382" width="252" height="72" rx="8" fill="var(--teal-soft)" stroke="var(--teal)"/>
      <text x="434" y="410" font-family="var(--mono)" font-size="10" fill="var(--teal)">many depths this step</text>
      <text x="434" y="435" font-size="15" fill="var(--ink-soft)">short rows hold; long rows continue</text></svg>`;
    return s;
  }
  function drawScaling(p,q=0){
    const W=720,H=520,m={l:78,r:50,t:104,b:72};
    const x=d=>m.l+d*(W-m.l-m.r), y=r=>H-m.b-r*(H-m.t-m.b);
    const t=q, dot=[.28+.48*t,.26+.46*t];
    let s=frame(W,H,'ISOFLOP SWEEP','Loops and data move together');
    for(let i=0;i<10;i++){
      for(let j=0;j<7;j++){
        const d=i/9,r=j/6,score=Math.abs(d-.62)+Math.abs(r-.54)+.18*Math.sin(i+j);
        const opacity=.18+.55*(1-Math.min(1,score));
        s+=`<rect x="${x(d)}" y="${y(r)-34}" width="${(W-m.l-m.r)/10+2}" height="${(H-m.t-m.b)/7+2}" fill="var(--teal)" opacity="${opacity}"/>`;
      }
    }
    [0,.25,.5,.75,1].forEach(v=>{
      s+=`<line x1="${x(v)}" y1="${m.t}" x2="${x(v)}" y2="${H-m.b}" stroke="var(--rule)"/>
        <line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/>`;
    });
    const frontier=[[.16,.18],[.28,.3],[.42,.42],[.58,.55],[.78,.72],[.92,.82]];
    const iso1=[[.15,.72],[.33,.57],[.57,.38],[.84,.18]];
    const iso2=[[.22,.88],[.44,.7],[.72,.48],[.94,.28]];
    s+=`<path d="${svgLine(iso1,x,y)}" fill="none" stroke="var(--paper)" stroke-width="5" opacity=".85"/><path d="${svgLine(iso1,x,y)}" fill="none" stroke="var(--ink-muted)" stroke-width="1.4" stroke-dasharray="5 5"/>
      <path d="${svgLine(iso2,x,y)}" fill="none" stroke="var(--paper)" stroke-width="5" opacity=".85"/><path d="${svgLine(iso2,x,y)}" fill="none" stroke="var(--ink-muted)" stroke-width="1.4" stroke-dasharray="5 5"/>
      <path d="${svgLine(frontier,x,y)}" fill="none" stroke="var(--accent)" stroke-width="2.6"/>
      <circle cx="${x(dot[0])}" cy="${y(dot[1])}" r="8" fill="var(--accent)"/>
      <text x="${x(dot[0])+12}" y="${y(dot[1])-8}" font-family="var(--mono)" font-size="10" fill="var(--accent)">chosen budget</text>
      <text x="${W/2}" y="${H-24}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">data tokens</text>
      <text x="24" y="${H/2}" transform="rotate(-90 24 ${H/2})" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">mean recurrence</text></svg>`;
    return s;
  }
  function drawRecipe(p,q=0){
    const W=720,H=520,steps=[
      ['measure','loss + norm traces','accent'],
      ['constrain','negative diagonal A','teal'],
      ['sample','per-sequence R','accent'],
      ['scale','data x loops frontier','teal']
    ],active=Math.min(steps.length-1,Math.floor(q*steps.length));
    let s=frame(W,H,'CARRY-FORWARD','A looped model recipe you can inspect');
    steps.forEach((st,i)=>{
      const x=72+i*154,y=176;
      s+=box(x,y,124,86,st[0],st[1],st[2],i===active);
      if(i<steps.length-1)s+=arrow(x+124,y+43,x+154,y+43,i===active?'var(--accent)':'var(--rule-strong)');
      s+=`<text x="${x+62}" y="${y+124}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="${i===active?'var(--accent)':'var(--ink-faint)'}">0${i+1}</text>`;
    });
    s+=`<rect x="88" y="354" width="544" height="86" rx="8" fill="var(--bg-tint)" stroke="var(--rule)"/>
      <text x="114" y="386" font-size="18" fill="var(--ink)">The recurrent block is only useful after the state dynamics are stable.</text>
      <text x="114" y="416" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">then depth sampling and isoFLOP sweeps become meaningful experiments</text></svg>`;
    return s;
  }
  function renderPrimary(which,p,q){
    if(which==='spike')return drawSpike(p,q);
    if(which==='system')return drawSystem(p,q);
    if(which==='constraint')return drawConstraint(p,q);
    if(which==='sampling')return drawSampling(p,q);
    if(which==='scaling')return drawScaling(p,q);
    return drawRecipe(p,q);
  }
  function renderDiagnostic(cfg,p,q=0){
    const W=340,H=520,m={l:42,r:24,t:98,b:166};
    const rho={stable:.86,marginal:1.03,exploding:1.16}[cfg.mode]||.86;
    const regime=rho<1?'STABLE':rho<1.08?'MARGINAL':'EXPLODING';
    const color=regime==='EXPLODING'?'var(--accent)':regime==='STABLE'?'var(--teal)':'var(--ink-soft)';
    const vals=[]; let h=1;
    for(let i=0;i<=18;i++){vals.push([i,Math.min(8,h)]);h=h*rho+.14}
    const x=i=>m.l+i/18*(W-m.l-m.r), y=v=>H-m.b-v/8*(H-m.t-m.b);
    let s=frame(W,H,'DIAGNOSTIC','rho trace');
    s+=`<text x="26" y="82" font-family="var(--mono)" font-size="10" fill="${color}">rho ${rho.toFixed(2)} / ${regime}</text>`;
    [0,2,4,6,8].forEach(v=>s+=`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/><text x="${m.l-8}" y="${y(v)+3}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">${v}</text>`);
    s+=`<path d="${svgLine(vals,x,y)}" fill="none" stroke="${color}" stroke-width="2.3"/>`;
    const activePoint=Math.min(18,Math.floor(q*19));
    vals.forEach((pt,i)=>{if(i%2===0||i===activePoint)s+=`<circle cx="${x(pt[0])}" cy="${y(pt[1])}" r="${i===activePoint?5:2.4}" fill="${color}" opacity="${i===activePoint?1:.65}"/>`});
    s+=`<line x1="${m.l}" y1="${y(1)}" x2="${W-m.r}" y2="${y(1)}" stroke="var(--accent-line)" stroke-dasharray="3 3"/>
      <text x="${W/2}" y="${H-132}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">recurrence step</text>
      <rect x="26" y="416" width="288" height="64" rx="7" fill="var(--bg-tint)" stroke="var(--rule)"/>
      <text x="44" y="441" font-family="var(--mono)" font-size="10" fill="var(--ink-faint)">SCROLL-LINKED STATE</text>
      <text x="44" y="466" font-size="15" fill="var(--ink-soft)">${cfg.tab}: ${regime.toLowerCase()} update</text></svg>`;
    return s;
  }
  function setScene(next,nextProgress=progress){
    if(!sceneData[next])return;
    scene=next; idx=order.indexOf(scene);
    progress=clamp01(nextProgress);
    draw();
  }
  function draw(){
    const cfg=sceneData[scene];
    const motion=Math.round(progress*47);
    root.style.setProperty('--stable-progress',progress.toFixed(3));
    root.dataset.scene=scene;
    root.dataset.driver=autoTimer?'auto':'scroll';
    root.querySelectorAll('[data-stable-scene]').forEach(b=>b.classList.toggle('on',b.dataset.stableScene===scene));
    root.querySelector('.stable-primary').innerHTML=renderPrimary(scene,motion,progress);
    root.querySelector('.stable-side').innerHTML=renderDiagnostic(cfg,motion,progress);
    root.querySelector('.stable-readout').innerHTML=`<div><h3>${cfg.title}</h3><p>${cfg.body}</p></div><div class="stable-kv">${cfg.rows.map(([k,v])=>`<div class="row"><b>${k}</b><span>${v}</span></div>`).join('')}</div>`;
    root.querySelector('.stable-note').innerHTML=`<b>${cfg.tab}</b>${cfg.note}`;
  }
  function stopAuto(){
    if(autoBtn&&autoBtn.classList.contains('on'))autoBtn.click();
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
  }
  root.querySelectorAll('[data-stable-scene]').forEach(b=>b.addEventListener('click',()=>{
    manualLockUntil=Date.now()+1400;
    stopAuto();
    setScene(b.dataset.stableScene,.5);
  }));
  autoBtn=addAutoButton(root,on=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    if(on){
      pulse=0;
      autoTimer=setInterval(()=>{
        pulse=(pulse+1)%60;
        if(pulse===0)idx=(idx+1)%order.length;
        setScene(order[idx],pulse/59);
      },90);
    }
  });
  const sections=[...document.querySelectorAll('.stable-scene')];
  if(sections.length){
    let activeSection=null,raf=0,hashLockUntil=0;
    function progressFor(sec){
      const r=sec.getBoundingClientRect();
      const vh=window.innerHeight||document.documentElement.clientHeight||800;
      const start=vh*.72,end=vh*.24;
      const span=Math.max(1,r.height+start-end);
      return clamp01((start-r.top)/span);
    }
    function pickSection(){
      const vh=window.innerHeight||document.documentElement.clientHeight||800;
      const probe=vh*.42;
      let best=null,bestScore=Infinity;
      sections.forEach(sec=>{
        const r=sec.getBoundingClientRect();
        const contains=r.top<=probe&&r.bottom>=probe;
        const dist=contains?Math.abs((r.top+r.bottom)/2-probe):Math.min(Math.abs(r.top-probe),Math.abs(r.bottom-probe))+vh;
        if(dist<bestScore){best=sec;bestScore=dist}
      });
      return best;
    }
    function applyScrollScene(){
      raf=0;
      if(Date.now()<hashLockUntil)return;
      if(Date.now()<manualLockUntil)return;
      const best=pickSection();
      if(!best)return;
      const nextProgress=progressFor(best);
      if(best===activeSection&&Math.abs(nextProgress-progress)<.015)return;
      activeSection=best;
      stopAuto();
      setScene(best.dataset.stableScene||scene,nextProgress);
    }
    function applyHashScene(){
      const id=location.hash&&location.hash.slice(1);
      const sec=id?document.getElementById(id):null;
      if(!sec||!sec.classList.contains('stable-scene'))return false;
      hashLockUntil=Date.now()+900;
      activeSection=sec;
      stopAuto();
      setScene(sec.dataset.stableScene||scene,progressFor(sec));
      return true;
    }
    window.addEventListener('scroll',()=>{
      if(autoTimer)stopAuto();
      if(Date.now()>manualLockUntil&&!raf)raf=requestAnimationFrame(applyScrollScene);
    },{passive:true});
    window.addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(applyScrollScene)});
    window.addEventListener('hashchange',()=>setTimeout(()=>{if(!applyHashScene())applyScrollScene()},30));
    setTimeout(()=>{if(!applyHashScene()&&location.hash)applyScrollScene()},120);
  }
  draw();
}

function initComputeViz(){
  const root=el('compute-viz'); if(!root)return;
  let difficulty=62, gate='ponder',autoTimer=0,phase=0,ticks=0;
  function perf(r){const appetite=4+difficulty/7;return 35+(58-35)*(1-Math.exp(-r/appetite))}
  function draw(){
    root.querySelectorAll('[data-gate]').forEach(b=>b.classList.toggle('on',b.dataset.gate===gate));
    const exit=gate==='kl'?Math.max(2,Math.round(difficulty/12)):Math.max(1,Math.round(1+difficulty/16));
    root.querySelector('.exit').textContent=exit;
    const W=520,H=340,m={l:38,r:20,t:18,b:34};
    const x=r=>m.l+r/16*(W-m.l-m.r), y=v=>H-m.b-(v-32)/(60-32)*(H-m.t-m.b);
    let s=`<svg viewBox="0 0 ${W} ${H}">`;
    for(let v=35;v<=60;v+=5)s+=`<line x1="${m.l}" y1="${y(v)}" x2="${W-m.r}" y2="${y(v)}" stroke="var(--rule)"/><text x="${m.l-8}" y="${y(v)+3}" text-anchor="end" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">${v}</text>`;
    const pts=Array.from({length:16},(_,i)=>[i+1,perf(i+1)]);
    s+=`<path d="${svgLine(pts,x,y)}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    s+=`<line x1="${x(exit)}" y1="${m.t}" x2="${x(exit)}" y2="${H-m.b}" stroke="var(--teal)" stroke-dasharray="3 3"/><circle cx="${x(exit)}" cy="${y(perf(exit))}" r="5" fill="var(--teal)"/>`;
    s+=`<text x="${x(exit)+8}" y="${y(perf(exit))-8}" font-family="var(--mono)" font-size="9" fill="var(--teal)">exit here</text>`;
    s+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">loop budget R</text></svg>`;
    root.querySelector('.viz-canvas').innerHTML=s;
  }
  const slider=root.querySelector('input');
  slider.addEventListener('input',e=>{if(autoTimer){clearInterval(autoTimer);autoTimer=0}difficulty=+e.target.value;draw()});
  root.querySelectorAll('[data-gate]').forEach(b=>b.addEventListener('click',()=>{gate=b.dataset.gate;draw()}));
  addAutoButton(root,on=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    if(!on)return;
    autoTimer=setInterval(()=>{
      phase+=0.12;
      ticks+=1;
      difficulty=52+43*Math.sin(phase);
      slider.value=Math.round(difficulty);
      if(ticks%28===0){
        gate=gate==='ponder'?'kl':'ponder';
      }
      draw();
    },120);
  });
  draw();
}

function initArchitectureViz(){
  const root=el('arch-viz'); if(!root)return;
  let arch='hyperloop',autoTimer=0,autoIdx=5,tick=0;
  const order=['universal','recursive','huginn','ouro','parcae','hyperloop'];
  const data={
    universal:{
      title:'Universal Transformer',year:'2018',who:'Dehghani et al.',
      short:'The original recurrent transformer shape: reuse the full block and learn when each position should stop.',
      blocks:[['shared transformer','same block','shared']],
      loops:5,loopIndex:0,share:'full block',depth:'ACT halting',state:'single residual stream',guard:'halting + transition inputs',use:'seed architecture',memory:'1 shared block',compute:'block x ACT'
    },
    recursive:{
      title:'Recursive / Recurrent-depth',year:'2024-25',who:'Bae / Geiping',
      short:'The modern pattern puts recurrence in the middle: front layers prepare the state, the shared core refines it, coda layers decode it.',
      blocks:[['prelude L1','input','pre'],['prelude L2','features','pre'],['recurrent block','x R','loop'],['coda L1','decode','post'],['coda L2','unembed','post']],
      loops:6,loopIndex:2,share:'middle only',depth:'fixed or sampled R',state:'residual plus input injection',guard:'normalization + train-time R mix',use:'general recipe',memory:'prelude + one loop + coda',compute:'prelude + loop x R + coda'
    },
    huginn:{
      title:'Huginn',year:'2025',who:'Geiping et al.',
      short:'Huginn treats recurrence as a test-time compute dial. Train across depths, then spend more recurrent passes at inference.',
      blocks:[['prelude','embed + early layers','pre'],['recurrent block','shared params','loop'],['coda','late layers','post']],
      loops:8,loopIndex:1,share:'middle recurrent block',depth:'sampled train R, scalable test R',state:'residual with input injection',guard:'random R training',use:'latent test-time compute',memory:'3.5B stored params',compute:'up to 64 recurrent passes'
    },
    ouro:{
      title:'Ouro',year:'2025',who:'ByteDance Seed',
      short:'Ouro makes the depth decision learned and local. Tokens can exit at different loop steps instead of sharing one global R.',
      blocks:[['embed','token state','pre'],['LoopLM step','shared update','loop'],['exit head','stop mass','gate'],['LM head','next token','post']],
      loops:4,loopIndex:1,share:'LoopLM step',depth:'learned per-token exit',state:'residual plus exit mass',guard:'entropy-regularized objective',use:'adaptive compute',memory:'1.4B / 2.6B models',compute:'up to 4 recurrent steps'
    },
    parcae:{
      title:'Parcae',year:'2026',who:'UCSD / Together',
      short:'Parcae focuses on stable recurrence. The injection map is parameterized so repeated updates do not run away during training.',
      blocks:[['input inject','mix prompt','pre'],['stable recurrent block','negative diagonal A','stable'],['output','decode state','post']],
      loops:6,loopIndex:1,share:'stable middle block',depth:'variable R with scaling laws',state:'controlled residual update',guard:'bounded injection spectrum',use:'predictable loop scaling',memory:'single recurrent core',compute:'loops + data tradeoff'
    },
    hyperloop:{
      title:'Hyperloop',year:'2026',who:'Zeitoun et al.',
      short:'Hyperloop keeps middle-block reuse and widens the state crossing loop boundaries through matrix-valued residual streams.',
      blocks:[['begin block','local features','pre'],['middle block','shared x 3','hyper'],['hyper mix','matrix residual','gate'],['end block','decode','post']],
      loops:3,loopIndex:1,share:'middle block + hyper-connections',depth:'fixed middle loops',state:'matrix-valued residual streams',guard:'capacity at loop boundaries',use:'parameter-efficient deployment',memory:'about 50% fewer params',compute:'depth-matched behavior'
    }
  };
  const style={
    pre:['var(--teal-soft)','var(--teal)'],
    post:['var(--bg-tint)','var(--rule-strong)'],
    shared:['var(--accent-soft)','var(--accent-line)'],
    loop:['var(--accent-soft)','var(--accent-line)'],
    stable:['var(--accent-soft)','var(--accent-line)'],
    hyper:['var(--accent-soft)','var(--accent-line)'],
    gate:['var(--paper)','var(--accent-line)']
  };
  function tspans(x,y,text,max=38,line=15,fill='var(--ink-soft)',size=12,anchor='start'){
    const words=text.split(' ');
    const lines=[''];
    words.forEach(w=>{
      const last=lines[lines.length-1];
      if((last+' '+w).trim().length>max)lines.push(w);
      else lines[lines.length-1]=(last+' '+w).trim();
    });
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" fill="${fill}">${lines.map((l,i)=>`<tspan x="${x}" dy="${i?line:0}">${l}</tspan>`).join('')}</text>`;
  }
  function block(x,y,w,h,label,sub,kind,active){
    const c=style[kind]||style.post;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="7" fill="${c[0]}" stroke="${active?'var(--accent)':c[1]}" stroke-width="${active?2:1.3}"/>
      <text x="${x+w/2}" y="${y+25}" text-anchor="middle" font-family="var(--mono)" font-size="11" fill="${kind==='post'?'var(--ink-soft)':'var(--ink)'}">${label}</text>
      <text x="${x+w/2}" y="${y+45}" text-anchor="middle" font-family="var(--mono)" font-size="9" fill="${kind==='post'?'var(--ink-faint)':'var(--accent)'}">${sub}</text>
    </g>`;
  }
  function smallBlock(x,y,w,label,kind,on){
    const c=style[kind]||style.post;
    return `<g>
      <rect x="${x}" y="${y}" width="${w}" height="24" rx="4" fill="${on?c[0]:'var(--paper)'}" stroke="${on?c[1]:'var(--rule)'}"/>
      <text x="${x+w/2}" y="${y+16}" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill="${on?'var(--ink-soft)':'var(--ink-faint)'}">${label}</text>
    </g>`;
  }
  function draw(){
    root.querySelectorAll('[data-arch]').forEach(b=>b.classList.toggle('on',b.dataset.arch===arch));
    const d=data[arch], W=720,H=560, bw=d.blocks.length>4?100:122, y=132, gap=(W-90-bw)/(Math.max(1,d.blocks.length-1)), active=tick%d.loops;
    let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${d.title} architecture diagram">
      <defs>
        <marker id="archArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink-faint)"/></marker>
      </defs>
      <rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="var(--paper)"/>
      <text x="28" y="30" font-family="var(--mono)" font-size="10" letter-spacing=".08em" fill="var(--ink-faint)" text-transform="uppercase">${d.year} · ${d.who}</text>
      <text x="28" y="60" font-size="23" font-weight="500" fill="var(--ink)">${d.title}</text>
      <g transform="translate(520,20)">
        <rect x="0" y="0" width="160" height="58" rx="7" fill="var(--bg-tint)" stroke="var(--rule)"/>
        <text x="14" y="22" font-family="var(--mono)" font-size="9.5" fill="var(--ink-faint)" letter-spacing=".08em">REALIZED COMPUTE</text>
        <text x="14" y="45" font-size="19" fill="var(--accent)">${d.compute}</text>
      </g>`;
    d.blocks.forEach((b,i)=>{
      const x=45+i*gap;
      const kind=b[2], isLoop=i===d.loopIndex;
      s+=block(x,y,bw,64,b[0],b[1],kind,isLoop);
      if(i<d.blocks.length-1)s+=`<line x1="${x+bw+6}" y1="${y+32}" x2="${45+(i+1)*gap-10}" y2="${y+32}" stroke="var(--rule-strong)" stroke-width="1.4" marker-end="url(#archArrow)"/>`;
    });
    const lx=45+d.loopIndex*gap, lc=lx+bw/2;
    s+=`<path d="M ${lx+bw-6} ${y+70} C ${lc+bw*.65} ${y+125}, ${lc-bw*.65} ${y+125}, ${lx+6} ${y+70}" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-dasharray="5 4"/>`;
    for(let i=0;i<d.loops;i++){
      const dx=(i-(d.loops-1)/2)*18;
      s+=`<circle cx="${lc+dx}" cy="${y+106}" r="${i===active?6:3.5}" fill="${i===active?'var(--accent)':'var(--accent-line)'}" opacity="${i===active?1:.55}"/>`;
    }
    s+=`<text x="${lc}" y="${y+136}" text-anchor="middle" font-family="var(--mono)" font-size="10" fill="var(--ink-muted)">loop pass ${active+1}/${d.loops}</text>`;
    if(arch==='ouro'){
      const gx=45+2*gap, gy=220, probs=[.12,.22,.31,.35];
      s+=`<g transform="translate(${gx-8},${gy})"><text x="0" y="0" font-family="var(--mono)" font-size="9.5" fill="var(--ink-faint)" letter-spacing=".06em">exit mass</text>`;
      probs.forEach((p,i)=>{
        const h=60*p/.35;
        s+=`<rect x="${i*24}" y="${70-h}" width="14" height="${h}" rx="2" fill="${i===active%d.loops?'var(--accent)':'var(--teal)'}" opacity="${i===active%d.loops?1:.55}"/>`;
      });
      s+=`</g>`;
    }
    if(arch==='parcae'){
      s+=`<g transform="translate(${lx+bw+24},214)">
        <rect x="0" y="0" width="96" height="72" rx="6" fill="var(--bg-tint)" stroke="var(--rule)"/>
        <text x="12" y="18" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)">injection A</text>
        ${[0,1,2].map(i=>`<rect x="${22+i*18}" y="${28+i*10}" width="14" height="14" rx="2" fill="var(--accent-soft)" stroke="var(--accent-line)"/>`).join('')}
        <text x="48" y="66" text-anchor="middle" font-family="var(--mono)" font-size="8.5" fill="var(--accent)">negative diagonal</text>
      </g>`;
    }
    if(arch==='hyperloop'){
      s+=`<g transform="translate(${lx+8},212)">
        <text x="0" y="0" font-family="var(--mono)" font-size="9.5" fill="var(--ink-faint)" letter-spacing=".06em">matrix residual streams</text>
        ${[0,1,2,3].map((r)=>`<line x1="4" y1="${20+r*15}" x2="${bw+120}" y2="${20+r*15}" stroke="${r===active%d.loops?'var(--accent)':'var(--teal)'}" stroke-width="${r===active%d.loops?2.4:1.3}" opacity="${r===active%d.loops?1:.45}"/>`).join('')}
        ${[0,1,2,3,4].map((c)=>`<circle cx="${22+c*30}" cy="${20+(c%4)*15}" r="3" fill="var(--accent-line)"/>`).join('')}
      </g>`;
    }
    const storedKinds=d.blocks.map(b=>b[2]);
    const realized=Array.from({length:Math.min(8,d.loops+2)},(_,i)=>i===0?'pre':i===Math.min(8,d.loops+2)-1?'post':d.blocks[d.loopIndex][2]);
    s+=`<g transform="translate(34,330)">
      <rect x="0" y="0" width="310" height="112" rx="8" fill="var(--bg-tint)" stroke="var(--rule)"/>
      <text x="18" y="25" font-family="var(--mono)" font-size="10" fill="var(--ink-faint)" letter-spacing=".08em">STORED PARAMETERS</text>
      ${storedKinds.map((k,i)=>smallBlock(18+i*52,46,44,i===d.loopIndex?'share':String(i+1),k,true)).join('')}
      ${tspans(18,92,d.memory,34,14,'var(--ink-soft)',12)}
    </g>
    <g transform="translate(376,330)">
      <rect x="0" y="0" width="310" height="112" rx="8" fill="var(--bg-tint)" stroke="var(--rule)"/>
      <text x="18" y="25" font-family="var(--mono)" font-size="10" fill="var(--ink-faint)" letter-spacing=".08em">REALIZED PATH</text>
      ${realized.map((k,i)=>smallBlock(18+i*34,46,28,i>0&&i<realized.length-1?'R':'',k,i===active+1||i===0||i===realized.length-1)).join('')}
      ${tspans(18,92,d.depth,34,14,'var(--ink-soft)',12)}
    </g>
    <g transform="translate(34,468)">
      <rect x="0" y="0" width="202" height="58" rx="7" fill="var(--paper)" stroke="var(--rule)"/>
      <text x="14" y="20" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".08em">STATE CARRIER</text>
      ${tspans(14,43,d.state,24,13,'var(--ink-soft)',12)}
    </g>
    <g transform="translate(258,468)">
      <rect x="0" y="0" width="202" height="58" rx="7" fill="var(--paper)" stroke="var(--rule)"/>
      <text x="14" y="20" font-family="var(--mono)" font-size="9" fill="var(--ink-faint)" letter-spacing=".08em">STABILITY / CAPACITY</text>
      ${tspans(14,43,d.guard,24,13,'var(--ink-soft)',12)}
    </g>
    <g transform="translate(482,468)">
      <rect x="0" y="0" width="204" height="58" rx="7" fill="var(--accent-soft)" stroke="var(--accent-line)"/>
      <text x="14" y="20" font-family="var(--mono)" font-size="9" fill="var(--accent)" letter-spacing=".08em">WHY IT MATTERS</text>
      ${tspans(14,43,d.use,24,13,'var(--ink)',12)}
    </g></svg>`;
    root.querySelector('.viz-canvas').innerHTML=s;
    root.querySelector('.depth-note').innerHTML=`<b>${d.title}</b>${d.short}`;
    root.querySelector('.depth-kv').innerHTML=[
      ['Share',d.share],
      ['Depth',d.depth],
      ['State',d.state],
      ['Guard',d.guard],
      ['Use',d.use]
    ].map(([k,v])=>`<b>${k}</b><span>${v}</span>`).join('');
  }
  root.querySelectorAll('[data-arch]').forEach(b=>b.addEventListener('click',()=>{arch=b.dataset.arch;autoIdx=order.indexOf(arch);tick=0;draw()}));
  addAutoButton(root,on=>{
    if(autoTimer){clearInterval(autoTimer);autoTimer=0}
    if(on)autoTimer=setInterval(()=>{autoIdx=(autoIdx+1)%order.length;arch=order[autoIdx];tick=(tick+1)%data[arch].loops;draw();},3000);
  });
  draw();
}

document.addEventListener('DOMContentLoaded',()=>{
  initFixedPointViz();
  initStabilityViz();
  initStableExplainer();
  initComputeViz();
  initArchitectureViz();
  initDistanceLab();
  initRhoLab();
  initExitLab();
});
