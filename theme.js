(function(){var k='sts-theme',r=document.documentElement,s;try{s=localStorage.getItem(k)}catch(e){}
r.dataset.theme=s||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('theme-toggle');if(!b)return;
var sync=function(){b.setAttribute('aria-checked',r.dataset.theme==='dark')};sync();
b.addEventListener('click',function(){r.classList.add('theming');r.dataset.theme=r.dataset.theme==='dark'?'light':'dark';
try{localStorage.setItem(k,r.dataset.theme)}catch(e){}sync();setTimeout(function(){r.classList.remove('theming')},450)})})
document.addEventListener('DOMContentLoaded',function(){var b=document.getElementById('share-btn');if(!b)return;
b.addEventListener('click',function(){var d={title:document.title,text:'Surplus-to-Shelter: turn unsold food into someone\'s next meal.',url:location.href};
if(navigator.share){navigator.share(d).catch(function(){});return}
var done=function(){var t=b.textContent;b.textContent='✅ Link copied';setTimeout(function(){b.textContent=t},1800)};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(d.url).then(done)}else{prompt('Copy this link',d.url)}})});
})();
