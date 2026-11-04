const MODUS=(()=>{try{const m=localStorage.getItem('scrollmodus');return ['vrij','scene','auto'].includes(m)?m:'vrij';}catch{return 'vrij';}})();const SCENE=MODUS==='scene',AUTO=MODUS==='auto';
/* One clock: GSAP → Lenis → ScrollTrigger → shader. No independent RAF. */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 760px)').matches;
const chapters = [...document.querySelectorAll('.chapter')];
const nav = document.querySelector('.nav');
const menu = document.querySelector('.menu');
const loader = document.querySelector('.loader');
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
  menu.textContent = open ? 'Sluiten −' : 'Menu +';
});
nav.addEventListener('click', e => { if (e.target.closest('a')) { nav.classList.remove('open'); menu.setAttribute('aria-expanded','false'); menu.textContent='Menu +'; } });
document.addEventListener('keydown', e => {if(e.key==='Escape'){nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='Menu +';}});
const last = chapters.length - 1;
const assetBase = new URL('../img/gen/', import.meta.url);
const paths = chapters.map(el => new URL(`scene-${el.dataset.image}${mobile ? '-mobile' : ''}.jpg`, assetBase).href);
const panels = [...document.querySelectorAll('.product-window')];
function fitPanels(){ panels.forEach(panel => panel.style.setProperty('--fit', panel.querySelector('.mock-frame').clientWidth / 1440)); }
fitPanels();
window.addEventListener('resize',fitPanels,{passive:true});
let loaded=0;
const unique=[...new Set(paths)];
const images=new Map();
async function preload(){
  await Promise.all(unique.map(async path=>{
    const img=new Image(); img.src=path;
    try {await img.decode();images.set(path,img);} catch { /* Static CSS remains available. */ }
    loaded++; document.querySelector('.loader output').value=`${Math.round(loaded/unique.length*100)}%`;
    if(window.gsap) gsap.to('.loader path',{strokeDashoffset:270*(1-loaded/unique.length),duration:.35,overwrite:true});
  }));
  await Promise.all([...document.querySelectorAll('img')].map(img=>img.decode().catch(()=>{})));
  await Promise.all([document.fonts.load('400 24px "Instrument Serif"'),document.fonts.load('italic 400 24px "Instrument Serif"'),document.fonts.load('300 16px Geist')]);
}
async function createWebGL(){
  const T=await import('three');
  const renderer=new T.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=T.LinearSRGBColorSpace;
  const textureCache=new Map();
  const textures=paths.map(path=>{if(textureCache.has(path))return textureCache.get(path);const texture=new T.Texture(images.get(path));texture.needsUpdate=true;texture.minFilter=T.LinearMipmapLinearFilter;texture.magFilter=T.LinearFilter;texture.generateMipmaps=true;textureCache.set(path,texture);return texture;});
  const uniforms={a:{value:textures[0]},b:{value:textures[1]},blend:{value:0},aspect:{value:innerWidth/innerHeight},imageAspectA:{value:images.get(paths[0]).width/images.get(paths[0]).height},imageAspectB:{value:images.get(paths[1]).width/images.get(paths[1]).height},drift:{value:0},time:{value:0},mouse:{value:new T.Vector2()}};
  const material=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:`precision highp float;
    uniform sampler2D a,b;uniform float blend,aspect,imageAspectA,imageAspectB,drift,time;uniform vec2 mouse;varying vec2 vUv;
    vec2 cover(vec2 uv,float imageAspect){vec2 s=vec2(min(aspect/imageAspect,1.),min(imageAspect/aspect,1.));return (uv-.5)*s+.5;}
    float hex(vec2 p){p=abs(p);return max(p.x*.8660254+p.y*.5,p.y);}
    void main(){
      vec2 p=(vUv-vec2(.68,.53))*vec2(aspect,1.);
      float t=blend*blend*(3.-2.*blend);
      float radius=mix(-.035,2.3,t);
      float d=hex(p)-radius;
      float portal=1.-smoothstep(-.018,.018,d);
      float edge=exp(-abs(d)*160.)*sin(3.14159265*t);
      vec2 refractOffset=normalize(p+vec2(.0001))*.008*edge;
      vec2 sway=vec2(sin(time*.11),cos(time*.083))*.006+mouse*.012;
      float breathe=sin(time*.13)*.012;
      vec2 ua=(vUv-.5)/(1.03+drift*.09+t*.07+breathe)+.5+sway+vec2(drift*.018,-drift*.008);
      vec2 ub=(vUv-.5)/(1.12-t*.09+breathe)+.5+sway*.6;
      vec3 ca=texture2D(a,cover(ua+refractOffset,imageAspectA)).rgb;
      vec3 cb=texture2D(b,cover(ub-refractOffset,imageAspectB)).rgb;
      vec3 col=mix(ca,cb,portal)+edge*.14;
      float wash=(1.-smoothstep(.10,.73,vUv.x))*.88;
      col=mix(col,vec3(.956,.970,.964),wash);
      gl_FragColor=vec4(col,1.);
    }`});
  const scene=new T.Scene();scene.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
  // Low-poly glass rims share the same scene and render call as the image shader.
  scene.children[0].renderOrder=-100;
  const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,50);camera.position.z=8;
  scene.add(new T.HemisphereLight(0xffffff,0xb4c8c0,2.2));
  const sun=new T.DirectionalLight(0xffffff,2.8);sun.position.set(-3,5,6);scene.add(sun);
  const shape=new T.Shape();const hole=new T.Path();
  for(let k=0;k<=6;k++){const angle=k*Math.PI/3;const x=Math.cos(angle),y=Math.sin(angle);if(k===0){shape.moveTo(x,y);hole.moveTo(x*.965,-y*.965);}else{shape.lineTo(x,y);hole.lineTo(x*.965,-y*.965);}}
  shape.holes.push(hole);
  const rimGeometry=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:1,steps:1});
  const rims=Array.from({length:3},()=>{const mat=new T.MeshStandardMaterial({color:0xd7e5df,metalness:.25,roughness:.22,transparent:true,opacity:.35,depthWrite:false});const mesh=new T.Mesh(rimGeometry,mat);scene.add(mesh);return mesh;});
  const sage=new T.Color(0x9fb3aa),neutral=new T.Color(0xe7f1f7);
  document.querySelector('#visual').append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.domElement.remove();fallback();});
  let pair=-1;
  const aim=new T.Vector2();addEventListener('pointermove',e=>{aim.set(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5);},{passive:true});
  return {render(i,f,local,time){uniforms.time.value=time;uniforms.mouse.value.lerp(aim,.04);if(pair!==i){pair=i;uniforms.a.value=textures[i];uniforms.b.value=textures[Math.min(i+1,textures.length-1)];uniforms.imageAspectA.value=images.get(paths[i]).width/images.get(paths[i]).height;uniforms.imageAspectB.value=images.get(paths[Math.min(i+1,paths.length-1)]) .width/images.get(paths[Math.min(i+1,paths.length-1)]).height;}uniforms.blend.value=f;uniforms.drift.value=local;
    const p=(i+local)/last*6;const join=T.MathUtils.smoothstep(p,3.4,4.7);const together=T.MathUtils.smoothstep(p,4.7,5.3);
    const farewell=1-T.MathUtils.smoothstep(p,5.5,6);
    rims.forEach((rim,k)=>{const x=k===0?2.1+join*.3:k===1?4.2-join*.45:3.07;
      rim.position.set(x+(k===2?0:Math.sin(p*.8+k)*.06)+Math.sin(time*.21+k*2)*.05,(k===2?.95:-.12+Math.sin(p*.65+k)*.1)+Math.sin(time*.27+k)*.07,k===2?-.6:0);
      rim.rotation.set(.12*Math.sin(p*.5+k)+.05*Math.sin(time*.19+k),.16*Math.cos(p*.6+k)+.08*Math.sin(time*.15+k),(k===2?Math.PI/6:.025*Math.sin(p+k))+time*.012*(k===1?-1:1));
      rim.scale.setScalar(k===2?.55:.85+together*.1);
      rim.material.opacity=(k===2?together*.4:.38)*farewell;
      rim.material.color.copy(neutral).lerp(sage,T.MathUtils.smoothstep(p,2.5,3.4));
    });renderer.render(scene,camera);},resize(){renderer.setSize(innerWidth,innerHeight);uniforms.aspect.value=innerWidth/innerHeight;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}};
}
let fallbackNodes;
function hexPts(r){const pts=[];for(let k=0;k<6;k++){const a=Math.PI/180*(60*k-90);pts.push(`${(50+r*Math.cos(a)*.62).toFixed(1)}% ${(50+r*Math.sin(a)*.5).toFixed(1)}%`);}return pts.join(',');}
function fallback(){
  if(fallbackNodes)return;
  document.documentElement.classList.add('mobile-view');
  fallbackNodes=paths.map(path=>{const img=images.get(path).cloneNode();img.className='fallback-image';img.alt='';document.querySelector('#visual').append(img);return img;});
}
async function start(){
  await preload();
  if(reduce || !window.gsap || !window.ScrollTrigger || !window.Lenis || images.size!==unique.length){loader.remove();return;}
  let visual;
  if(!mobile){try{visual=await createWebGL();}catch{fallback();}}else fallback();
  gsap.registerPlugin(ScrollTrigger);
  const film=document.querySelector('#film');
  let stableH=innerHeight,lastW=innerWidth;
  function sizeFilm(){if(!mobile||innerWidth!==lastW){stableH=innerHeight;lastW=innerWidth;}else stableH=Math.max(stableH,innerHeight);film.style.height=`${Math.round(chapters.length*(SCENE?1:(mobile?1.35:1.6))*stableH)}px`;}
  sizeFilm();
  document.documentElement.classList.add('enhanced');
  chapters.forEach(ch=>{const h=ch.querySelector('h1,h2');h.innerHTML=h.innerHTML.split('<br>').map(line=>`<span class="heading-line"><span class="line">${line}</span></span>`).join('');});
  const lenis=new Lenis(SCENE?{lerp:.1,smoothWheel:true,autoRaf:false,autoResize:false}:{lerp:.1,wheelMultiplier:.9,smoothWheel:true,autoRaf:false,autoResize:false});
  lenis.on('scroll',ScrollTrigger.update);
  const LAST=last,ZONE=.35;
  // Twee scrollmodi (Lex 03-11, 'beide'): standaard één gebaar = één scène met vaste overgang; 'vrij' = vrij scrollen met
  // magnetische rustpunten die de scrolrichting volgen. Keuze via de schakelaar onderin, onthouden per bezoeker.
  const filmEl=document.querySelector('#film');const travelOf=()=>filmEl.offsetHeight-innerHeight;let idx=0,glijdt=false;
  let armed=true;
  if(SCENE){
    let busy=false,lastInput=0,lastMag=0;
    const DUR=mobile?1.0:1.2,ease=t=>1-Math.pow(1-t,3);
    var go=d=>{if(busy||!armed)return;const n=Math.max(0,Math.min(LAST,idx+d));if(n===idx)return;idx=n;busy=true;armed=false;
      lenis.scrollTo(n/LAST*travelOf(),{duration:DUR,easing:ease,force:true,lock:true,onComplete:()=>{busy=false;}});};
    addEventListener('wheel',e=>{const m=Math.abs(e.deltaY),now=performance.now();if(!busy&&(now-lastInput>180||(m>lastMag*1.8&&m>24)))armed=true;lastMag=m;lastInput=now;},{passive:true,capture:true});
    addEventListener('touchstart',()=>{if(!busy)armed=true;},{passive:true,capture:true});
    addEventListener('keydown',e=>{if(e.target.closest&&e.target.closest('input,textarea,select'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();armed=true;go(1);}else if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();armed=true;go(-1);}});
    lenis.stop();
    ScrollTrigger.observe({target:window,type:'wheel,touch',wheelSpeed:-1,tolerance:8,preventDefault:true,ignore:'[data-lenis-prevent]',onUp:()=>go(1),onDown:()=>go(-1)});
  }else{
    let wheelTimer=0,touchTimer=0,touchMode=false;
    const snapTarget=y=>{const travel=travelOf();const p=Math.max(0,Math.min(LAST,y/travel*LAST));const i=Math.floor(p),local=p-i;if(i>=LAST||local<ZONE)return null;return (lenis.direction<0?i:i+1)/LAST*travel;};
    // Muis en trackpad (Lex 04-11, 'scrollt er twee per scroll, te gevoelig'): één gebaar = precies één scène. Eerst moet er genoeg
    // uitslag zijn; daarna blijft alles dicht tot de overgang klaar is én de uitloop van het trackpad voorbij is (pauze of duidelijk nieuw gebaar).
    // Een hapering in de uitloop is geen nieuw gebaar: alleen een lange stilte, een andere richting of drie keer op rij stijgende uitslag telt.
    let som=0,wielT=0,wielM=0,wielR=0,stijg=0,dichtTot=0,wachtOpEinde=false;
    addEventListener('wheel',e=>{touchMode=false;if(e.ctrlKey||e.target.closest?.('.weergave-modal'))return;e.preventDefault();e.stopImmediatePropagation();
      const m=Math.abs(e.deltaY),now=performance.now(),gat=now-wielT,r=Math.sign(e.deltaY);stijg=m>wielM?stijg+1:0;
      const nieuw=gat>600||(r&&wielR&&r!==wielR)||(stijg>=3&&m>30);wielT=now;wielM=m;if(r)wielR=r;
      if(now<dichtTot)return;if(wachtOpEinde){if(nieuw)wachtOpEinde=false;else return;}
      if(gat>600)som=0;som+=e.deltaY;if(Math.abs(som)<70)return;
      const stap=Math.sign(som);som=0;wachtOpEinde=true;dichtTot=now+1000;naarScene(basis()+stap);},{passive:false,capture:true});
    // Telefoon (Lex 04-11): één veeg = één scène, net als op de computer. Alleen tekst die zelf scrollt, het menu en schuifjes houden hun eigen veeg.
    let ty=0,tx=0,eigen=null,touchDicht=0;
    const eigenZone=t=>{const c=t.closest?.('.copy,.nav,input,.weergave-modal,.auto-toast');if(!c)return null;return c.classList?.contains('copy')&&c.scrollHeight<=c.clientHeight+3?null:c;};
    addEventListener('touchstart',e=>{touchMode=true;ty=e.touches[0].clientY;tx=e.touches[0].clientX;eigen=eigenZone(e.target);},{passive:true});
    addEventListener('touchmove',e=>{if(!eigen&&e.cancelable)e.preventDefault();},{passive:false});
    addEventListener('touchend',e=>{const t=e.changedTouches[0],dy=ty-t.clientY,dx=tx-t.clientX,now=performance.now();if(Math.abs(dy)<45||Math.abs(dy)<Math.abs(dx)*1.2||now<touchDicht)return;
      if(eigen){if(!eigen.classList?.contains('copy'))return;const eind=eigen.scrollTop+eigen.clientHeight>=eigen.scrollHeight-2,begin=eigen.scrollTop<=1;if(!(dy>0?eind:begin))return;}
      touchDicht=now+750;naarScene(basis()+Math.sign(dy));},{passive:true});
  }
  // Automatisch afspelen: de film loopt als een video; zelf scrollen pauzeert met een melding
  const toast=document.createElement('div');toast.className='auto-toast';toast.hidden=true;toast.setAttribute('role','status');
  toast.innerHTML='<span></span><button type="button" class="verder">▶ Verder afspelen</button><button type="button" class="kies">Weergave kiezen</button>';
  document.body.append(toast);
  const melding=(tekst,knop)=>{toast.querySelector('span').textContent=tekst;toast.querySelector('.verder').hidden=!knop;toast.hidden=false;toast.classList.remove('weg');};
  if(AUTO){
    let spelen=true,timer=0;const zacht=t=>-(Math.cos(Math.PI*t)-1)/2;
    const volgende=()=>{if(!spelen)return;const travel=travelOf();const nu=Math.round(scrollY/travel*LAST*100)/100;const n=Math.floor(nu+.05)+1;
      if(n>LAST){spelen=false;melding('Einde van de film. Scroll terug of kies een andere weergave.',false);return;}
      lenis.scrollTo(n/LAST*travel,{duration:mobile?2.2:2.8,easing:zacht,force:true,onComplete:()=>{if(spelen)timer=setTimeout(volgende,4200);}});};
    const pauze=()=>{if(!spelen)return;spelen=false;clearTimeout(timer);lenis.scrollTo(scrollY,{immediate:true,force:true});
      melding('Automatisch afspelen staat op pauze: je scrolt nu zelf.',true);};
    addEventListener('wheel',pauze,{passive:true});addEventListener('touchstart',e=>{if(!e.target.closest('.auto-toast,.weergave-modal'))pauze();},{passive:true});
    addEventListener('keydown',e=>{if(/^(Arrow|Page)/.test(e.key)||e.key===' ')pauze();});
    toast.querySelector('.verder').addEventListener('click',()=>{toast.classList.add('weg');spelen=true;volgende();});
    melding('Deze pagina speelt automatisch af, als een video. Scroll om te pauzeren.',false);
    setTimeout(()=>{if(spelen)toast.classList.add('weg');},5000);
    timer=setTimeout(volgende,3200);
  }
  // Keuzevenster: vrij (standaard), per scène of automatisch; onthouden per bezoeker
  const OPTIES=[['vrij','Vrij scrollen','Je scrolt zelf; de film glijdt mee naar de volgende scène. Standaard.'],['scene','Per scène','Eén scrollbeweging brengt je precies één scène verder.'],['auto','Automatisch','De pagina speelt af als een video. Zelf scrollen pauzeert hem.']];
  const modal=document.createElement('div');modal.className='weergave-modal';modal.hidden=true;modal.setAttribute('data-lenis-prevent','');
  modal.innerHTML='<div class="wm-paneel" role="dialog" aria-modal="true" aria-labelledby="wm-titel"><button type="button" class="wm-sluit" aria-label="Sluiten">×</button><p class="wm-ey">WEERGAVE</p><h3 id="wm-titel">Hoe wil je door de pagina?</h3><div class="wm-opties">'+
    OPTIES.map(([k,t,u])=>`<button type="button" data-modus="${k}" ${k===MODUS?'aria-current="true"':''}><b>${t}</b><span>${u}</span></button>`).join('')+'</div></div>';
  document.body.append(modal);
  const open=()=>{modal.hidden=false;requestAnimationFrame(()=>modal.classList.add('open'));modal.querySelector('[aria-current]')?.focus();};
  const dicht=()=>{modal.classList.remove('open');setTimeout(()=>{modal.hidden=true;},250);};
  modal.addEventListener('click',e=>{const b=e.target.closest('[data-modus]');if(b){try{localStorage.setItem('scrollmodus',b.dataset.modus);}catch{}location.reload();return;}if(e.target===modal||e.target.closest('.wm-sluit'))dicht();});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)dicht();});
  toast.querySelector('.kies').addEventListener('click',open);
  const schakel=document.querySelector('.scroll-modus');
  if(schakel){schakel.hidden=false;schakel.innerHTML='Weergave: <b>'+{vrij:'vrij',scene:'per scène',auto:'automatisch'}[MODUS]+'</b> <i>⇄</i>';schakel.addEventListener('click',open);}

  // Scènebalk rechts + pijltjestoetsen (Lex 03-11): elke scène in één klik, in elke weergave
  const naarScene=n=>{n=Math.max(0,Math.min(LAST,n));if(n===idx&&Math.abs(scrollY-n/LAST*travelOf())<4)return;idx=n;const travel=travelOf(),doel=n/LAST*travel;
    if(Math.abs(scrollY-doel)>travel/LAST*1.2){const kant=scrollY>doel?1:-1;lenis.scrollTo(Math.max(0,doel+kant*travel/LAST*.35),{immediate:true,force:true});}
    glijdt=true;lenis.scrollTo(doel,{duration:.9,easing:t=>1-Math.pow(1-t,3),force:true,onComplete:()=>{glijdt=false;}});};
  const basis=()=>glijdt?idx:Math.max(0,current);
  addEventListener('wheel',()=>{glijdt=false;},{passive:true});
  const naam=ch=>{const h=ch.querySelector('h1,h2');if(!h)return ch.id;const regels=[...h.querySelectorAll('.line')].map(x=>x.textContent.trim());return (regels.length?regels.join(' '):h.textContent).replace(/\s+/g,' ').trim().replace(/\.$/,'');};
  const rail=document.createElement('nav');rail.className='scene-rail';rail.setAttribute('aria-label','Scènes');
  rail.innerHTML='<button type="button" class="sr-pijl" data-stap="-1" aria-label="Vorige scène">↑</button><ol>'+chapters.map((ch,i)=>`<li><a href="#${ch.id}" data-n="${i}"><span>${naam(ch)}</span><i>${String(i).padStart(2,'0')}</i></a></li>`).join('')+'</ol><button type="button" class="sr-pijl" data-stap="1" aria-label="Volgende scène">↓</button>';
  document.body.append(rail);
  rail.addEventListener('click',e=>{const a=e.target.closest('a[data-n]'),b=e.target.closest('[data-stap]');if(!a&&!b)return;e.preventDefault();
    if(AUTO)window.dispatchEvent(new WheelEvent('wheel'));
    naarScene(a?+a.dataset.n:basis()+(+b.dataset.stap));});
  if(!SCENE)addEventListener('keydown',e=>{if(!modal.hidden||e.metaKey||e.ctrlKey||e.altKey||(e.target.closest&&e.target.closest('input,textarea,select,[contenteditable]')))return;
    const v=['ArrowDown','ArrowRight','PageDown'].includes(e.key)?1:['ArrowUp','ArrowLeft','PageUp'].includes(e.key)?-1:0;if(!v)return;e.preventDefault();naarScene(basis()+v);});
  else addEventListener('keydown',e=>{if(!modal.hidden)return;if(e.key==='ArrowRight'){armed=true;go(1);}else if(e.key==='ArrowLeft'){armed=true;go(-1);}});
  let railCur=-2;const railLinks=[...rail.querySelectorAll('a')];
  gsap.ticker.add(()=>{if(railCur===current)return;railCur=current;railLinks.forEach((a,i)=>{if(i===current)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});});
  const state={p:0};
  gsap.to(state,{p:last,ease:'none',scrollTrigger:{trigger:'#film',start:'top top',end:'bottom bottom',scrub:true}});
  let current=-1;let hidden=document.hidden;let previous=-1;
  const progressBar=document.querySelector('.nav-progress'),counter=document.querySelector('.chapter-count'),cue=document.querySelector('.scroll-cue');
  const navLinks=[...nav.querySelectorAll('nav a')];const indicator=nav.querySelector('.indicator');
  let measurements=[];
  function measure(){sizeFilm();lenis.resize();previous=-1;measurements=navLinks.map(a=>({x:a.offsetLeft,w:a.offsetWidth}));visual?.resize();}
  function activate(i){
    if(current===i)return;current=i;
    const stamp=chapters[i].querySelector('.deed-stamp');if(stamp)stamp.classList.add('is-stamped');
    chapters.forEach((ch,j)=>{const active=i===j;ch.classList.toggle('active',active);ch.inert=!active;ch.setAttribute('aria-hidden',String(!active));if(active){const panel=ch.querySelector('.product-window');if(panel)gsap.fromTo(panel,{scale:reduce?1:.96},{scale:1,duration:.45,ease:'power2.out',overwrite:true});gsap.set(ch,{visibility:'visible'});gsap.fromTo(ch.querySelectorAll('.line'),{yPercent:105},{yPercent:0,duration:.45,stagger:.09,ease:'expo.out',overwrite:true});}});
    const n=navLinks.findIndex(a=>a.getAttribute('href')===`#${chapters[i].id}`);navLinks.forEach((a,j)=>{if(j===n)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
    if(n>=0&&mobile){const a=navLinks[n],sn=a.parentElement;sn.scrollTo({left:a.offsetLeft-sn.clientWidth/2+a.offsetWidth/2,behavior:'smooth'});}
    if(n>=0&&n<measurements.length){gsap.to(indicator,{x:measurements[n].x,scaleX:measurements[n].w/100,opacity:1,duration:.8,ease:'power4.out',overwrite:true});}else gsap.to(indicator,{opacity:0,duration:.4});
    counter.textContent=`${String(i).padStart(2,'0')} / ${String(last).padStart(2,'0')}`;
    gsap.to(cue,{opacity:i===0?1:0,duration:.5});
  }
  function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
  function tick(time){
    if(hidden)return;
    lenis.raf(time*1000);
    const p=state.p;const moved=Math.abs(p-previous)>.000001;previous=p;const i=Math.min(last-1,Math.floor(p));const local=p-i;
    const f=SCENE?smooth(.12,.95,local):smooth(.35,1,local);const active=Math.min(last,Math.floor(p+(SCENE?.4:.25)));
    activate(active);
    if(moved)for(let j=0;j<chapters.length;j++){
      // Beelden vloeien over; tekst wisselt kort na elkaar (nooit twee teksten tegelijk, geen leeg gat)
      const distance=p-j;const opacity=SCENE?(1-smooth(.15,.5,distance))*smooth(-.65,-.3,distance):(1-smooth(.35,.62,distance))*smooth(-.68,-.4,distance);
      const tekst=(1-smooth(.36,.5,distance))*smooth(-.64,-.5,distance);
      chapters[j].style.opacity=opacity>.001||tekst>.001?1:0;
      const delen=chapters[j].__delen||(chapters[j].__delen=[...chapters[j].children].filter(el=>!el.classList.contains('still')));
      delen.forEach(el=>{el.style.opacity=el.classList.contains('copy')?tekst:opacity;});if(j===active){const c=chapters[j].querySelector('.copy');if(c)c.style.transform=`translateY(${(-Math.max(-.1,Math.min(1,distance))*(mobile?28:18)).toFixed(1)}px)`;}
      if(opacity<.001 && tekst<.001 && j!==active)chapters[j].style.visibility='hidden';else chapters[j].style.visibility='visible';
    }
    if(fallbackNodes)fallbackNodes.forEach((el,j)=>{if(j===i){el.style.opacity=1;el.style.clipPath='none';el.style.transform=`scale(${1.05+local*.16+Math.sin(time*.13)*.015}) translate(${(Math.sin(time*.11)*.8).toFixed(2)}%,${(-local*2+Math.cos(time*.09)*.6).toFixed(2)}%)`;el.style.zIndex=1;}else if(j===i+1&&f>0){const r=(f*f*160).toFixed(1);el.style.opacity=1;el.style.zIndex=2;el.style.transform=`scale(${1.18-f*.16})`;el.style.clipPath=f>=.999?'none':`polygon(${hexPts(r)})`;}else{el.style.opacity=0;el.style.zIndex=0;}});
    else visual.render(i,f,local,time);
    if(!moved)return;
    progressBar.style.transform=`scaleX(${p/last})`;
    nav.style.transform=`scale(${1-Math.min(p,.5)*.035})`;
  }
  gsap.ticker.lagSmoothing(0);gsap.ticker.add(tick);
  document.addEventListener('visibilitychange',()=>{hidden=document.hidden;});
  let rw=innerWidth;window.addEventListener('resize',()=>{if(mobile&&innerWidth===rw)return;rw=innerWidth;measure();ScrollTrigger.refresh();},{passive:true});
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const target=document.querySelector(a.getAttribute('href'));const index=chapters.indexOf(target);if(index<0)return;e.preventDefault();
    naarScene(index);history.replaceState(null,'',a.getAttribute('href'));
  }));
  measure();ScrollTrigger.refresh();lenis.resize();
  if(location.hash){const index=chapters.findIndex(ch=>`#${ch.id}`===location.hash);if(index>=0){idx=index;lenis.scrollTo(index/last*(document.querySelector('#film').offsetHeight-innerHeight),{immediate:true,force:true});}}
  gsap.to(loader,{opacity:0,duration:.7,ease:'power2.out',onComplete:()=>loader.remove()});
}
start().catch(()=>{
  document.documentElement.classList.remove('enhanced');
  chapters.forEach(ch=>{ch.inert=false;ch.style.opacity='';ch.style.visibility='';ch.querySelectorAll('.line').forEach(line=>{line.style.transform='';});});
  loader.remove();
});
