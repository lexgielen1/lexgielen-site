// Zijprojecten: de video van een scène speelt alleen zolang die scène in beeld is.
(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
document.querySelectorAll('.sp-scene').forEach(s=>{const v=s.querySelector('video');if(!v)return;
  const bij=()=>{if(s.classList.contains('active'))v.play().catch(()=>{});else v.pause();};
  new MutationObserver(bij).observe(s,{attributes:true,attributeFilter:['class']});bij();});})();
