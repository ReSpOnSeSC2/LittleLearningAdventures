import {createGuidedTracer} from './tracing-engine.js';
const SVG='http://www.w3.org/2000/svg',PENS=['#c82978','#147a75','#53429b'],NAME=[...'Vivian'];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function mountTracingPanel(container,{day={},models={},speak=()=>{},setListen=()=>{},bindListen=()=>{},nextButton=()=>{}}={}){
  let category='line',mode='free',widthChoice='wide',nameIndex=0,pen=PENS[0];
  let letter=String(day.letter||'V').slice(0,1).toUpperCase(),number=String(day.number??1),shape='circle';
  let paths=[],ink=[],activeInk=null,tracer=null,w=0,h=0,pointerId=null,disposed=false;
  let demoFrame=0,demoPoint=null,resizeFrame=0,spokenAt=-Infinity,completedSpoken=false,rejected=false;
  const controller=new AbortController(),on=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:controller.signal});
  const letters=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter(k=>models.letters?.[k]);
  const numbers=[...'0123456789'].filter(k=>models.numbers?.[k]);
  const shapes=['circle','square','triangle','rectangle'].filter(k=>models.shapes?.[k]);
  if(!letters.includes(letter))letter=letters[0];
  if(!numbers.includes(number))number=numbers[0];
  if(shapes.includes(day.shape))shape=day.shape;
  const requested=String(day.writing?.trace?.[0]||day.prewriting||day.path||'curve').toLowerCase();
  const lineKey=models.paths?.[requested]?requested:requested.includes('line')?'across':'curve';
  container.innerHTML='<div class="tracing-panel">'+
    '<div class="tracing-pickers"><label class="tracing-picker-main">Choose<select class="tracing-category" aria-label="Choose what to draw">'+
    '<option value="line">Today’s line</option><option value="name">My name: Vivian</option><option value="letter">Letters A–Z</option><option value="number">Numbers 0–9</option><option value="shape">Shapes</option><option value="blank">Blank paper</option></select></label>'+
    '<label class="tracing-picker-detail" hidden>Pick one<select class="tracing-symbol" aria-label="Choose a tracing model"></select></label></div>'+
    '<div class="tracing-modes" role="group" aria-label="Drawing mode"><button type="button" data-mode="free" aria-pressed="true">Free draw</button><button type="button" data-mode="guided" aria-pressed="false">Follow path</button></div>'+
    '<div class="tracing-width" role="group" aria-label="Path width" hidden><span>Path width</span><button type="button" data-width="wide" aria-pressed="true">Wide</button><button type="button" data-width="narrow" aria-pressed="false">Narrow</button></div>'+
    '<div class="tracing-name-row" hidden><div class="tracing-name-progress" aria-label="Vivian, one letter at a time"></div><button type="button" class="tracing-name-next" aria-label="Next letter in Vivian">Next letter →</button></div>'+
    '<div class="tracing-hint-row"><p class="tracing-instruction"></p><button type="button" class="tracing-demo" aria-label="Show me how to follow this path">▶ Show me</button></div><div class="tracing-surface"><canvas class="tracing-canvas" role="img" aria-label="Finger drawing space. You can also use paper with a grown-up."></canvas></div>'+
    '<div class="tracing-tools"><div class="tracing-pens" role="group" aria-label="Pen color">'+
    PENS.map((color,i)=>'<button type="button" class="tracing-pen" data-pen="'+color+'" style="--pen-color:'+color+'" aria-label="'+['Pink','Green','Purple'][i]+' pen" aria-pressed="'+(i===0)+'"><span aria-hidden="true"></span></button>').join('')+
    '</div><button type="button" class="tracing-clear">Start fresh</button></div><p class="tracing-status" role="status" aria-live="polite"></p></div>';
  const panel=container.querySelector('.tracing-panel'),q=selector=>panel.querySelector(selector);
  const canvas=q('canvas'),ctx=canvas.getContext('2d'),status=q('.tracing-status');
  const svg=document.createElementNS(SVG,'svg');svg.setAttribute('aria-hidden','true');svg.classList.add('tracing-measure');panel.append(svg);
  let observer;
  function model(){
    if(category==='blank')return null;
    if(category==='line')return models.paths?.[lineKey]||models.shapes?.[lineKey]||models.paths?.curve;
    if(category==='name')return models.letters?.[NAME[nameIndex]];
    if(category==='letter')return models.letters?.[letter];
    if(category==='number')return models.numbers?.[number];
    return models.shapes?.[shape];
  }
  function label(){return category==='name'?NAME[nameIndex]:category==='letter'?letter:category==='number'?number:category==='shape'?shape:'today’s line';}
  function announce(say=false){
    const subject=category==='blank'?'Make any marks you like. This is your blank paper.':
      category==='name'?'This is '+NAME[nameIndex]+' in Vivian.':category==='letter'?'This is the letter '+letter+'.':
      category==='number'?'This is the number '+number+'.':category==='shape'?'This is a '+shape+'.':'Here is today’s line.';
    const cue=category==='blank'?'':mode==='guided'?' Start at the pink dot. Follow the path with your finger. Lift your finger to start each new stroke.':' Draw on the line, or make your own marks.';
    q('.tracing-instruction').textContent=category==='blank'?'Your paper. Your marks.':mode==='guided'?'Start at the pink dot.':'Draw your own way.';
    setListen(subject+cue,'Hear this step');bindListen();if(say)speak(subject+cue);
  }
  function controls(){
    const keys=category==='letter'?letters:category==='number'?numbers:category==='shape'?shapes:[];
    q('.tracing-picker-detail').hidden=!keys.length;
    if(keys.length){
      q('.tracing-symbol').innerHTML=keys.map(k=>'<option value="'+escape(k)+'">'+escape(k)+'</option>').join('');
      q('.tracing-symbol').value=category==='letter'?letter:category==='number'?number:shape;
      q('.tracing-symbol').setAttribute('aria-label','Choose a '+category);
    }
    panel.querySelectorAll('[data-mode]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.mode===mode));b.disabled=category==='blank'&&b.dataset.mode==='guided';});
    q('.tracing-width').hidden=mode!=='guided'||category==='blank';
    panel.querySelectorAll('[data-width]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.width===widthChoice)));
    q('.tracing-name-row').hidden=category!=='name';
    q('.tracing-name-progress').innerHTML=NAME.map((c,i)=>'<span class="'+(i===nameIndex?'current':i<nameIndex?'visited':'')+'"'+(i===nameIndex?' aria-current="step"':'')+'>'+c+'</span>').join('');
    q('.tracing-name-next').textContent=nameIndex===5?'Again ↺':'Next letter →';
    q('.tracing-name-next').setAttribute('aria-label',nameIndex===5?'Start Vivian again':'Next letter in Vivian: '+NAME[nameIndex+1]);
    q('.tracing-demo').hidden=category==='blank';
  }
  function cancelDemo(){if(demoFrame)cancelAnimationFrame(demoFrame);demoFrame=0;demoPoint=null;}
  function stopPointer(){
    const old=pointerId;pointerId=null;activeInk=null;tracer?.pointerUp();
    if(old!==null)try{if(canvas.hasPointerCapture(old))canvas.releasePointerCapture(old);}catch{}
  }
  function sample(source){
    svg.replaceChildren();if(!source?.strokes?.length)return [];
    const size=Math.max(40,Math.min(w-46,h-46)),left=(w-size)/2,top=(h-size)/2;
    return source.strokes.map(commands=>{
      const path=document.createElementNS(SVG,'path');path.setAttribute('d',commands.map(c=>c.join(' ')).join(' '));svg.append(path);
      const length=path.getTotalLength();
      if(length<.3){const first=commands.find(c=>c[0]==='M');return [{x:left+first[1]*size/100,y:top+first[2]*size/100}];}
      const count=Math.max(2,Math.ceil(length*size/100/2.2)),points=[];
      for(let i=0;i<=count;i++){const p=path.getPointAtLength(length*i/count);points.push({x:left+p.x*size/100,y:top+p.y*size/100});}
      return points;
    });
  }
  function reset(){
    stopPointer();cancelDemo();ink=[];activeInk=null;rejected=false;completedSpoken=false;
    paths=sample(model());const corridor=widthChoice==='wide'?18:9;
    tracer=paths.length?createGuidedTracer(paths,{corridor,startRadius:corridor+9,resumeRadius:corridor+9,lookAhead:39,maxStep:48,backtrack:34}):null;
    status.textContent='';draw();
  }
  function polyline(points,color,width,dash=[]){
    if(!points.length)return;
    ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.setLineDash(dash);
    if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,width/2,0,Math.PI*2);ctx.fill();return;}
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);ctx.stroke();
  }
  function anchor(){
    if(!paths.length)return null;if(mode==='free')return paths[0][0];
    const s=tracer?.getState();return !s||s.complete?null:s.currentPoint||paths[s.strokeIndex]?.[0];
  }
  function draw(){
    if(disposed)return;ctx.clearRect(0,0,w,h);
    for(const points of paths){polyline(points,mode==='guided'?'#fbe7f1':'#eadce6',mode==='guided'?(widthChoice==='wide'?36:18):13);polyline(points,'#9f7790',2.1,[1,7]);}
    for(const stroke of ink)polyline(stroke.points,stroke.color,7);
    ctx.setLineDash([]);const dot=demoPoint||anchor();
    if(dot){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(dot.x,dot.y,demoPoint?11:9,0,Math.PI*2);ctx.fill();ctx.fillStyle=PENS[0];ctx.beginPath();ctx.arc(dot.x,dot.y,demoPoint?7.5:6,0,Math.PI*2);ctx.fill();}
  }
  function resize(){
    if(disposed)return;const r=canvas.getBoundingClientRect(),nw=Math.max(120,r.width),nh=Math.max(235,r.height),ratio=Math.max(1,window.devicePixelRatio||1);
    if(Math.abs(nw-w)<.5&&Math.abs(nh-h)<.5&&canvas.width===Math.round(nw*ratio))return;
    w=nw;h=nh;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);reset();
  }
  function change(){controls();reset();announce(true);}
  function point(event){const r=canvas.getBoundingClientRect();return {x:(event.clientX-r.left)*w/r.width,y:(event.clientY-r.top)*h/r.height};}
  function hint(){
    const state=tracer?.getState();
    const message=state&&!state.isDrawing?'Lift your finger, then start at the pink dot.':state?.strokeProgress>0?'Come back to the pink dot. We can go slowly.':'Start at the pink dot. I will help you.';
    status.textContent=message;const now=performance.now();if(now-spokenAt>4500){spokenAt=now;speak(message);}
  }
  function accept(result,down=false){
    if(!result.accepted){activeInk=null;rejected=true;if(!result.complete)hint();return;}
    const points=result.drawPoints?.length?result.drawPoints:[result.point].filter(Boolean);if(!points.length)return;
    if(down||!activeInk){activeInk={color:pen,points:rejected&&!down?[{...result.point}]:points.map(p=>({...p}))};ink.push(activeInk);}
    else activeInk.points.push(...points.map(p=>({...p})));
    rejected=false;status.textContent='';
    if(result.strokeComplete){
      activeInk=null;
      if(result.complete){
        status.textContent=category==='name'&&nameIndex<5?'You followed it! Try the next letter when you like.':'You followed the path! Try again or move on.';
        if(!completedSpoken){completedSpoken=true;speak('You followed '+label()+'! '+(category==='name'&&nameIndex<5?'Try the next letter when you are ready.':'You can play again or move on.'));}
      }else{status.textContent='Lift your finger. Find the next pink dot.';const now=performance.now();if(now-spokenAt>2500){spokenAt=now;speak(status.textContent);}}
    }
  }
  function begin(event){
    if(disposed||pointerId!==null||event.isPrimary===false)return;
    event.preventDefault();cancelDemo();pointerId=event.pointerId;try{canvas.setPointerCapture(pointerId);}catch{}
    const p=point(event);rejected=false;
    if(mode==='guided'&&tracer)accept(tracer.pointerDown(p.x,p.y),true);
    else{activeInk={color:pen,points:[p]};ink.push(activeInk);status.textContent='';}draw();
  }
  function move(event){
    if(disposed||event.pointerId!==pointerId)return;event.preventDefault();
    const events=event.getCoalescedEvents?.()||[event];
    for(const e of events.length?events:[event]){const p=point(e);if(mode==='guided'&&tracer)accept(tracer.pointerMove(p.x,p.y));else if(activeInk)activeInk.points.push(p);}draw();
  }
  function end(event){if(event.pointerId!==pointerId)return;tracer?.pointerUp();pointerId=null;activeInk=null;draw();}
  function demo(){
    stopPointer();cancelDemo();if(!paths.length)return;
    const points=paths.flat(),start=performance.now(),duration=Math.min(6000,Math.max(2000,points.length*12));
    speak('Watch the pink dot. Then you can try.');status.textContent='Watch the pink dot.';
    function tick(now){
      if(disposed)return;const fraction=Math.min(1,(now-start)/duration);
      demoPoint=points[Math.min(points.length-1,Math.floor(fraction*(points.length-1)))];draw();
      if(fraction<1)demoFrame=requestAnimationFrame(tick);else{demoFrame=0;demoPoint=null;status.textContent='Your turn, if you like.';draw();}
    }demoFrame=requestAnimationFrame(tick);
  }
  on(q('.tracing-category'),'change',()=>{category=q('.tracing-category').value;if(category==='blank')mode='free';if(category==='name')nameIndex=0;change();});
  on(q('.tracing-symbol'),'change',()=>{if(category==='letter')letter=q('.tracing-symbol').value;else if(category==='number')number=q('.tracing-symbol').value;else shape=q('.tracing-symbol').value;change();});
  panel.querySelectorAll('[data-mode]').forEach(b=>on(b,'click',()=>{if(b.dataset.mode!==mode){mode=b.dataset.mode;change();}}));
  panel.querySelectorAll('[data-width]').forEach(b=>on(b,'click',()=>{if(b.dataset.width!==widthChoice){widthChoice=b.dataset.width;change();}}));
  panel.querySelectorAll('[data-pen]').forEach(b=>on(b,'click',()=>{pen=b.dataset.pen;panel.querySelectorAll('[data-pen]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));}));
  on(q('.tracing-name-next'),'click',()=>{nameIndex=(nameIndex+1)%NAME.length;change();});
  on(q('.tracing-clear'),'click',()=>{reset();status.textContent='A fresh space for your marks.';});
  on(q('.tracing-demo'),'click',demo);
  on(canvas,'pointerdown',begin,{passive:false});on(canvas,'pointermove',move,{passive:false});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(canvas,type,end);
  const queueResize=()=>{if(resizeFrame)cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize);};
  on(window,'resize',queueResize);
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(queueResize);observer.observe(canvas);}
  controls();resize();announce(false);nextButton('I made my marks!');
  function cleanup(){
    if(disposed)return;stopPointer();disposed=true;cancelDemo();if(resizeFrame)cancelAnimationFrame(resizeFrame);
    observer?.disconnect();controller.abort();svg.remove();
  }
  cleanup.getState=()=>({category,mode,widthChoice,nameIndex,model:label(),width:w,height:h,
    ink:ink.map(s=>({color:s.color,points:s.points.map(p=>({...p}))})),paths:paths.map(s=>s.map(p=>({...p}))),engine:tracer?.getState()||null});
  return cleanup;
}
