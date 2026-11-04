// Speelhuis op de A&L Living-pagina: verzonnen waarden, geen koppeling met het echte huis.
(()=>{const $=s=>document.querySelector(s),kamers=[...document.querySelectorAll('.dk')];if(!kamers.length)return;
const scenes={uit:[],avond:['woonkamer','eetkamer'],film:['woonkamer'],alles:kamers.map(k=>k.dataset.k)};
const muziek=$('#dm-muziek'),laad=$('#dm-laad'),zon=$('#dm-zoninput');let accu=64;
const kw=n=>n.toFixed(1).replace('.',',')+' kW';
function teken(){const aan=kamers.filter(k=>k.getAttribute('aria-pressed')==='true');
  const laadt=laad.getAttribute('aria-pressed')==='true',z=+zon.value;
  const huis=.3+aan.reduce((s,k)=>s+ +k.dataset.w,0)+(muziek.getAttribute('aria-pressed')==='true'?.1:0);
  const over=Math.max(0,z-huis),auto=laadt?over:0,net=huis+auto-z;
  const score=Math.max(0,Math.min(100,Math.round(100+Math.min(0,-net)*40)));
  $('#dm-zonw').textContent=kw(z);$('#dm-score').textContent='Zuinigheid '+score;$('#dm-score').style.background=score>=80?'#5f7d70':score>=50?'#a8781f':'#a8503a';
  $('#dm-status').textContent=aan.length?aan.length+(aan.length===1?' kamer':' kamers')+' aan':'Tik op een kamer om het licht aan te doen';
  $('#dm-balk').style.width=Math.min(100,huis/Math.max(z,.1)*50)+'%';$('#dm-balk').style.background=net>0?'#a8503a':'#5f7d70';
  $('#dm-melding').textContent=laadt&&auto>0?'De auto laadt nu op zonnestroom: '+kw(auto)+'.':laadt?'Geen zon over, de auto wacht netjes.':net>0?'Je koopt '+kw(net)+' stroom in. Schuif de zon omhoog of doe wat uit.':'Je levert '+kw(-net)+' terug. Tijd om de auto op zon te zetten?';}
kamers.forEach(k=>k.addEventListener('click',()=>{k.setAttribute('aria-pressed',k.getAttribute('aria-pressed')==='true'?'false':'true');teken();}));
document.querySelectorAll('.dm-scenes button').forEach(b=>b.addEventListener('click',()=>{const lijst=scenes[b.dataset.s];kamers.forEach(k=>k.setAttribute('aria-pressed',lijst.includes(k.dataset.k)?'true':'false'));teken();}));
[muziek,laad].forEach(b=>b.addEventListener('click',()=>{b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');teken();}));
zon.addEventListener('input',teken);
setInterval(()=>{if(laad.getAttribute('aria-pressed')!=='true'||accu>=100||+zon.value<1)return;accu++;$('#dm-accu').textContent=accu+'%';},900);
teken();})();
