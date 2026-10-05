/* CallFocus V11.28 — multi-route navigation, preserving V11.23 Recent Calls exactly */
(()=>{
  const ROUTES={home:'/', 'voice-notes':'/voice-notes', credits:'/credits', callers:'/callers', recent:'/recent-calls', profile:'/profile', settings:'/settings'};
  const PROTECTED=new Set(['voice-notes','credits','callers','recent','profile','settings']);
  const SERVER_TOKEN_KEY='callfocus_server_session_v1';
  const oldShow=typeof showView==='function'?showView:null;
  const oldSelect=typeof selectThread==='function'?selectThread:null;
  if(!oldShow) return;
  let applying=false;

  function route(){
    const p=(location.pathname||'/').replace(/\/+$/,'')||'/';
    const found=Object.entries(ROUTES).find(([,path])=>path===p);
    return {view:found?.[0]||'home', known:!!found, thread:new URLSearchParams(location.search).get('thread')||''};
  }
  function urlFor(view){return ROUTES[view]||'/'}
  function setUrl(url,replace=false){
    const now=location.pathname+location.search;
    if(now===url)return;
    history[replace?'replaceState':'pushState']({callfocus:true},'',url);
  }
  function allowed(view){try{return typeof activeView==='undefined'||activeView===view}catch{return true}}

  showView=function(view,scroll=true){
    const v=String(view||'home');
    oldShow(v,scroll);
    if(!applying&&allowed(v)) setUrl(urlFor(v));
    ensureBack();
  };

  if(oldSelect){
    selectThread=function(id){
      oldSelect(id);
      if(!applying && (typeof activeView==='undefined'||activeView==='recent')){
        const u=id?`/recent-calls?thread=${encodeURIComponent(String(id))}`:'/recent-calls';
        setUrl(u,true);
      }
    };
  }

  function ensureBack(){
    const pages=['callers','recent','profile','settings'];
    for(const v of pages){
      const head=document.querySelector(`#page-${v} .app-page-head`);
      if(!head||head.querySelector('[data-cf-route-back]'))continue;
      const b=document.createElement('button'); b.type='button'; b.className='cf-route-back'; b.dataset.cfRouteBack=''; b.setAttribute('aria-label','Go back'); b.innerHTML='<span aria-hidden="true">‹</span>'; head.prepend(b);
    }
    document.getElementById('voiceNotesBackBtn')?.setAttribute('data-cf-route-back','');
    document.getElementById('creditBackBtn')?.setAttribute('data-cf-route-back','');
  }

  async function waitSession(v){
    if(!PROTECTED.has(v)||(typeof account!=='undefined'&&account))return;
    let token=false; try{token=!!localStorage.getItem(SERVER_TOKEN_KEY)}catch{}
    if(!token)return;
    const start=Date.now(); while(Date.now()-start<4500){if(typeof account!=='undefined'&&account)return; await new Promise(r=>setTimeout(r,80));}
  }

  async function apply(){
    const r=route();
    if(!r.known){setUrl('/',true);r.view='home';r.thread='';}
    await waitSession(r.view);
    applying=true;
    try{
      oldShow(r.view,false);
      if(r.view==='recent'&&r.thread&&typeof account!=='undefined'&&account){
        const exists=(typeof data!=='undefined'&&data?.threads||[]).some(t=>String(t.id)===String(r.thread));
        if(exists) oldSelect?.(r.thread); else setUrl('/recent-calls',true);
      }
      ensureBack();
    }finally{applying=false;}
  }

  window.addEventListener('popstate',apply);
  window.addEventListener('click',e=>{
    const back=e.target.closest?.('[data-cf-route-back]');
    if(!back)return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(history.length>1) history.back(); else {setUrl('/',true);apply();}
  },true);

  ensureBack(); apply();
  window.CallFocusRouter={routes:{...ROUTES},current:route,go:v=>showView(v)};
})();
